'use client';

import React, { useState, useRef, useEffect } from 'react';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'pill' | 'inside-input';
  modelName?: string;
}

export function VoiceInputButton({
  onTranscript,
  disabled = false,
  className = '',
  variant = 'pill',
  modelName = 'openai/whisper-small',
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorStatus(null);
    liveTranscriptRef.current = '';
    audioChunksRef.current = [];
    setRecordSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleTranscription(audioBlob);
      };

      recorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);

      // Browser Web Speech Recognition as parallel instant fallback
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let transcriptText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                transcriptText += event.results[i][0].transcript + ' ';
              }
            }
            if (transcriptText.trim()) {
              liveTranscriptRef.current += transcriptText;
            }
          };

          recognition.onerror = () => {};
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {}
      }
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorStatus('Mic permission denied');
      } else {
        setErrorStatus('Mic unavailable');
      }
      setTimeout(() => setErrorStatus(null), 4000);
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
    }
  };

  const handleTranscription = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'speech.webm');
      formData.append('model', modelName);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.text && data.text.trim()) {
        onTranscript(data.text.trim());
      } else if (liveTranscriptRef.current && liveTranscriptRef.current.trim()) {
        onTranscript(liveTranscriptRef.current.trim());
      } else if (data.error) {
        setErrorStatus(data.error.slice(0, 30));
        setTimeout(() => setErrorStatus(null), 4000);
      }
    } catch (err) {
      console.warn('Whisper transcription error, falling back to live speech transcript:', err);
      if (liveTranscriptRef.current && liveTranscriptRef.current.trim()) {
        onTranscript(liveTranscriptRef.current.trim());
      } else {
        setErrorStatus('Transcription error');
        setTimeout(() => setErrorStatus(null), 4000);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Dedicated inside-input styling (compact icon button in corner of textarea)
  if (variant === 'inside-input') {
    if (errorStatus) {
      return (
        <span className="text-[9px] font-mono text-[#DC8381] border border-[#DC8381] px-2 py-0.5 bg-[#220d0d] uppercase">
          {errorStatus}
        </span>
      );
    }

    if (isTranscribing) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a150e] border border-[#E6A360] text-[#E6A360] font-mono text-[10px] uppercase">
          <svg className="animate-spin h-3 w-3 text-[#E6A360]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Whisper Transcribing...</span>
        </div>
      );
    }

    if (isRecording) {
      return (
        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#220d0d] border border-[#DC8381] text-[#DC8381] font-mono text-[10px] uppercase font-bold hover:bg-[#331111] transition-all animate-pulse cursor-pointer shadow-lg"
          title="Click to stop recording and transcribe answer"
        >
          <span className="w-2 h-2 rounded-full bg-[#DC8381] animate-ping" />
          <span>Stop Recording [{formatTimer(recordSeconds)}]</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#000000] hover:bg-[#171717] border border-[#333333] hover:border-[#EDEDED] text-[#EDEDED] font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed group"
        title="Speech-to-text with openai/whisper-small"
      >
        <span className="text-xs group-hover:scale-110 transition-transform">🎙️</span>
        <span>Voice Input</span>
      </button>
    );
  }

  // Standard Pill button
  return (
    <div className={`inline-flex items-center gap-1.5 font-mono text-[10px] ${className}`}>
      {errorStatus ? (
        <span className="text-[#DC8381] border border-[#DC8381] px-2 py-0.5 bg-[#220d0d] uppercase">
          {errorStatus}
        </span>
      ) : isTranscribing ? (
        <span className="px-2.5 py-1 bg-[#1a150e] border border-[#E6A360] text-[#E6A360] uppercase flex items-center gap-1.5">
          <svg className="animate-spin h-3 w-3 text-[#E6A360]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Whisper Transcribing...</span>
        </span>
      ) : isRecording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="px-2.5 py-1 bg-[#220d0d] border border-[#DC8381] text-[#DC8381] hover:bg-[#331111] uppercase font-bold flex items-center gap-1.5 cursor-pointer transition-all animate-pulse"
          title="Click to stop recording and transcribe"
        >
          <span className="w-2 h-2 rounded-full bg-[#DC8381] animate-ping" />
          <span>Stop [{formatTimer(recordSeconds)}]</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="px-2.5 py-1 bg-[#000000] border border-[#333333] hover:border-[#EDEDED] text-[#A1A1A1] hover:text-[#EDEDED] uppercase font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Speak answer using Hugging Face Whisper-Small"
        >
          <span className="text-xs">🎙️</span>
          <span>Voice Input</span>
        </button>
      )}
    </div>
  );
}
