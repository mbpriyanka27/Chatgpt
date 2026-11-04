'use client';

import React, { useState, useMemo } from 'react';

export interface LogitCandidate {
  rank: number;
  token_id: number;
  token: string;
  display?: string;
  probability: number;
  logit: number;
  cumulative_prob?: number;
}

interface Props {
  initialCandidates?: LogitCandidate[];
}

export default function LogitsBarChart({ initialCandidates = [] }: Props) {
  const [candidates, setCandidates] = useState<LogitCandidate[]>(initialCandidates);
  const [temperature, setTemperature] = useState<number>(1.0);

  // Sync if initialCandidates update
  React.useEffect(() => {
    if (initialCandidates && initialCandidates.length > 0) {
      setCandidates(initialCandidates);
    }
  }, [initialCandidates]);

  // Client-side dynamic softmax recalculation with temperature
  const adjustedCandidates = useMemo(() => {
    if (!candidates || candidates.length === 0) return [];

    const temp = Math.max(0.05, temperature);
    // Extract raw logits
    const logits = candidates.map((c) => c.logit);
    const maxL = Math.max(...logits);
    const exps = logits.map((l) => Math.exp((l - maxL) / temp));
    const sumExp = exps.reduce((a, b) => a + b, 0);

    let cum = 0;
    return candidates.map((c, i) => {
      const p = exps[i] / sumExp;
      cum += p;
      return {
        ...c,
        probability: p,
        cumulative_prob: cum,
      };
    });
  }, [candidates, temperature]);

  const topCandidate = adjustedCandidates[0];

  return (
    <div className="logits-container" id="logits-inspector">
      {/* Top Header */}
      <div className="logits-header">
        <div className="logits-title-group">
          <span className="badge-glow amber">PREDICTION HEAD &bull; LOGITS</span>
          <h3 className="logits-title">Next-Token Probability Distribution</h3>
        </div>

        {/* Temperature Simulator */}
        <div className="temp-simulator-box">
          <div className="temp-label-row">
            <span className="control-label">🌡️ Interactive Temperature:</span>
            <span className="control-val font-mono">{temperature.toFixed(2)}</span>
          </div>
          <div className="temp-slider-row">
            <span className="temp-min">0.1 (Greedy)</span>
            <input
              type="range"
              min={0.1}
              max={2.5}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="slider-range temp-slider"
            />
            <span className="temp-max">2.5 (High Entropy)</span>
          </div>
        </div>
      </div>

      {/* Top Prediction Banner */}
      {topCandidate && (
        <div className="top-prediction-banner">
          <div className="top-token-left">
            <span className="rank-badge top">#1 Top Predicted Token</span>
            <h2 className="top-token-name font-mono">
              &ldquo;{topCandidate.token}&rdquo;
            </h2>
            <span className="token-id-tag">Token ID: {topCandidate.token_id}</span>
          </div>
          <div className="top-token-right">
            <div className="prob-big">{(topCandidate.probability * 100).toFixed(1)}%</div>
            <div className="logit-sub">Raw Logit: {topCandidate.logit.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Probability Bars Table */}
      <div className="logits-bars-list">
        {adjustedCandidates.map((item, idx) => {
          const percent = (item.probability * 100).toFixed(2);
          const barWidth = Math.max(1, Math.min(100, item.probability * 100));

          return (
            <div key={item.token_id || idx} className="logit-bar-row">
              <div className="logit-meta">
                <span className={`rank-pill ${item.rank === 1 ? 'rank-1' : ''}`}>
                  #{item.rank}
                </span>
                <span className="token-chip font-mono">
                  {item.display || item.token.replace(/ /g, '␣')}
                </span>
                <span className="id-sub">ID: {item.token_id}</span>
              </div>

              <div className="bar-track">
                <div
                  className={`bar-fill ${item.rank === 1 ? 'gold-glow' : ''}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="prob-stats font-mono">
                <span className="prob-value">{percent}%</span>
                <span className="logit-value">logit: {item.logit.toFixed(1)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="logits-footer-note">
        <span>💡 Adjusting the temperature slider interactively scales the softmax denominator $T$, demonstrating probability sharpening ($T \to 0$) vs entropy dispersion ($T \gg 1$).</span>
      </div>
    </div>
  );
}
