'use client';

import React, { useState } from 'react';

export interface TokenMeta {
  index: number;
  id: number;
  raw: string;
  display: string;
  length: number;
  is_whitespace?: boolean;
}

interface Props {
  tokens?: string[];
  inputIds?: number[];
  tokensMeta?: TokenMeta[];
}

export default function TokenChips({
  tokens = [],
  inputIds = [],
  tokensMeta = []
}: Props) {
  const [selectedToken, setSelectedToken] = useState<TokenMeta | null>(
    tokensMeta[0] || (tokens.length > 0 ? {
      index: 0,
      id: inputIds[0] ?? 0,
      raw: tokens[0],
      display: tokens[0].replace(/ /g, '␣'),
      length: tokens[0].length
    } : null)
  );

  const totalTokens = tokens.length;
  const totalChars = tokens.join('').length;
  const avgCharsPerToken = totalTokens > 0 ? (totalChars / totalTokens).toFixed(2) : '0';

  // Palette generator for distinct token chips
  const getChipStyle = (idx: number) => {
    const colors = [
      'rgba(16, 185, 129, 0.15)', // emerald
      'rgba(6, 182, 212, 0.15)',  // cyan
      'rgba(139, 92, 246, 0.15)', // purple
      'rgba(245, 158, 11, 0.15)', // amber
      'rgba(236, 72, 153, 0.15)', // pink
      'rgba(59, 130, 246, 0.15)', // blue
    ];
    const borders = [
      'rgba(16, 185, 129, 0.4)',
      'rgba(6, 182, 212, 0.4)',
      'rgba(139, 92, 246, 0.4)',
      'rgba(245, 158, 11, 0.4)',
      'rgba(236, 72, 153, 0.4)',
      'rgba(59, 130, 246, 0.4)',
    ];
    const colorIndex = idx % colors.length;
    return {
      backgroundColor: colors[colorIndex],
      borderColor: borders[colorIndex],
    };
  };

  return (
    <div className="tokens-container" id="token-inspector">
      <div className="tokens-header">
        <div className="tokens-title-group">
          <span className="badge-glow emerald">TOKENIZATION ENGINE</span>
          <h3 className="tokens-title">Subword Chunking & Vocabulary Encoding</h3>
        </div>

        {/* Stats Pills */}
        <div className="tokens-stats-row">
          <div className="stat-pill">
            <span className="stat-pill-label">Total Tokens:</span>
            <span className="stat-pill-val">{totalTokens}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">Total Characters:</span>
            <span className="stat-pill-val">{totalChars}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">Compression:</span>
            <span className="stat-pill-val">{avgCharsPerToken} char/tok</span>
          </div>
        </div>
      </div>

      {/* Token Flow Visualizer */}
      <div className="tokens-chip-grid">
        {tokens.map((tok, idx) => {
          const meta = tokensMeta[idx] || {
            index: idx,
            id: inputIds[idx] ?? 0,
            raw: tok,
            display: tok.replace(/ /g, '␣'),
            length: tok.length
          };
          const isSelected = selectedToken?.index === idx;

          return (
            <button
              key={idx}
              className={`token-chip-btn ${isSelected ? 'selected' : ''}`}
              style={getChipStyle(idx)}
              onClick={() => setSelectedToken(meta)}
            >
              <span className="chip-index">#{idx}</span>
              <span className="chip-text font-mono">{meta.display}</span>
              <span className="chip-id font-mono">id:{meta.id}</span>
            </button>
          );
        })}
      </div>

      {/* Token Detail Card */}
      <div className="tokens-detail-card">
        {selectedToken ? (
          <div className="token-meta-layout">
            <div className="meta-left">
              <span className="detail-tag">TOKEN #{selectedToken.index}</span>
              <h2 className="detail-raw font-mono">
                &ldquo;{selectedToken.raw}&rdquo;
              </h2>
              <span className="detail-display font-mono">
                Visual form: <code>{selectedToken.display}</code>
              </span>
            </div>
            <div className="meta-right">
              <div className="meta-item">
                <span className="meta-label">Vocabulary Token ID</span>
                <span className="meta-val font-mono"><strong>{selectedToken.id}</strong></span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Character Length</span>
                <span className="meta-val font-mono">{selectedToken.length} chars</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Encoding</span>
                <span className="meta-val font-mono">UTF-8 BPE</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="inspector-placeholder">
            Click on any token chip above to view its token ID, UTF-8 byte boundary, and position index.
          </div>
        )}
      </div>
    </div>
  );
}
