'use client';

import React, { useState, useEffect, useRef } from 'react';
import ModelInspector, { VisualizationsPayload } from '../components/ModelInspector';
import TelemetryHUD, { ModelInfo, ModelMetrics } from '../components/TelemetryHUD';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  visualizations?: VisualizationsPayload;
  metrics?: ModelMetrics;
  timestamp: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  // Generation Controls
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topK, setTopK] = useState<number>(50);
  const [topP, setTopP] = useState<number>(0.9);
  const [maxTokens, setMaxTokens] = useState<number>(30);
  const [concise, setConcise] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch model info on startup
  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch('http://localhost:8080/api/info');
        if (res.ok) {
          const data: ModelInfo = await res.json();
          setModelInfo(data);
        }
      } catch (err) {
        console.warn('Backend not yet reachable on startup:', err);
      }
    }
    loadInfo();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (userPromptText?: string) => {
    const textToSend = (userPromptText !== undefined ? userPromptText : prompt).trim();
    if (!textToSend || loading) return;

    const userMsgId = 'msg-' + Date.now();
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        content: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          temperature: temperature,
          top_k: topK,
          top_p: topP,
          max_new_tokens: maxTokens,
          concise: concise,
          layer: 0,
          head: 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to infer response');
      }

      const assistantMsgId = 'msg-' + (Date.now() + 1);
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: data.response,
        visualizations: data.visualizations,
        metrics: data.metrics,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (data.model_info) {
        setModelInfo(data.model_info);
      }

      setMessages([...newMessages, assistantMessage]);
      setActiveMessageId(assistantMsgId);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Unknown inference error';
      const errorMsgId = 'msg-' + (Date.now() + 1);
      setMessages([
        ...newMessages,
        {
          id: errorMsgId,
          role: 'assistant',
          content: `⚠️ Engine Error: ${errMsg}\n\nPlease ensure the FastAPI backend is running on http://localhost:8080.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const activeMessage = messages.find((m) => m.id === activeMessageId) ||
    [...messages].reverse().find((m) => m.role === 'assistant' && m.visualizations);

  const presets = [
    { label: 'Paris Capital', prompt: 'The capital of France is' },
    { label: 'Sky Color', prompt: 'Why is the sky blue?' },
    { label: 'Attention Mechanism', prompt: 'Explain the transformer attention mechanism in one sentence.' },
    { label: 'Python Code', prompt: 'def binary_search(arr, target):' },
  ];

  return (
    <div className="app-layout">
      {/* Top Universal Telemetry HUD */}
      <header className="app-topbar">
        <div className="brand-group">
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            &#9776;
          </button>
          <div className="brand-logo">
            <span className="logo-pulse">&#9672;</span>
            <span className="brand-name">LLM X-RAY</span>
            <span className="brand-version">v2.0 Neural Inspector</span>
          </div>
        </div>

        <TelemetryHUD
          metrics={activeMessage?.metrics}
          info={modelInfo || undefined}
        />
      </header>

      <div className="app-body">
        {/* Left Control Panel / Sidebar */}
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <button
            className="btn-new-analysis"
            onClick={() => {
              setMessages([]);
              setActiveMessageId(null);
            }}
          >
            <span className="btn-icon">+</span>
            <span>New Neural Session</span>
          </button>

          {/* Prompt Presets */}
          <div className="sidebar-section">
            <span className="sidebar-heading">🔬 Quick Diagnostic Presets</span>
            <div className="presets-list">
              {presets.map((p) => (
                <button
                  key={p.label}
                  className="preset-pill-btn"
                  onClick={() => handleSend(p.prompt)}
                  disabled={loading}
                >
                  <span className="preset-icon">&#10148;</span>
                  <span className="preset-label">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Model Inference Parameters */}
          <div className="sidebar-section">
            <span className="sidebar-heading">⚙️ Hyperparameter Controls</span>

            <div className="setting-card">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={concise}
                  onChange={(e) => setConcise(e.target.checked)}
                />
                <div className="toggle-text">
                  <span className="toggle-title">⚡ Fast Mode (CPU Optimized)</span>
                  <span className="toggle-desc">Answers in 1-2 direct sentences for rapid activation capture</span>
                </div>
              </label>
            </div>

            <div className="slider-card">
              <div className="slider-label-row">
                <span>Temperature</span>
                <span className="font-mono">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="slider-range"
              />
            </div>

            <div className="slider-card">
              <div className="slider-label-row">
                <span>Max New Tokens</span>
                <span className="font-mono">{maxTokens}</span>
              </div>
              <input
                type="range"
                min={5}
                max={128}
                step={5}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="slider-range"
              />
            </div>

            <div className="slider-card">
              <div className="slider-label-row">
                <span>Top-P (Nucleus)</span>
                <span className="font-mono">{topP.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="slider-range"
              />
            </div>

            <div className="slider-card">
              <div className="slider-label-row">
                <span>Top-K Sampling</span>
                <span className="font-mono">{topK}</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="slider-range"
              />
            </div>
          </div>

          {/* Model Card Info */}
          <div className="sidebar-section info-card">
            <span className="sidebar-heading">Architecture Metadata</span>
            <div className="arch-specs-list font-mono">
              <div className="spec-row">
                <span>Model:</span>
                <span className="spec-val">Qwen2.5-0.5B</span>
              </div>
              <div className="spec-row">
                <span>Layers:</span>
                <span className="spec-val">{modelInfo?.num_layers ?? 24} Blocks</span>
              </div>
              <div className="spec-row">
                <span>Attention:</span>
                <span className="spec-val">{modelInfo?.num_heads ?? 14} Heads (GQA)</span>
              </div>
              <div className="spec-row">
                <span>Hidden Dim:</span>
                <span className="spec-val">{modelInfo?.hidden_size ?? 896}</span>
              </div>
              <div className="spec-row">
                <span>Vocab Size:</span>
                <span className="spec-val">{modelInfo?.vocab_size ?? 151936}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Center Area: Split between Conversation & Diagnostics */}
        <main className="main-stage">
          {/* Top Stage: Active Visualizations Explorer */}
          <div className="stage-visualizations-pane">
            <ModelInspector
              visualizations={activeMessage?.visualizations}
              prompt={messages.find((m) => m.role === 'user')?.content || ''}
              numLayers={modelInfo?.num_layers ?? 24}
              numHeads={modelInfo?.num_heads ?? 14}
            />
          </div>

          {/* Bottom Stage: Chat Stream and Diagnostic Log */}
          <div className="stage-chat-pane">
            <div className="chat-messages-scroll">
              {messages.length === 0 ? (
                <div className="empty-chat-welcome">
                  <div className="welcome-icon">&#10024;</div>
                  <h3>Welcome to LLM X-Ray</h3>
                  <p>
                    Enter a prompt or choose a diagnostic preset from the sidebar to visualize
                    attention head matrices, 2D embedding PCA representations, and next-token prediction logits.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble-row ${msg.role} ${activeMessageId === msg.id ? 'active-inspected' : ''}`}
                    onClick={() => {
                      if (msg.visualizations) setActiveMessageId(msg.id);
                    }}
                  >
                    <div className="bubble-avatar">
                      {msg.role === 'user' ? '👤' : '⚛️'}
                    </div>
                    <div className="bubble-content-card">
                      <div className="bubble-header">
                        <span className="bubble-author">
                          {msg.role === 'user' ? 'Prompt Input' : 'Qwen2.5-0.5B Inference'}
                        </span>
                        <span className="bubble-timestamp">{msg.timestamp}</span>
                        {msg.visualizations && (
                          <span className="bubble-inspect-tag">
                            {activeMessageId === msg.id ? '● Inspected' : 'Click to inspect'}
                          </span>
                        )}
                      </div>
                      <div className="bubble-text">{msg.content}</div>
                      {msg.metrics && (
                        <div className="bubble-telemetry-pill font-mono">
                          <span>⚡ {msg.metrics.total_latency_ms} ms</span>
                          <span>&bull;</span>
                          <span>{msg.metrics.tokens_per_second} tok/s</span>
                          <span>&bull;</span>
                          <span>{msg.metrics.prompt_tokens} in / {msg.metrics.generated_tokens} out</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="chat-bubble-row assistant loading-bubble">
                  <div className="bubble-avatar rotating">⚛️</div>
                  <div className="bubble-content-card loading-card">
                    <div className="loading-shimmer">
                      <span>Probing transformer layers, attention heads & generating response...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt Input Field */}
            <div className="chat-input-bar">
              <div className="input-box-wrapper">
                <input
                  type="text"
                  className="prompt-input-field"
                  placeholder="Enter a prompt to inspect internal neural activations (e.g. 'The capital of France is')..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading}
                />
                <button
                  className="btn-send-prompt"
                  onClick={() => handleSend()}
                  disabled={!prompt.trim() || loading}
                  id="btn-send"
                >
                  {loading ? (
                    <span className="loader-dot">&#9679;</span>
                  ) : (
                    <span>Inspect &rarr;</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
