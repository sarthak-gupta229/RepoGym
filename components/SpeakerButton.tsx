'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SpeakerButtonProps {
  text: string;
  className?: string;
  modelName?: string;
  voice?: string; // Standard preset e.g. af_heart (female)
}

export function SpeakerButton({
  text,
  className = '',
  modelName = 'hexgrad/Kokoro-82M',
  voice = 'af_heart',
}: SpeakerButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setIsPlaying(false);
    setIsLoading(false);
  };

  useEffect(() => {
    // Pre-populate browser speech synthesis voices so natural female voices are ready
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        stopPlayback();
      };
    }

    return () => {
      stopPlayback();
    };
  }, []);

  const fallbackBrowserTTS = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      const voices = window.speechSynthesis.getVoices();

      // Look for natural, warm American female voices matching Kokoro af_heart
      const naturalFemaleVoice =
        voices.find((v) => v.name === 'Samantha' || v.name.includes('Samantha')) ||
        voices.find((v) => v.name.includes('Google US English') && !v.name.includes('Male')) ||
        voices.find((v) => v.name === 'Victoria' || v.name.includes('Victoria')) ||
        voices.find((v) => v.name === 'Ava' || v.name.includes('Ava')) ||
        voices.find((v) => v.name === 'Karen' || v.name.includes('Karen')) ||
        voices.find((v) => v.name === 'Zira' || v.name.includes('Zira')) ||
        voices.find((v) => v.name.toLowerCase().includes('female') && v.lang.startsWith('en')) ||
        voices.find((v) => v.lang === 'en-US' && !v.name.includes('Alex') && !v.name.includes('Fred')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (naturalFemaleVoice) {
        utterance.voice = naturalFemaleVoice;
      }

      // Calm, clear, natural female pacing (0.92 rate prevents rushing, 1.05 pitch adds warmth)
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };

      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
      setIsLoading(false);
    } else {
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const handleTogglePlay = async () => {
    if (isPlaying || isLoading) {
      stopPlayback();
      return;
    }

    if (!text || !text.trim()) return;

    setIsLoading(true);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          model: modelName,
          voice: voice || 'af_heart',
        }),
      });

      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('audio')) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          setIsLoading(false);
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
          }
        };

        audio.onerror = () => {
          console.warn('Audio playback error, falling back to natural female browser voice');
          fallbackBrowserTTS();
        };

        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
      } else {
        // Fallback to high-quality natural female voice matching af_heart
        fallbackBrowserTTS();
      }
    } catch (err) {
      console.warn('Kokoro-82M TTS fetch failed, using natural female browser voice:', err);
      fallbackBrowserTTS();
    }
  };

  return (
    <div className={`inline-flex items-center font-mono text-[10px] uppercase ${className}`}>
      {isLoading ? (
        <span className="px-2.5 py-1 bg-[#1a150e] border border-[#E6A360] text-[#E6A360] flex items-center gap-1.5 cursor-wait">
          <svg className="animate-spin h-3 w-3 text-[#E6A360]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>af_heart (Kokoro)...</span>
        </span>
      ) : isPlaying ? (
        <button
          type="button"
          onClick={handleTogglePlay}
          className="px-2.5 py-1 bg-[#220d0d] border border-[#DC8381] text-[#DC8381] hover:bg-[#331111] font-bold flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
          title="Click to stop listening"
        >
          <span className="w-2 h-2 rounded-full bg-[#DC8381] animate-ping" />
          <span>Stop Voice ⏹</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleTogglePlay}
          className="px-2.5 py-1 bg-[#000000] border border-[#333333] hover:border-[#EDEDED] text-[#A1A1A1] hover:text-[#EDEDED] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer group"
          title="Listen with Kokoro af_heart (Natural Female Voice)"
        >
          <span className="text-xs group-hover:scale-110 transition-transform">🔊</span>
          <span>Listen (af_heart)</span>
        </button>
      )}
    </div>
  );
}
