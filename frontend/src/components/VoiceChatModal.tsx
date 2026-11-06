import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, MicIcon, MicOffIcon, StopIcon, SparklesIcon } from './Icons';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  token: string | null;
  chatId: string | null;
  selectedModel: string;
}

export function VoiceChatModal({
  isOpen,
  onClose,
  apiUrl,
  token,
  chatId,
  selectedModel
}: VoiceChatModalProps) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiSpokenText, setAiSpokenText] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isClosingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechQueueCountRef = useRef(0);

  // Initialize SpeechSynthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      // Pre-load voices
      synthRef.current.getVoices();
      if (synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = () => {
          synthRef.current?.getVoices();
        };
      }
    }
  }, []);

  // Lifecycle on modal open / close
  useEffect(() => {
    if (!isOpen) {
      isClosingRef.current = true;
      stopListening();
      stopSpeaking();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    isClosingRef.current = false;
    setUserTranscript('');
    setAiSpokenText('');
    speechQueueCountRef.current = 0;
    
    // Automatically start listening immediately on open like ChatGPT Voice
    const timer = setTimeout(() => {
      startListening();
    }, 400);

    return () => {
      clearTimeout(timer);
      isClosingRef.current = true;
      stopListening();
      stopSpeaking();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
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

    // Abort any existing instance
    stopListening();

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

        // When user pauses or finishes speaking, submit immediately
        if (final && final.trim().length > 1) {
          handleUserQuery(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && !isClosingRef.current) {
          console.warn('Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        if (!isClosingRef.current && status === 'listening') {
          // Keep listening active
          try {
            recognition.start();
          } catch (e) {}
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
    speechQueueCountRef.current = 0;
  };

  // Ultra-Fast Streaming Voice Handler (Sentence-Level TTS)
  const handleUserQuery = async (query: string) => {
    stopListening();
    stopSpeaking();
    setStatus('thinking');
    setUserTranscript(query);
    setAiSpokenText('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`${apiUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          chat_id: chatId,
          prompt: query,
          model: selectedModel,
          is_voice_mode: true, // Prompts model to answer concisely (1-2 sentences)
          max_tokens: 70,
          api_key: typeof window !== 'undefined' ? localStorage.getItem('chatgpt_api_key') || '' : ''
        }),
        signal: abortController.signal
      });

      if (!response.ok) throw new Error('Voice stream connection failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let sentenceBuffer = '';
      let fullResponseAccumulated = '';
      let isFirstSentence = true;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value, { stream: true });
          const lines = chunkText.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                if (payload.event === 'chunk') {
                  const tokenText = payload.text;
                  sentenceBuffer += tokenText;
                  fullResponseAccumulated += tokenText;
                  setAiSpokenText(fullResponseAccumulated);

                  // As soon as a sentence ends (. ! ? or newline), speak it IMMEDIATELY!
                  const sentenceMatch = sentenceBuffer.match(/^([\s\S]*?[.!?\n]+)\s*([\s\S]*)$/);
                  if (sentenceMatch) {
                    const sentenceToSpeak = sentenceMatch[1].trim();
                    sentenceBuffer = sentenceMatch[2];

                    if (sentenceToSpeak.length > 2) {
                      if (isFirstSentence) {
                        setStatus('speaking');
                        isFirstSentence = false;
                      }
                      enqueueSentence(sentenceToSpeak);
                    }
                  }
                }
              } catch (e) {
                // Ignore partial JSON
              }
            }
          }
        }

        // Speak any remaining sentence buffer
        if (sentenceBuffer.trim().length > 1) {
          if (isFirstSentence) {
            setStatus('speaking');
          }
          enqueueSentence(sentenceBuffer.trim());
        }

        // If no speech was queued, resume listening
        if (speechQueueCountRef.current === 0 && !isClosingRef.current) {
          setStatus('listening');
          startListening();
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorSentence = "I'm having trouble connecting right now. Please try again.";
        setAiSpokenText(errorSentence);
        setStatus('speaking');
        enqueueSentence(errorSentence);
      }
    }
  };

  // Queue sentence into Web Speech Synthesis with natural voices
  const enqueueSentence = (rawSentence: string) => {
    if (!synthRef.current || isClosingRef.current) return;

    const clean = rawSentence
      .replace(/\*\*|__|\*|_|`|```[\s\S]*?```/g, '')
      .replace(/#+\s+/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.08; // Crisp, conversational speed
    utterance.pitch = 1.0;

    const voices = synthRef.current.getVoices();
    const naturalVoice = voices.find(
      (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Samantha') || v.name.includes('Guy')) && v.lang.startsWith('en')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    speechQueueCountRef.current += 1;

    utterance.onend = () => {
      speechQueueCountRef.current = Math.max(0, speechQueueCountRef.current - 1);
      // When all queued sentences are done speaking, automatically start listening for user's next question!
      if (speechQueueCountRef.current === 0 && !isClosingRef.current) {
        setStatus('listening');
        setUserTranscript('');
        startListening();
      }
    };

    utterance.onerror = () => {
      speechQueueCountRef.current = Math.max(0, speechQueueCountRef.current - 1);
      if (speechQueueCountRef.current === 0 && !isClosingRef.current) {
        setStatus('listening');
        startListening();
      }
    };

    synthRef.current.speak(utterance);
  };

  const handleInterruptOrTap = () => {
    // If speaking, tap interrupts immediately and switches to listening
    if (status === 'speaking' || status === 'thinking') {
      stopSpeaking();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setStatus('listening');
      setUserTranscript('');
      setAiSpokenText('');
      startListening();
    } else if (status === 'listening') {
      // If already listening, pause/mute
      toggleMute();
    }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#07080d] text-white flex flex-col justify-between items-center p-6 sm:p-10 select-none overflow-hidden animate-in fade-in duration-300">
      
      {/* Top Header Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
            ChatGPT Advanced Voice
          </span>
        </div>

        <button
          onClick={() => {
            isClosingRef.current = true;
            stopListening();
            stopSpeaking();
            if (abortControllerRef.current) abortControllerRef.current.abort();
            onClose();
          }}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all hover:scale-105"
          title="Close voice mode"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Center Hero: Big Iconic ChatGPT Fluid Morphing Orb */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-lg">
        
        {/* Ripple Wave Rings (Expand during speaking and listening) */}
        <div className="relative flex items-center justify-center cursor-pointer" onClick={handleInterruptOrTap}>
          
          {/* Animated Ambient Backlight Rings */}
          {status === 'speaking' && (
            <>
              <div className="absolute w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-cyan-500/15 animate-ping duration-1000" />
              <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-blue-500/20 animate-pulse duration-700" />
              <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-teal-400/25 blur-xl animate-pulse" />
            </>
          )}

          {status === 'listening' && (
            <>
              <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-emerald-500/15 animate-pulse duration-1000" />
              <div className="absolute w-60 h-60 sm:w-64 sm:h-64 rounded-full bg-teal-500/20 blur-xl animate-pulse" />
            </>
          )}

          {status === 'thinking' && (
            <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-purple-500/25 blur-2xl animate-spin duration-700" />
          )}

          {/* Big ChatGPT Organic Fluid Circle / Orb */}
          <div
            className={`relative w-48 h-48 sm:w-64 sm:h-64 rounded-full flex items-center justify-center shadow-2xl transition-all duration-700 ${
              status === 'listening'
                ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-300 shadow-emerald-500/50 scale-100 hover:scale-105'
                : status === 'thinking'
                ? 'bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 shadow-purple-500/60 animate-pulse scale-95'
                : status === 'speaking'
                ? 'bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-cyan-400/70 scale-110'
                : 'bg-gradient-to-tr from-gray-700 to-gray-800 opacity-60 scale-95'
            }`}
          >
            {/* Inner Organic Mesh Layer */}
            <div className="w-[85%] h-[85%] rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center relative overflow-hidden">
              
              {/* Inner Pulsing Core */}
              <div
                className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full transition-transform duration-500 ${
                  status === 'speaking'
                    ? 'bg-white/40 scale-125 blur-sm animate-pulse'
                    : status === 'listening'
                    ? 'bg-white/30 scale-100 blur-sm animate-ping'
                    : 'bg-white/10'
                }`}
              />

              {/* Dynamic Sound Wave Bars / Center Graphic */}
              <div className="absolute flex items-center gap-1.5 sm:gap-2 z-10">
                {status === 'speaking' ? (
                  <>
                    <div className="w-1.5 sm:w-2 h-8 sm:h-12 bg-white rounded-full animate-bounce delay-75 shadow-lg" />
                    <div className="w-1.5 sm:w-2 h-14 sm:h-20 bg-white rounded-full animate-pulse shadow-lg" />
                    <div className="w-1.5 sm:w-2 h-18 sm:h-24 bg-white rounded-full animate-bounce delay-150 shadow-lg" />
                    <div className="w-1.5 sm:w-2 h-10 sm:h-16 bg-white rounded-full animate-pulse delay-100 shadow-lg" />
                    <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-white rounded-full animate-bounce delay-200 shadow-lg" />
                  </>
                ) : status === 'listening' ? (
                  <MicIcon className="w-10 h-10 sm:w-14 sm:h-14 text-white drop-shadow-lg animate-pulse" />
                ) : status === 'thinking' ? (
                  <SparklesIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-spin" />
                ) : (
                  <MicOffIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white/50" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="mt-8 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'listening'
                ? 'bg-emerald-400 animate-ping'
                : status === 'speaking'
                ? 'bg-cyan-400 animate-pulse'
                : status === 'thinking'
                ? 'bg-purple-400 animate-spin'
                : 'bg-gray-500'
            }`}
          />
          <span className="text-xs font-medium tracking-wide text-gray-200">
            {status === 'listening' && 'Listening...'}
            {status === 'thinking' && 'Thinking...'}
            {status === 'speaking' && 'Speaking... (Tap circle to interrupt)'}
            {status === 'idle' && 'Microphone muted'}
          </span>
        </div>

        {/* Live Conversation Transcript Display */}
        <div className="mt-6 w-full max-w-md text-center min-h-[50px] px-4">
          {userTranscript && (
            <p className="text-sm sm:text-base text-gray-200 font-medium italic animate-in fade-in duration-200">
              &ldquo;{userTranscript}&rdquo;
            </p>
          )}
          {status === 'speaking' && aiSpokenText && (
            <p className="mt-2 text-xs sm:text-sm text-cyan-300/90 line-clamp-3 animate-in fade-in duration-300">
              {aiSpokenText}
            </p>
          )}
          {!userTranscript && !aiSpokenText && status === 'listening' && (
            <p className="text-xs text-gray-500 animate-pulse">
              Start speaking naturally — ChatGPT will respond instantly.
            </p>
          )}
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="w-full max-w-xs flex items-center justify-around py-4 z-20">
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full border transition-all hover:scale-105 shadow-xl ${
            isMuted
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-white/10 border-white/10 text-gray-200 hover:bg-white/20 hover:text-white'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
        </button>

        {/* Interrupt / Stop Button */}
        {status === 'speaking' ? (
          <button
            onClick={handleInterruptOrTap}
            className="p-4 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all hover:scale-105 shadow-xl flex items-center justify-center"
            title="Interrupt speech"
          >
            <StopIcon className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={handleInterruptOrTap}
            className="p-4 rounded-full bg-white/10 border border-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-all hover:scale-105 shadow-xl flex items-center justify-center"
            title="Tap to talk"
          >
            <SparklesIcon className="w-6 h-6" />
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={() => {
            isClosingRef.current = true;
            stopListening();
            stopSpeaking();
            if (abortControllerRef.current) abortControllerRef.current.abort();
            onClose();
          }}
          className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all hover:scale-105 shadow-xl shadow-red-900/40"
          title="End Voice Call"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

    </div>
  );
}
