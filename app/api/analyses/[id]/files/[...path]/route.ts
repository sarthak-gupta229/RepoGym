import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { numberLines } from '@/lib/prompt';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, path } = await params;
  const analysis = await store.getAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  const filePath = path.join('/');
  const content = analysis.file_map[filePath];
  if (content === undefined) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  return NextResponse.json({
    path: filePath,
    content,
    numbered: numberLines(content),
    linesCount: content.split('\n').length,
  });
}

