import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, MicIcon, MicOffIcon, StopIcon, SparklesIcon } from './Icons';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => Promise<string>;
  systemPrompt?: string;
}

export function VoiceChatModal({
  isOpen,
  onClose,
  onSendMessage,
}: VoiceChatModalProps) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      isClosingRef.current = true;
      stopListening();
      stopSpeaking();
      return;
    }

    isClosingRef.current = false;
    startListening();

    return () => {
      isClosingRef.current = true;
      stopListening();
      stopSpeaking();
    };
  }, [isOpen]);

  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setUserTranscript('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setStatus('idle');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (!isClosingRef.current) {
          setStatus('listening');
        }
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentText = final || interim;
        setUserTranscript(currentText);

        if (final && final.trim().length > 1) {
          handleUserFinishedSpeaking(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && !isClosingRef.current) {
          console.warn('Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        if (!isClosingRef.current && status === 'listening') {
          // Restart if user was still listening and nothing final was triggered
          try {
            recognition.start();
          } catch (e) {
            // Ignore
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    currentUtteranceRef.current = null;
  };

  const handleUserFinishedSpeaking = async (query: string) => {
    stopListening();
    setStatus('thinking');
    setUserTranscript(query);

    try {
      const response = await onSendMessage(query);
      setAiResponse(response);
      speakResponse(response);
    } catch (err: any) {
      const errorMsg = 'Sorry, I encountered an issue processing that.';
      setAiResponse(errorMsg);
      speakResponse(errorMsg);
    }
  };

  const speakResponse = (text: string) => {
    if (!synthRef.current || isClosingRef.current) return;

    stopSpeaking();
    setStatus('speaking');

    // Clean markdown symbols for cleaner speech
    const cleanText = text
      .replace(/\*\*|__|\*|_|`|```[\s\S]*?```/g, '')
      .replace(/#+\s+/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick a natural voice if available
    const voices = synthRef.current.getVoices();
    const naturalVoice = voices.find(
      (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny')) && v.lang.startsWith('en')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => {
      if (!isClosingRef.current) {
        setStatus('listening');
        setUserTranscript('');
        startListening();
      }
    };

    utterance.onerror = () => {
      if (!isClosingRef.current) {
        setStatus('listening');
        startListening();
      }
    };

    currentUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      startListening();
    } else {
      setIsMuted(true);
      stopListening();
      setStatus('idle');
    }
  };

  const handleInterrupt = () => {
    stopSpeaking();
    setStatus('listening');
    setUserTranscript('');
    startListening();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#13131f] border border-[rgba(255,255,255,0.12)] p-8 shadow-2xl text-white flex flex-col items-center justify-between min-h-[520px]">
        
        {/* Top Header */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <SparklesIcon className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold tracking-wide text-gray-200">ChatGPT Voice Mode</span>
          </div>
          <button
            onClick={() => {
              isClosingRef.current = true;
              stopListening();
              stopSpeaking();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Center Orb & Animated Waves */}
        <div className="my-8 flex flex-col items-center justify-center relative">
          <div className="relative flex items-center justify-center">
            {/* Pulsing Aura Rings */}
            {status === 'listening' && (
              <>
                <div className="absolute w-44 h-44 rounded-full bg-emerald-500/10 animate-ping" />
                <div className="absolute w-36 h-36 rounded-full bg-emerald-500/20 animate-pulse" />
              </>
            )}
            {status === 'thinking' && (
              <div className="absolute w-36 h-36 rounded-full bg-purple-500/20 animate-spin" />
            )}
            {status === 'speaking' && (
              <>
                <div className="absolute w-48 h-48 rounded-full bg-cyan-500/15 animate-pulse" />
                <div className="absolute w-36 h-36 rounded-full bg-blue-500/25 animate-ping" />
              </>
            )}

            {/* Central Glowing Orb */}
            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 z-10 ${
                status === 'listening'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/50 scale-105'
                  : status === 'thinking'
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-400 shadow-purple-500/50 animate-pulse'
                  : status === 'speaking'
                  ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/50 scale-110'
                  : 'bg-gradient-to-tr from-gray-700 to-gray-600'
              }`}
            >
              {status === 'listening' && <MicIcon className="w-10 h-10 text-white animate-bounce" />}
              {status === 'thinking' && <SparklesIcon className="w-10 h-10 text-white animate-spin" />}
              {status === 'speaking' && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-6 bg-white rounded-full animate-pulse" />
                  <div className="w-1.5 h-10 bg-white rounded-full animate-bounce" />
                  <div className="w-1.5 h-7 bg-white rounded-full animate-pulse" />
                  <div className="w-1.5 h-4 bg-white rounded-full animate-bounce" />
                </div>
              )}
              {status === 'idle' && <MicOffIcon className="w-10 h-10 text-gray-400" />}
            </div>
          </div>

          {/* Status Label */}
          <div className="mt-6 text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              {status === 'listening' && '● Listening to your voice...'}
              {status === 'thinking' && '● Thinking of response...'}
              {status === 'speaking' && '● Speaking answer...'}
              {status === 'idle' && 'Muted'}
            </span>
          </div>
        </div>

        {/* Live Conversation Transcript */}
        <div className="w-full bg-[#1c1c2e] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 text-center max-h-32 overflow-y-auto scrollbar-thin">
          {userTranscript ? (
            <p className="text-sm text-gray-200 italic">
              &quot;{userTranscript}&quot;
            </p>
          ) : aiResponse && status === 'speaking' ? (
            <p className="text-xs text-gray-300 line-clamp-3">
              {aiResponse}
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Say anything naturally... ChatGPT will listen and respond back with voice.
            </p>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="w-full flex items-center justify-center gap-4 pt-6 border-t border-[rgba(255,255,255,0.06)] mt-4">
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl border transition-all ${
              isMuted
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-white/5 border-[rgba(255,255,255,0.1)] text-gray-300 hover:text-white hover:bg-white/10'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
          </button>

          {status === 'speaking' && (
            <button
              onClick={handleInterrupt}
              className="px-4 py-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <StopIcon className="w-4 h-4" />
              <span>Interrupt & Talk</span>
            </button>
          )}

          <button
            onClick={() => {
              isClosingRef.current = true;
              stopListening();
              stopSpeaking();
              onClose();
            }}
            className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-900/30 transition-colors"
          >
            End Voice Call
          </button>
        </div>

      </div>
    </div>
  );
}
