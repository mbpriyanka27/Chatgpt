import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, MicIcon, MicOffIcon, StopIcon, SparklesIcon } from './Icons';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  token: string | null;
  chatId: string | null;
  selectedModel: string;
  onBackgroundMessage?: (userText: string, asstText: string, isFinished: boolean) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: '🌐 Auto-Detect Language' },
  { code: 'en-US', name: '🇺🇸 English (US)' },
  { code: 'es-ES', name: '🇪🇸 Español (Spanish)' },
  { code: 'fr-FR', name: '🇫🇷 Français (French)' },
  { code: 'de-DE', name: '🇩🇪 Deutsch (German)' },
  { code: 'hi-IN', name: '🇮🇳 हिन्दी (Hindi)' },
  { code: 'ar-SA', name: '🇸🇦 العربية (Arabic)' },
  { code: 'zh-CN', name: '🇨🇳 中文 (Chinese)' },
  { code: 'ja-JP', name: '🇯🇵 日本語 (Japanese)' },
  { code: 'it-IT', name: '🇮🇹 Italiano (Italian)' },
  { code: 'pt-BR', name: '🇧🇷 Português (Portuguese)' },
  { code: 'ru-RU', name: '🇷🇺 Русский (Russian)' },
  { code: 'ko-KR', name: '🇰🇷 한국어 (Korean)' },
  { code: 'te-IN', name: '🇮🇳 తెలుగు (Telugu)' },
  { code: 'ta-IN', name: '🇮🇳 தமிழ் (Tamil)' }
];

export function VoiceChatModal({
  isOpen,
  onClose,
  apiUrl,
  token,
  chatId,
  selectedModel,
  onBackgroundMessage
}: VoiceChatModalProps) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiSpokenText, setAiSpokenText] = useState('');
  const [selectedLang, setSelectedLang] = useState('auto');
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isClosingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechQueueCountRef = useRef(0);
  const detectedLangRef = useRef('en-US');

  // Initialize SpeechSynthesis on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      synthRef.current.getVoices();
      if (synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = () => {
          synthRef.current?.getVoices();
        };
      }
    }
  }, []);

  // Modal lifecycle
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

    // Immediately start listening when voice modal opens (just like ChatGPT)
    const timer = setTimeout(() => {
      startListening();
    }, 250);

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
      setUserTranscript('Microphone recognition not supported in this browser. Please use Chrome or Edge.');
      setStatus('idle');
      return;
    }

    stopListening();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      // Set language (supports all languages)
      const targetLang =
        selectedLang !== 'auto'
          ? selectedLang
          : (navigator.language || 'en-US');

      recognition.lang = targetLang;
      detectedLangRef.current = targetLang;

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

        // When user finishes speaking sentence, trigger immediately
        if (final && final.trim().length > 1) {
          handleUserQuery(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && !isClosingRef.current) {
          console.warn('Speech error:', event.error);
        }
      };

      recognition.onend = () => {
        if (!isClosingRef.current && status === 'listening') {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech start error:', e);
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

  // Ultra-Fast Streaming Voice Response Handler
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
          is_voice_mode: true,
          max_tokens: 35, // 15-20 words for sub-second fraction response
          api_key: typeof window !== 'undefined' ? localStorage.getItem('chatgpt_api_key') || '' : ''
        }),
        signal: abortController.signal
      });

      if (!response.ok) throw new Error('Voice stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let sentenceBuffer = '';
      let fullResponseAccumulated = '';
      let hasStartedSpeaking = false;

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

                  // Update parent chat in the background
                  if (onBackgroundMessage) {
                    onBackgroundMessage(query, fullResponseAccumulated, false);
                  }

                  // Fraction of second trigger: Speak as soon as first 4 words or punctuation arrives!
                  const sentenceMatch = sentenceBuffer.match(/^([\s\S]*?[.!?\n,]+)\s*([\s\S]*)$/);
                  if (sentenceMatch) {
                    const chunkToSpeak = sentenceMatch[1].trim();
                    sentenceBuffer = sentenceMatch[2];

                    if (chunkToSpeak.length > 2) {
                      if (!hasStartedSpeaking) {
                        setStatus('speaking');
                        hasStartedSpeaking = true;
                      }
                      enqueueSpeech(chunkToSpeak);
                    }
                  }
                }
              } catch (e) {
                // Ignore partial JSON
              }
            }
          }
        }

        // Speak remaining buffer
        if (sentenceBuffer.trim().length > 1) {
          if (!hasStartedSpeaking) {
            setStatus('speaking');
          }
          enqueueSpeech(sentenceBuffer.trim());
        }

        if (onBackgroundMessage) {
          onBackgroundMessage(query, fullResponseAccumulated, true);
        }

        // If no speech queued, resume listening
        if (speechQueueCountRef.current === 0 && !isClosingRef.current) {
          setStatus('listening');
          startListening();
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorText = "I'm having trouble connecting right now.";
        setAiSpokenText(errorText);
        setStatus('speaking');
        enqueueSpeech(errorText);
      }
    }
  };

  // Speaks in ANY language with matched browser voices
  const enqueueSpeech = (rawText: string) => {
    if (!synthRef.current || isClosingRef.current) return;

    const clean = rawText
      .replace(/\*\*|__|\*|_|`|```[\s\S]*?```/g, '')
      .replace(/#+\s+/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.1; // Fast, snappy, natural pace
    utterance.pitch = 1.0;

    const voices = synthRef.current.getVoices();
    const currentLangCode = detectedLangRef.current.slice(0, 2).toLowerCase();

    // Match voice for user's language (Spanish, Hindi, French, German, Chinese, English, etc.)
    const matchedVoice =
      voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith(currentLangCode) &&
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))
      ) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(currentLangCode)) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    }

    speechQueueCountRef.current += 1;

    utterance.onend = () => {
      speechQueueCountRef.current = Math.max(0, speechQueueCountRef.current - 1);
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
    if (status === 'speaking' || status === 'thinking') {
      stopSpeaking();
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setStatus('listening');
      setUserTranscript('');
      setAiSpokenText('');
      startListening();
    } else if (status === 'listening') {
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#07080e',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 20px',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Standalone Keyframe Animations for Fluid Orb */}
      <style>{`
        @keyframes orbMorph {
          0%, 100% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
            transform: scale(1) translateY(0px);
          }
          50% {
            border-radius: 40% 60% 70% 30% / 50% 60% 30% 60%;
            transform: scale(1.05) translateY(-6px);
          }
        }
        @keyframes rippleRing {
          0% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.25); opacity: 0.25; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes soundWaveBounce {
          0%, 100% { height: 12px; }
          50% { height: 44px; }
        }
        .fluid-orb-listening {
          background: radial-gradient(circle at 35% 35%, #ffffff 0%, #34d399 28%, #059669 60%, #064e3b 100%);
          box-shadow: 0 0 70px rgba(16, 185, 129, 0.55), inset 0 0 25px rgba(255, 255, 255, 0.4);
          animation: orbMorph 5s ease-in-out infinite;
        }
        .fluid-orb-thinking {
          background: radial-gradient(circle at 35% 35%, #ffffff 0%, #c084fc 30%, #7c3aed 65%, #312e81 100%);
          box-shadow: 0 0 75px rgba(168, 85, 247, 0.6), inset 0 0 25px rgba(255, 255, 255, 0.4);
          animation: orbMorph 3s ease-in-out infinite;
        }
        .fluid-orb-speaking {
          background: radial-gradient(circle at 35% 35%, #ffffff 0%, #38bdf8 25%, #2563eb 55%, #1e1b4b 100%);
          box-shadow: 0 0 90px rgba(56, 189, 248, 0.7), inset 0 0 30px rgba(255, 255, 255, 0.5);
          animation: orbMorph 3.5s ease-in-out infinite;
        }
        .fluid-orb-idle {
          background: radial-gradient(circle at 35% 35%, #94a3b8 0%, #475569 50%, #1e293b 100%);
          box-shadow: 0 0 30px rgba(100, 116, 139, 0.3);
        }
      `}</style>

      {/* Top Header: Model & Language Selector */}
      <div style={{ width: '100%', maxWidth: '640px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af' }}>
            ChatGPT Advanced Voice
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language Selector */}
          <select
            value={selectedLang}
            onChange={(e) => {
              setSelectedLang(e.target.value);
              stopListening();
              setTimeout(() => startListening(), 100);
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '11px',
              padding: '6px 10px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} style={{ backgroundColor: '#181824', color: '#ffffff' }}>
                {lang.name}
              </option>
            ))}
          </select>

          {/* Close / Exit Button */}
          <button
            onClick={() => {
              isClosingRef.current = true;
              stopListening();
              stopSpeaking();
              if (abortControllerRef.current) abortControllerRef.current.abort();
              onClose();
            }}
            style={{
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Exit Voice Mode"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center: The Iconic Large Fluid Morphing Circle */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '500px', position: 'relative' }}>
        
        {/* Container with click-to-interrupt */}
        <div
          onClick={handleInterruptOrTap}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '300px', height: '300px' }}
        >
          {/* Concentric Acoustic Waves */}
          {status === 'speaking' && (
            <>
              <div
                style={{
                  position: 'absolute',
                  width: '320px',
                  height: '320px',
                  borderRadius: '50%',
                  border: '2px solid rgba(56, 189, 248, 0.4)',
                  animation: 'rippleRing 2s ease-out infinite'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '370px',
                  height: '370px',
                  borderRadius: '50%',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  animation: 'rippleRing 2s ease-out 0.6s infinite'
                }}
              />
            </>
          )}

          {status === 'listening' && (
            <div
              style={{
                position: 'absolute',
                width: '330px',
                height: '330px',
                borderRadius: '50%',
                border: '2px solid rgba(16, 185, 129, 0.35)',
                animation: 'rippleRing 2.5s ease-out infinite'
              }}
            />
          )}

          {/* Large Fluid Orb Circle */}
          <div
            className={
              status === 'listening'
                ? 'fluid-orb-listening'
                : status === 'thinking'
                ? 'fluid-orb-thinking'
                : status === 'speaking'
                ? 'fluid-orb-speaking'
                : 'fluid-orb-idle'
            }
            style={{
              width: '230px',
              height: '230px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.5s ease'
            }}
          >
            {/* Center Visual Core */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {status === 'speaking' ? (
                <>
                  <div style={{ width: '6px', height: '18px', backgroundColor: '#ffffff', borderRadius: '4px', animation: 'soundWaveBounce 0.8s ease-in-out infinite 0.1s' }} />
                  <div style={{ width: '6px', height: '32px', backgroundColor: '#ffffff', borderRadius: '4px', animation: 'soundWaveBounce 0.8s ease-in-out infinite 0.3s' }} />
                  <div style={{ width: '6px', height: '42px', backgroundColor: '#ffffff', borderRadius: '4px', animation: 'soundWaveBounce 0.8s ease-in-out infinite 0.15s' }} />
                  <div style={{ width: '6px', height: '26px', backgroundColor: '#ffffff', borderRadius: '4px', animation: 'soundWaveBounce 0.8s ease-in-out infinite 0.4s' }} />
                  <div style={{ width: '6px', height: '14px', backgroundColor: '#ffffff', borderRadius: '4px', animation: 'soundWaveBounce 0.8s ease-in-out infinite 0.2s' }} />
                </>
              ) : status === 'listening' ? (
                <MicIcon className="w-12 h-12 text-white" />
              ) : status === 'thinking' ? (
                <SparklesIcon className="w-12 h-12 text-white" />
              ) : (
                <MicOffIcon className="w-12 h-12 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* State Pill */}
        <div
          style={{
            marginTop: '28px',
            padding: '6px 18px',
            borderRadius: '24px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor:
                status === 'listening'
                  ? '#10b981'
                  : status === 'speaking'
                  ? '#38bdf8'
                  : status === 'thinking'
                  ? '#c084fc'
                  : '#64748b'
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0', letterSpacing: '0.02em' }}>
            {status === 'listening' && 'Listening to you... Speak in any language'}
            {status === 'thinking' && 'Thinking...'}
            {status === 'speaking' && 'Speaking... (Tap orb to interrupt)'}
            {status === 'idle' && 'Microphone paused'}
          </span>
        </div>

        {/* Live Conversation Transcript */}
        <div style={{ marginTop: '20px', minHeight: '60px', textAlign: 'center', padding: '0 16px', maxWidth: '440px' }}>
          {userTranscript ? (
            <p style={{ fontSize: '15px', color: '#f1f5f9', fontStyle: 'italic', margin: 0 }}>
              &ldquo;{userTranscript}&rdquo;
            </p>
          ) : aiSpokenText && status === 'speaking' ? (
            <p style={{ fontSize: '14px', color: '#7dd3fc', margin: 0, lineHeight: 1.4 }}>
              {aiSpokenText}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Say anything in English, Spanish, Hindi, French, or any language...
            </p>
          )}
        </div>
      </div>

      {/* Bottom Floating Controls */}
      <div style={{ width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: '16px' }}>
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          style={{
            padding: '16px',
            borderRadius: '50%',
            backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.1)',
            border: isMuted ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.15)',
            color: isMuted ? '#f87171' : '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
          }}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
        </button>

        {/* Tap to Interrupt Button */}
        <button
          onClick={handleInterruptOrTap}
          style={{
            padding: '16px',
            borderRadius: '50%',
            backgroundColor: status === 'speaking' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.1)',
            border: status === 'speaking' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255,255,255,0.15)',
            color: status === 'speaking' ? '#fbbf24' : '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
          }}
          title={status === 'speaking' ? 'Interrupt response' : 'Tap to speak'}
        >
          {status === 'speaking' ? <StopIcon className="w-6 h-6" /> : <SparklesIcon className="w-6 h-6" />}
        </button>

        {/* End Call Button */}
        <button
          onClick={() => {
            isClosingRef.current = true;
            stopListening();
            stopSpeaking();
            if (abortControllerRef.current) abortControllerRef.current.abort();
            onClose();
          }}
          style={{
            padding: '16px',
            borderRadius: '50%',
            backgroundColor: '#dc2626',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.5)'
          }}
          title="End Voice Call"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

    </div>
  );
}
