import OpenAI from 'openai';

export const PRIMARY_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

export function extractJSON<T = unknown>(text: string): T {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error('No valid JSON object found in response');
  }
  const jsonSubstring = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonSubstring) as T;
}

export interface LLMCallResult<T> {
  data: T;
  rawText: string;
  latencyMs: number;
  model: string;
  promptLength: number;
}

export async function askLLM<T = unknown>(
  prompt: string,
  options?: {
    model?: string;
    systemMessage?: string;
    retries?: number;
    openaiClient?: OpenAI;
  }
): Promise<LLMCallResult<T>> {
  const envModel = process.env.OPENROUTER_MODEL?.trim();
  const defaultModel = envModel
    ? (envModel.includes('/') ? envModel : `nvidia/${envModel}`)
    : PRIMARY_MODEL;
  const model = options?.model || defaultModel;
  const systemMessage = options?.systemMessage || 'Respond with valid JSON only.';
  const maxRetries = options?.retries !== undefined ? options.retries : 1;

  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim().replace(/^key-/, '');

  const client =
    options?.openaiClient ||
    new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    try {
      const response = await client.chat.completions.create(
        {
          model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt },
          ],
        },
        { timeout: 30000 }
      );

      const latencyMs = Date.now() - startTime;
      const rawText = response.choices?.[0]?.message?.content || '';

      const data = extractJSON<T>(rawText);

      // Structured logging (no raw content or answers logged)
      console.log(
        JSON.stringify({
          event: 'llm_call_success',
          model,
          attempt: attempt + 1,
          promptChars: prompt.length,
          promptTokensEst: Math.ceil(prompt.length / 4),
          latencyMs,
        })
      );

      return {
        data,
        rawText,
        latencyMs,
        model,
        promptLength: prompt.length,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      lastError = err;

      console.warn(
        JSON.stringify({
          event: 'llm_call_retry_or_fail',
          model,
          attempt: attempt + 1,
          maxRetries,
          latencyMs,
          error: err instanceof Error ? err.message : String(err),
        })
      );

      if (attempt < maxRetries) {
        // Wait 1 second before retrying
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  }

  throw lastError;
}

