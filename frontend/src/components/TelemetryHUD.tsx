'use client';

import React from 'react';

export interface ModelMetrics {
  total_latency_ms?: number;
  generation_latency_ms?: number;
  forward_latency_ms?: number;
  prompt_tokens?: number;
  generated_tokens?: number;
  tokens_per_second?: number;
}

export interface ModelInfo {
  loaded?: boolean;
  model_name?: string;
  model_type?: string;
  num_layers?: number;
  num_heads?: number;
  num_kv_heads?: number;
  hidden_size?: number;
  vocab_size?: number;
  device?: string;
}

interface Props {
  metrics?: ModelMetrics;
  info?: ModelInfo;
}

export default function TelemetryHUD({ metrics, info }: Props) {
  return (
    <div className="telemetry-bar">
      {/* Model Spec */}
      <div className="hud-badge-group">
        <div className="hud-status-indicator">
          <span className="pulse-dot" />
          <span className="hud-status-text">ONLINE</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">MODEL:</span>
          <span className="hud-val font-mono">{info?.model_name || 'Qwen2.5-0.5B-Instruct'}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">DEVICE:</span>
          <span className="hud-pill font-mono">{info?.device?.toUpperCase() || 'CPU'}</span>
        </div>
      </div>

      {/* Architecture Specs */}
      <div className="hud-arch-group">
        <div className="hud-mini-stat">
          <span className="hud-label">LAYERS:</span>
          <span className="hud-val font-mono">{info?.num_layers ?? 24}</span>
        </div>
        <div className="hud-mini-stat">
          <span className="hud-label">HEADS:</span>
          <span className="hud-val font-mono">{info?.num_heads ?? 14}</span>
        </div>
        <div className="hud-mini-stat">
          <span className="hud-label">D_MODEL:</span>
          <span className="hud-val font-mono">{info?.hidden_size ?? 896}</span>
        </div>
      </div>

      {/* Real-time Inference Telemetry */}
      {metrics && (
        <div className="hud-telemetry-group">
          {metrics.tokens_per_second !== undefined && (
            <div className="hud-metric highlight">
              <span className="hud-metric-val font-mono">{metrics.tokens_per_second}</span>
              <span className="hud-metric-label">tok/sec</span>
            </div>
          )}
          {metrics.total_latency_ms !== undefined && (
            <div className="hud-metric">
              <span className="hud-metric-val font-mono">{metrics.total_latency_ms}</span>
              <span className="hud-metric-label">ms total</span>
            </div>
          )}
          {metrics.generated_tokens !== undefined && (
            <div className="hud-metric">
              <span className="hud-metric-val font-mono">{metrics.generated_tokens}</span>
              <span className="hud-metric-label">gen tokens</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
