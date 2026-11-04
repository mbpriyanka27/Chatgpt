'use client';

import React, { useState, useEffect, useMemo } from 'react';

export interface Point2D {
  index: number;
  token: string;
  display?: string;
  x: number;
  y: number;
  norm: number;
}

export interface LayerStateData {
  layer: number;
  num_layers: number;
  var_pc1: number;
  var_pc2: number;
  layer_drift?: number | null;
  points: Point2D[];
}

interface Props {
  initialData?: {
    points: Point2D[];
    dimension?: number;
    var_pc1?: number;
    var_pc2?: number;
  };
  totalLayers?: number;
}

export default function EmbeddingScatter({
  initialData,
  totalLayers = 25
}: Props) {
  const [selectedLayer, setSelectedLayer] = useState<number>(0);
  const [points, setPoints] = useState<Point2D[]>(initialData?.points || []);
  const [varPc1, setVarPc1] = useState<number>(initialData?.var_pc1 ?? 0.45);
  const [varPc2, setVarPc2] = useState<number>(initialData?.var_pc2 ?? 0.28);
  const [layerDrift, setLayerDrift] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<Point2D | null>(null);
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true);

  // Sync initialData
  useEffect(() => {
    if (initialData?.points) {
      setPoints(initialData.points);
      if (initialData.var_pc1) setVarPc1(initialData.var_pc1);
      if (initialData.var_pc2) setVarPc2(initialData.var_pc2);
    }
  }, [initialData]);

  // Fetch layer hidden state
  const handleLayerChange = async (layer: number) => {
    setSelectedLayer(layer);
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/layer-state?layer=${layer}`);
      if (!res.ok) throw new Error('Failed to load layer state');
      const data: LayerStateData = await res.json();
      setPoints(data.points || []);
      setVarPc1(data.var_pc1);
      setVarPc2(data.var_pc2);
      setLayerDrift(data.layer_drift ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate SVG ViewBox and scaling
  const { minX, maxX, minY, maxY, svgPoints } = useMemo(() => {
    if (points.length === 0) {
      return { minX: -1, maxX: 1, minY: -1, maxY: 1, svgPoints: [] };
    }

    let min_x = Infinity, max_x = -Infinity;
    let min_y = Infinity, max_y = -Infinity;

    points.forEach((p) => {
      if (p.x < min_x) min_x = p.x;
      if (p.x > max_x) max_x = p.x;
      if (p.y < min_y) min_y = p.y;
      if (p.y > max_y) max_y = p.y;
    });

    // Provide margin
    const rangeX = Math.max(0.1, max_x - min_x);
    const rangeY = Math.max(0.1, max_y - min_y);
    const padX = rangeX * 0.15;
    const padY = rangeY * 0.15;

    const bMinX = min_x - padX;
    const bMaxX = max_x + padX;
    const bMinY = min_y - padY;
    const bMaxY = max_y + padY;

    // Map to SVG coordinates (width: 600, height: 400)
    const width = 600;
    const height = 400;

    const mapped = points.map((p) => {
      const sx = ((p.x - bMinX) / (bMaxX - bMinX)) * width;
      // Invert Y for SVG coordinates
      const sy = height - ((p.y - bMinY) / (bMaxY - bMinY)) * height;
      return {
        ...p,
        sx,
        sy,
      };
    });

    return { minX: bMinX, maxX: bMaxX, minY: bMinY, maxY: bMaxY, svgPoints: mapped };
  }, [points]);

  return (
    <div className="scatter-container" id="latent-space-inspector">
      {/* Header and Controls */}
      <div className="scatter-header">
        <div className="scatter-title-group">
          <span className="badge-glow purple">LATENT REPRESENTATION (PCA)</span>
          <h3 className="scatter-title">
            {selectedLayer === 0
              ? 'Layer 0: Static Input Embedding Space'
              : `Layer ${selectedLayer}: Contextual Representation Evolution`}
          </h3>
        </div>

        {/* Diagnostic Badges */}
        <div className="scatter-badges">
          <div className="stat-pill">
            <span className="stat-pill-label">PC1 Var:</span>
            <span className="stat-pill-val">{(varPc1 * 100).toFixed(1)}%</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">PC2 Var:</span>
            <span className="stat-pill-val">{(varPc2 * 100).toFixed(1)}%</span>
          </div>
          {layerDrift !== null && (
            <div className="stat-pill highlight">
              <span className="stat-pill-label">Drift from L{selectedLayer - 1}:</span>
              <span className="stat-pill-val font-mono">{layerDrift.toFixed(3)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Layer Evolution Scrubber */}
      <div className="layer-scrubber-bar">
        <div className="scrubber-label-row">
          <span className="control-label">
            🔬 Scrub Transformer Layer (Observe Semantic Drift):
          </span>
          <span className="control-val">
            Layer {selectedLayer} / {totalLayers - 1}
          </span>
        </div>
        <div className="scrubber-input-row">
          <button
            className="btn-step"
            onClick={() => handleLayerChange(Math.max(0, selectedLayer - 1))}
            disabled={selectedLayer <= 0 || loading}
          >
            &larr; Prev Layer
          </button>
          <input
            type="range"
            min={0}
            max={totalLayers - 1}
            value={selectedLayer}
            onChange={(e) => handleLayerChange(parseInt(e.target.value))}
            className="slider-range layer-slider"
          />
          <button
            className="btn-step"
            onClick={() => handleLayerChange(Math.min(totalLayers - 1, selectedLayer + 1))}
            disabled={selectedLayer >= totalLayers - 1 || loading}
          >
            Next Layer &rarr;
          </button>
          <label className="toggle-trajectory">
            <input
              type="checkbox"
              checked={showTrajectory}
              onChange={(e) => setShowTrajectory(e.target.checked)}
            />
            <span>Connect Token Flow</span>
          </label>
        </div>
      </div>

      {/* Interactive 2D Canvas */}
      <div className="svg-plot-wrapper">
        {loading && (
          <div className="heatmap-overlay-loading">
            <div className="spinner-glow purple" />
            <span>Projecting representations through Layer {selectedLayer}...</span>
          </div>
        )}

        <svg
          viewBox="0 0 600 400"
          className="pca-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="trajGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="200" x2="600" y2="200" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
          <line x1="300" y1="0" x2="300" y2="400" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />

          {/* Axis Labels */}
          <text x="580" y="215" fill="var(--text-secondary)" fontSize="10" textAnchor="end">
            PC 1 &rarr;
          </text>
          <text x="310" y="20" fill="var(--text-secondary)" fontSize="10">
            &uarr; PC 2
          </text>

          {/* Trajectory lines connecting tokens */}
          {showTrajectory && svgPoints.length > 1 && (
            <polyline
              fill="none"
              stroke="url(#trajGradient)"
              strokeWidth="2"
              strokeDasharray="3 3"
              points={svgPoints.map((p) => `${p.sx},${p.sy}`).join(' ')}
            />
          )}

          {/* Token Points */}
          {svgPoints.map((p, idx) => {
            const isHovered = hoveredPoint?.index === p.index;
            return (
              <g
                key={p.index}
                className="token-node-group"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle cx={p.sx} cy={p.sy} r="18" fill="url(#nodeGlow)" />
                )}

                {/* Point dot */}
                <circle
                  cx={p.sx}
                  cy={p.sy}
                  r={isHovered ? 7 : 5}
                  fill={isHovered ? '#06b6d4' : '#8b5cf6'}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 1}
                  className="token-circle"
                />

                {/* Token label */}
                <text
                  x={p.sx}
                  y={p.sy - 10}
                  fill={isHovered ? '#38bdf8' : '#e2e8f0'}
                  fontSize={isHovered ? '12' : '10'}
                  fontWeight={isHovered ? '700' : '500'}
                  textAnchor="middle"
                  className="token-svg-label"
                >
                  {p.display || p.token.replace(/ /g, '␣')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Point Detail Tooltip / Card */}
      <div className="scatter-footer">
        {hoveredPoint ? (
          <div className="point-card">
            <div className="point-meta">
              <span className="point-badge">Token #{hoveredPoint.index}</span>
              <span className="point-text font-mono">&ldquo;{hoveredPoint.token}&rdquo;</span>
            </div>
            <div className="point-coords">
              <span>Coordinates: <strong>({hoveredPoint.x.toFixed(3)}, {hoveredPoint.y.toFixed(3)})</strong></span>
              <span>Vector Norm: <strong>{hoveredPoint.norm.toFixed(2)}</strong></span>
            </div>
          </div>
        ) : (
          <div className="inspector-placeholder">
            Hover over any token node in 2D space to inspect its coordinates and representation norm at Layer {selectedLayer}.
          </div>
        )}
      </div>
    </div>
  );
}
