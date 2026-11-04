'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

export interface AttentionData {
  layer: number;
  head: number;
  head_label: string;
  is_average: boolean;
  num_layers?: number;
  num_heads?: number;
  tokens: string[];
  tokens_meta?: Array<{
    index: number;
    id: number;
    raw: string;
    display: string;
  }>;
  matrix: number[][];
  metrics?: {
    self_attention_ratio: number;
    average_entropy: number;
    max_attended_pair: {
      query_idx: number;
      key_idx: number;
      query_token: string;
      key_token: string;
      weight: number;
    };
  };
}

interface Props {
  initialData?: AttentionData;
  numLayers?: number;
  numHeads?: number;
}

export default function AttentionHeatmap({
  initialData,
  numLayers = 24,
  numHeads = 14
}: Props) {
  const [data, setData] = useState<AttentionData | null>(initialData || null);
  const [currentLayer, setCurrentLayer] = useState<number>(initialData?.layer ?? 0);
  const [currentHead, setCurrentHead] = useState<number>(initialData?.head ?? 0);
  const [isAverage, setIsAverage] = useState<boolean>(initialData?.is_average ?? false);
  const [loading, setLoading] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedTokenIdx, setSelectedTokenIdx] = useState<number | null>(null);
  const [colorTheme, setColorTheme] = useState<'cyan' | 'emerald' | 'amber' | 'purple'>('emerald');

  // Update if initialData changes from parent
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setCurrentLayer(initialData.layer);
      setCurrentHead(initialData.head);
      setIsAverage(initialData.is_average);
    }
  }, [initialData]);

  // Fetch updated attention matrix when layer or head changes
  const fetchAttention = useCallback(async (layer: number, head: number) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/attention?layer=${layer}&head=${head}`);
      if (!res.ok) throw new Error('Failed to load attention');
      const json: AttentionData = await res.json();
      setData(json);
      setCurrentLayer(json.layer);
      setCurrentHead(json.head);
      setIsAverage(json.is_average);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLayerChange = (layer: number) => {
    setCurrentLayer(layer);
    fetchAttention(layer, isAverage ? -1 : currentHead);
  };

  const handleHeadChange = (head: number) => {
    setIsAverage(false);
    setCurrentHead(head);
    fetchAttention(currentLayer, head);
  };

  const handleAverageToggle = () => {
    const nextAvg = !isAverage;
    setIsAverage(nextAvg);
    fetchAttention(currentLayer, nextAvg ? -1 : currentHead);
  };

  // Color interpolation helper
  const getCellColor = (val: number) => {
    // val is 0.0 to 1.0
    const clamped = Math.max(0, Math.min(1, val));
    if (clamped < 0.01) return 'rgba(255, 255, 255, 0.02)';

    switch (colorTheme) {
      case 'cyan':
        return `rgba(6, 182, 212, ${0.15 + clamped * 0.85})`;
      case 'amber':
        return `rgba(245, 158, 11, ${0.15 + clamped * 0.85})`;
      case 'purple':
        return `rgba(168, 85, 247, ${0.15 + clamped * 0.85})`;
      case 'emerald':
      default:
        return `rgba(16, 185, 129, ${0.15 + clamped * 0.85})`;
    }
  };

  const tokens = data?.tokens || [];
  const matrix = data?.matrix || [];
  const metrics = data?.metrics;

  const hoveredWeight = hoveredCell && matrix[hoveredCell.row] && matrix[hoveredCell.row][hoveredCell.col] !== undefined
    ? matrix[hoveredCell.row][hoveredCell.col]
    : null;

  return (
    <div className="attention-container" id="attention-inspector">
      {/* Top Controls Header */}
      <div className="attn-header">
        <div className="attn-title-row">
          <div className="attn-title-group">
            <span className="badge-glow">ATTENTION MAP</span>
            <h3 className="attn-title">
              Layer {currentLayer} &bull; {isAverage ? 'All Heads (Mean Average)' : `Head ${currentHead}`}
            </h3>
          </div>

          {/* Quick jump pills */}
          <div className="quick-jump-group">
            <span className="control-label">Quick Jump:</span>
            {[
              { label: 'Input (L0)', layer: 0 },
              { label: 'L6', layer: Math.min(6, numLayers - 1) },
              { label: 'Mid (L12)', layer: Math.min(12, numLayers - 1) },
              { label: 'L18', layer: Math.min(18, numLayers - 1) },
              { label: `Output (L${numLayers - 1})`, layer: numLayers - 1 },
            ].map((jump) => (
              <button
                key={jump.label}
                className={`jump-pill ${currentLayer === jump.layer ? 'active' : ''}`}
                onClick={() => handleLayerChange(jump.layer)}
              >
                {jump.label}
              </button>
            ))}
          </div>

          {/* Color theme switcher */}
          <div className="theme-switcher">
            {(['emerald', 'cyan', 'amber', 'purple'] as const).map((t) => (
              <button
                key={t}
                className={`theme-dot ${t} ${colorTheme === t ? 'selected' : ''}`}
                onClick={() => setColorTheme(t)}
                title={`Theme: ${t}`}
              />
            ))}
          </div>
        </div>

        {/* Sliders and Head Selectors */}
        <div className="controls-panel">
          {/* Layer Slider */}
          <div className="control-block">
            <div className="control-label-row">
              <span className="control-label">Transformer Layer:</span>
              <span className="control-val">{currentLayer} / {numLayers - 1}</span>
            </div>
            <input
              type="range"
              min={0}
              max={numLayers - 1}
              value={currentLayer}
              onChange={(e) => handleLayerChange(parseInt(e.target.value))}
              className="slider-range"
            />
          </div>

          {/* Attention Head Selector */}
          <div className="control-block full-width">
            <div className="control-label-row">
              <span className="control-label">Attention Head:</span>
              <button
                className={`btn-all-heads ${isAverage ? 'active' : ''}`}
                onClick={handleAverageToggle}
              >
                ⚡ Average All Heads
              </button>
            </div>
            <div className="head-pills-row">
              {Array.from({ length: numHeads }).map((_, idx) => (
                <button
                  key={idx}
                  className={`head-pill ${!isAverage && currentHead === idx ? 'active' : ''}`}
                  onClick={() => handleHeadChange(idx)}
                >
                  H{idx}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnostic Metrics HUD */}
        {metrics && (
          <div className="attn-metrics-bar">
            <div className="metric-item">
              <span className="metric-label">Entropy (Dispersion):</span>
              <span className="metric-val">{metrics.average_entropy} bits</span>
              <span className="metric-sub">
                {metrics.average_entropy < 1.5 ? '🎯 Sharp / Focused' : '🌊 Diffuse / Broad'}
              </span>
            </div>

            <div className="metric-item">
              <span className="metric-label">Self-Attention Ratio:</span>
              <span className="metric-val">{(metrics.self_attention_ratio * 100).toFixed(1)}%</span>
              <span className="metric-sub">Diagonal persistence</span>
            </div>

            {metrics.max_attended_pair && (
              <div className="metric-item highlight">
                <span className="metric-label">Peak Cross-Attention:</span>
                <span className="metric-val font-mono">
                  &ldquo;{metrics.max_attended_pair.query_token.trim() || '␣'}&rdquo; &rarr; &ldquo;{metrics.max_attended_pair.key_token.trim() || '␣'}&rdquo;
                </span>
                <span className="metric-sub">
                  {(metrics.max_attended_pair.weight * 100).toFixed(1)}% weight
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Heatmap Matrix */}
      <div className="heatmap-viewport">
        {loading && (
          <div className="heatmap-overlay-loading">
            <div className="spinner-glow" />
            <span>Updating attention matrix...</span>
          </div>
        )}

        {matrix.length > 0 ? (
          <div className="heatmap-scroll-area">
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th className="heatmap-corner">
                    <span className="axis-legend">Query &darr; | Key &rarr;</span>
                  </th>
                  {tokens.map((tok, colIdx) => (
                    <th
                      key={colIdx}
                      className={`key-token-header ${hoveredCell?.col === colIdx ? 'highlight-col' : ''}`}
                    >
                      <div className="token-vertical">
                        <span className="token-index">#{colIdx}</span>
                        <span className="token-text">{tok.replace(/ /g, '␣')}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className={`query-token-header ${hoveredCell?.row === rowIdx ? 'highlight-row' : ''}`}>
                      <div className="token-horizontal">
                        <span className="token-index">#{rowIdx}</span>
                        <span className="token-text">{tokens[rowIdx]?.replace(/ /g, '␣')}</span>
                      </div>
                    </td>
                    {row.map((val, colIdx) => {
                      const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;
                      const isRowMatch = hoveredCell?.row === rowIdx;
                      const isColMatch = hoveredCell?.col === colIdx;
                      const isDiagonal = rowIdx === colIdx;

                      return (
                        <td
                          key={colIdx}
                          className={`heatmap-cell ${isHovered ? 'hovered' : ''} ${isRowMatch ? 'row-active' : ''} ${isColMatch ? 'col-active' : ''} ${isDiagonal ? 'diagonal' : ''}`}
                          style={{
                            backgroundColor: getCellColor(val),
                          }}
                          onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => setSelectedTokenIdx(rowIdx)}
                        >
                          {matrix.length <= 16 && (
                            <span className="cell-text">
                              {val >= 0.1 ? (val * 100).toFixed(0) : ''}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-heatmap">No attention matrix available.</div>
        )}
      </div>

      {/* Hover Inspection Drawer */}
      <div className="attn-inspection-footer">
        {hoveredCell && hoveredWeight !== null ? (
          <div className="cell-inspector-card">
            <div className="inspect-item">
              <span className="inspect-label">Query Token:</span>
              <span className="inspect-token">#{hoveredCell.row} &ldquo;{tokens[hoveredCell.row] || ''}&rdquo;</span>
            </div>
            <span className="inspect-arrow">&rarr; attends to &rarr;</span>
            <div className="inspect-item">
              <span className="inspect-label">Key Token:</span>
              <span className="inspect-token">#{hoveredCell.col} &ldquo;{tokens[hoveredCell.col] || ''}&rdquo;</span>
            </div>
            <div className="inspect-weight-badge">
              <span className="weight-percent">{(hoveredWeight * 100).toFixed(2)}%</span>
              <span className="weight-raw">raw: {hoveredWeight.toFixed(4)}</span>
            </div>
          </div>
        ) : (
          <div className="inspector-placeholder">
            Hover over any attention cell to inspect exact query-key weights and cross-token attention dynamics.
          </div>
        )}
      </div>
    </div>
  );
}
