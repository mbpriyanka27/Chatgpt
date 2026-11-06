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
  { code: 'kn-IN', name: '🇮🇳 ಕನ್ನಡ (Kannada)' },
  { code: 'en-US', name: '🇺🇸 English (US)' },
  { code: 'hi-IN', name: '🇮🇳 हिन्दी (Hindi)' },
  { code: 'te-IN', name: '🇮🇳 తెలుగు (Telugu)' },
  { code: 'ta-IN', name: '🇮🇳 தமிழ் (Tamil)' },
  { code: 'es-ES', name: '🇪🇸 Español (Spanish)' },
  { code: 'fr-FR', name: '🇫🇷 Français (French)' },
  { code: 'de-DE', name: '🇩🇪 Deutsch (German)' },
  { code: 'ar-SA', name: '🇸🇦 العربية (Arabic)' },
  { code: 'zh-CN', name: '🇨🇳 中文 (Chinese)' },
  { code: 'ja-JP', name: '🇯🇵 日本語 (Japanese)' },
  { code: 'it-IT', name: '🇮🇹 Italiano (Italian)' },
  { code: 'pt-BR', name: '🇧🇷 Português (Portuguese)' },
  { code: 'ru-RU', name: '🇷🇺 Русский (Russian)' },
  { code: 'ko-KR', name: '🇰🇷 한국어 (Korean)' }
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
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatgpt_voice_lang') || 'kn-IN';
    }
    return 'kn-IN';
  });
  const [isMuted, setIsMuted] = useState(false);
  const [turnCount, setTurnCount] = useState(1);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isClosingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);
  const speechQueueCountRef = useRef(0);
  const detectedLangRef = useRef('kn-IN');
  // Prevents Chrome from garbage-collecting utterances before onend fires!
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const silenceTimerRef = useRef<any>(null);

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
    setTurnCount(1);
    speechQueueCountRef.current = 0;
    activeUtterancesRef.current = [];

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
    if (typeof window === 'undefined' || isClosingRef.current || isMuted) return;

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

      // Handle language selection (Kannada kn-IN, Hindi hi-IN, English, etc.)
      const targetLang =
        selectedLang !== 'auto'
          ? selectedLang
          : (navigator.language?.toLowerCase().startsWith('kn') ? 'kn-IN' : 'kn-IN');

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

        // Dynamically track detected script
        if (/[\u0C80-\u0CFF]/.test(currentText)) {
          detectedLangRef.current = 'kn-IN';
        } else if (/[\u0900-\u097F]/.test(currentText)) {
          detectedLangRef.current = 'hi-IN';
        } else if (/[\u0C00-\u0C7F]/.test(currentText)) {
          detectedLangRef.current = 'te-IN';
        } else if (/[\u0B80-\u0BFF]/.test(currentText)) {
          detectedLangRef.current = 'ta-IN';
        }

        // Immediate silence detector: if final phrase received, trigger query without waiting
        if (final && final.trim().length > 0) {
          clearTimeout(silenceTimerRef.current);
          handleUserQuery(final.trim());
        } else if (interim && interim.trim().length > 3) {
          // If user pauses for 900ms, automatically trigger query for snappy real-time conversation
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (currentText.trim().length > 0 && status === 'listening') {
              handleUserQuery(currentText.trim());
            }
          }, 950);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && !isClosingRef.current) {
          console.warn('Speech recognition error:', event.error);
        }
        if (event.error === 'no-speech' && status === 'listening' && !isClosingRef.current) {
          // Auto restart listening if silent
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.onend = () => {
        if (!isClosingRef.current && status === 'listening' && !isStreamingRef.current) {
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
    clearTimeout(silenceTimerRef.current);
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
    activeUtterancesRef.current = [];
  };

  // Ultra-Fast Streaming Voice Handler
  const handleUserQuery = async (query: string) => {
    clearTimeout(silenceTimerRef.current);
    stopListening();
    stopSpeaking();
    setStatus('thinking');
    setUserTranscript(query);
    setAiSpokenText('');
    isStreamingRef.current = true;

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
          voice_language: selectedLang !== 'auto' ? selectedLang : detectedLangRef.current,
          language: selectedLang !== 'auto' ? selectedLang : detectedLangRef.current,
          max_tokens: 35, // Ultra short for < 300ms sub-second response
          api_key: typeof window !== 'undefined' ? localStorage.getItem('chatgpt_api_key') || '' : ''
        }),
        signal: abortController.signal
      });

      if (!response.ok) throw new Error('Voice connection failed');

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

                  if (onBackgroundMessage) {
                    onBackgroundMessage(query, fullResponseAccumulated, false);
                  }

                  // Fraction of second trigger: Speak as soon as first 3-4 words or punctuation arrives
                  const sentenceMatch = sentenceBuffer.match(/^([\s\S]*?[.!?\n,]+)\s*([\s\S]*)$/);
                  if (sentenceMatch) {
                    const chunkToSpeak = sentenceMatch[1].trim();
                    sentenceBuffer = sentenceMatch[2];

                    if (chunkToSpeak.length > 1) {
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

        // Speak any remaining sentence buffer
        if (sentenceBuffer.trim().length > 0) {
          if (!hasStartedSpeaking) {
            setStatus('speaking');
          }
          enqueueSpeech(sentenceBuffer.trim());
        }

        if (onBackgroundMessage) {
          onBackgroundMessage(query, fullResponseAccumulated, true);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorText = "I'm having trouble connecting right now.";
        setAiSpokenText(errorText);
        setStatus('speaking');
        enqueueSpeech(errorText);
      }
    } finally {
      isStreamingRef.current = false;
      // If nothing was queued to speak, immediately re-arm for question 2!
      if (speechQueueCountRef.current === 0 && !isClosingRef.current) {
        reArmForNextTurn();
      }
    }
  };

  // Re-arms listening for Question 2, Question 3, etc.
  const reArmForNextTurn = () => {
    if (isClosingRef.current || isMuted) return;
    setTurnCount((prev) => prev + 1);
    setStatus('listening');
    setUserTranscript('');
    setTimeout(() => {
      startListening();
    }, 200);
  };

  // Multilingual Speech Synthesis Engine
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
    utterance.rate = 1.15; // Lively, snappy conversational pace
    utterance.pitch = 1.0;

    const voices = synthRef.current.getVoices();
    // Detect speech language from text script
    let targetLang = detectedLangRef.current || 'kn-IN';
    if (/[\u0C80-\u0CFF]/.test(clean)) {
      targetLang = 'kn-IN';
    } else if (/[\u0900-\u097F]/.test(clean)) {
      targetLang = 'hi-IN';
    } else if (/[\u0C00-\u0C7F]/.test(clean)) {
      targetLang = 'te-IN';
    } else if (/[\u0B80-\u0BFF]/.test(clean)) {
      targetLang = 'ta-IN';
    } else if (/[\u0600-\u06FF]/.test(clean)) {
      targetLang = 'ar-SA';
    }

    const currentLangCode = targetLang.slice(0, 2).toLowerCase();

    // Match voice for user's language (Kannada kn-IN, Hindi hi-IN, Spanish, etc.)
    const matchedVoice =
      voices.find(
        (v) =>
          (v.lang.toLowerCase().startsWith(currentLangCode) || v.lang.toLowerCase().includes(currentLangCode)) &&
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))
      ) ||
      voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith(currentLangCode) ||
          v.lang.toLowerCase().includes(currentLangCode)
      );

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else {
      // Direct speech synthesis language for native browser pronunciation
      utterance.lang = targetLang;
    }

    speechQueueCountRef.current += 1;
    // CRITICAL: Retain utterance reference in array to stop Chrome GC bug!
    activeUtterancesRef.current.push(utterance);

    const onUtteranceFinish = () => {
      // Remove from retention ref
      activeUtterancesRef.current = activeUtterancesRef.current.filter((u) => u !== utterance);
      speechQueueCountRef.current = Math.max(0, speechQueueCountRef.current - 1);

      // Only when stream is completely done and all speech chunks finished, trigger Question 2!
      if (speechQueueCountRef.current === 0 && !isStreamingRef.current && !isClosingRef.current) {
        reArmForNextTurn();
      }
    };

    utterance.onend = onUtteranceFinish;
    utterance.onerror = onUtteranceFinish;

    synthRef.current.speak(utterance);
  };

  const handleInterruptOrTap = () => {
    if (status === 'speaking' || status === 'thinking') {
      stopSpeaking();
      if (abortControllerRef.current) abortControllerRef.current.abort();
      reArmForNextTurn();
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
            transform: scale(1.06) translateY(-6px);
          }
        }
        @keyframes rippleRing {
          0% { transform: scale(0.9); opacity: 0.75; }
          50% { transform: scale(1.25); opacity: 0.28; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes soundWaveBounce {
          0%, 100% { height: 12px; }
          50% { height: 44px; }
        }
        .fluid-orb-listening {
          background: radial-gradient(circle at 35% 35%, #ffffff 0%, #34d399 28%, #059669 60%, #064e3b 100%);
          box-shadow: 0 0 75px rgba(16, 185, 129, 0.6), inset 0 0 25px rgba(255, 255, 255, 0.4);
          animation: orbMorph 4.5s ease-in-out infinite;
        }
        .fluid-orb-thinking {
          background: radial-gradient(circle at 35% 35%, #ffffff 0%, #c084fc 30%, #7c3aed 65%, #312e81 100%);
          box-shadow: 0 0 80px rgba(168, 85, 247, 0.65), inset 0 0 25px rgba(255, 255, 255, 0.4);
          animation: orbMorph 3s ease-in-out infinite;
        }
        .fluid-orb-speaking {
          background: radial-gradient(circle at 35% 35%, #ffffff 0%, #38bdf8 25%, #2563eb 55%, #1e1b4b 100%);
          box-shadow: 0 0 95px rgba(56, 189, 248, 0.75), inset 0 0 30px rgba(255, 255, 255, 0.5);
          animation: orbMorph 3.5s ease-in-out infinite;
        }
        .fluid-orb-idle {
          background: radial-gradient(circle at 35% 35%, #94a3b8 0%, #475569 50%, #1e293b 100%);
          box-shadow: 0 0 30px rgba(100, 116, 139, 0.3);
        }
      `}</style>

      {/* Top Header: Model & Language Selector (Kannada Included) */}
      <div style={{ width: '100%', maxWidth: '640px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af' }}>
            ChatGPT Voice • Turn {turnCount}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language Selector (With Kannada) */}
          <select
            value={selectedLang}
            onChange={(e) => {
              const code = e.target.value;
              setSelectedLang(code);
              if (typeof window !== 'undefined') {
                localStorage.setItem('chatgpt_voice_lang', code);
              }
              detectedLangRef.current = code !== 'auto' ? code : 'kn-IN';
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

          {/* Close Button */}
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
        
        {/* Click to interrupt / talk */}
        <div
          onClick={handleInterruptOrTap}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '310px', height: '310px' }}
        >
          {/* Expanding Acoustic Waves */}
          {status === 'speaking' && (
            <>
              <div
                style={{
                  position: 'absolute',
                  width: '320px',
                  height: '320px',
                  borderRadius: '50%',
                  border: '2px solid rgba(56, 189, 248, 0.45)',
                  animation: 'rippleRing 2s ease-out infinite'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '380px',
                  height: '380px',
                  borderRadius: '50%',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
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
                border: '2px solid rgba(16, 185, 129, 0.4)',
                animation: 'rippleRing 2.5s ease-out infinite'
              }}
            />
          )}

          {/* Large Fluid Orb */}
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
              width: '240px',
              height: '240px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.5s ease'
            }}
          >
            {/* Center Core */}
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

        {/* State Badge with Turn Counter */}
        <div
          style={{
            marginTop: '28px',
            padding: '7px 20px',
            borderRadius: '24px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
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
            {status === 'listening' && `● Listening (Turn ${turnCount})... Speak in Kannada or any language`}
            {status === 'thinking' && '● Thinking...'}
            {status === 'speaking' && '● Speaking answer... (Tap orb to interrupt)'}
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
              {status === 'listening'
                ? 'Speak your question... ChatGPT is listening'
                : 'Tap the orb to start speaking'}
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

        {/* Tap to Interrupt / Next Question */}
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
          title={status === 'speaking' ? 'Interrupt response' : 'Tap to speak next question'}
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
