'use client';

import React, { useState } from 'react';
import AttentionHeatmap, { AttentionData } from './AttentionHeatmap';
import EmbeddingScatter, { Point2D } from './EmbeddingScatter';
import LogitsBarChart, { LogitCandidate } from './LogitsBarChart';
import TokenChips, { TokenMeta } from './TokenChips';
import GenerationTimeline, { GenerationStep } from './GenerationTimeline';

export interface VisualizationsPayload {
  Tokens?: {
    tokens: string[];
    input_ids: number[];
    tokens_meta?: TokenMeta[];
    total_tokens?: number;
  };
  Embeddings?: {
    dimension: number;
    var_pc1?: number;
    var_pc2?: number;
    points: Point2D[];
  };
  Attention?: AttentionData;
  Layers?: {
    layer: number;
    num_layers: number;
    var_pc1: number;
    var_pc2: number;
    layer_drift?: number | null;
    points: Point2D[];
  };
  Logits?: LogitCandidate[];
  Generation?: {
    prompt: string;
    total_generated: number;
    steps: GenerationStep[];
    final_response: string;
  };
}

interface Props {
  visualizations?: VisualizationsPayload;
  prompt?: string;
  numLayers?: number;
  numHeads?: number;
}

export default function ModelInspector({
  visualizations,
  prompt = '',
  numLayers = 24,
  numHeads = 14
}: Props) {
  const [activeTab, setActiveTab] = useState<'attention' | 'latent' | 'logits' | 'tokens' | 'generation'>('attention');

  if (!visualizations) {
    return (
      <div className="inspector-empty-state">
        <div className="empty-icon-ring">⚛</div>
        <h4>Neural State Inspector Standing By</h4>
        <p>Submit a prompt or select a preset to analyze transformer internals.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'attention', label: '🔥 Attention Heatmaps', badge: 'Interactive' },
    { id: 'latent', label: '🌌 2D Latent Space', badge: 'Layer Scrub' },
    { id: 'logits', label: '📊 Next-Token Logits', badge: 'Temp Sim' },
    { id: 'tokens', label: '🔤 Token Anatomy', badge: `${visualizations.Tokens?.tokens?.length || 0} Tok` },
    { id: 'generation', label: '⏱️ Generation Trace', badge: `${visualizations.Generation?.steps?.length || 0} Steps` },
  ] as const;

  return (
    <div className="model-inspector-container">
      {/* Visual Navigation Tabs */}
      <div className="inspector-nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`inspector-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
            <span className="tab-pill">{tab.badge}</span>
          </button>
        ))}
      </div>

      {/* Tab Panes */}
      <div className="inspector-tab-viewport">
        {activeTab === 'attention' && (
          <AttentionHeatmap
            initialData={visualizations.Attention}
            numLayers={numLayers}
            numHeads={numHeads}
          />
        )}

        {activeTab === 'latent' && (
          <EmbeddingScatter
            initialData={visualizations.Embeddings}
            totalLayers={numLayers + 1}
          />
        )}

        {activeTab === 'logits' && (
          <LogitsBarChart
            initialCandidates={visualizations.Logits}
          />
        )}

        {activeTab === 'tokens' && (
          <TokenChips
            tokens={visualizations.Tokens?.tokens}
            inputIds={visualizations.Tokens?.input_ids}
            tokensMeta={visualizations.Tokens?.tokens_meta}
          />
        )}

        {activeTab === 'generation' && (
          <GenerationTimeline
            prompt={prompt}
            steps={visualizations.Generation?.steps}
            finalResponse={visualizations.Generation?.final_response}
          />
        )}
      </div>
    </div>
  );
}
