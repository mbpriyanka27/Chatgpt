'use client';

import React, { useState, useEffect } from 'react';

export interface GenerationStep {
  step: number;
  token_id: number;
  token: string;
  display?: string;
  cumulative: string;
}

interface Props {
  prompt?: string;
  steps?: GenerationStep[];
  finalResponse?: string;
}

export default function GenerationTimeline({
  prompt = '',
  steps = [],
  finalResponse = ''
}: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(
    steps.length > 0 ? steps.length - 1 : 0
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Sync with new steps
  useEffect(() => {
    if (steps.length > 0) {
      setCurrentStepIndex(steps.length - 1);
    }
  }, [steps]);

  // Autoplay effect
  useEffect(() => {
    if (!isPlaying) return;

    if (currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => prev + 1);
    }, 250);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps.length]);

  const currentStep = steps[currentStepIndex];
  const renderedText = currentStep ? currentStep.cumulative : finalResponse;

  return (
    <div className="gen-timeline-container" id="generation-inspector">
      <div className="gen-header">
        <div className="gen-title-group">
          <span className="badge-glow cyan">AUTOREGRESSIVE DECODING</span>
          <h3 className="gen-title">Step-by-Step Generation Trace</h3>
        </div>

        {/* Playback Controls */}
        <div className="playback-controls">
          <button
            className="ctrl-btn"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(0);
            }}
            title="Reset to step 1"
            disabled={steps.length === 0}
          >
            &#11176;
          </button>
          <button
            className="ctrl-btn"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((prev) => Math.max(0, prev - 1));
            }}
            title="Step Back"
            disabled={currentStepIndex <= 0}
          >
            &#9664;
          </button>
          <button
            className={`ctrl-btn play ${isPlaying ? 'playing' : ''}`}
            onClick={() => {
              if (currentStepIndex >= steps.length - 1) {
                setCurrentStepIndex(0);
              }
              setIsPlaying(!isPlaying);
            }}
            title={isPlaying ? 'Pause' : 'Play'}
            disabled={steps.length === 0}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="ctrl-btn"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
            }}
            title="Step Forward"
            disabled={currentStepIndex >= steps.length - 1}
          >
            &#9654;
          </button>
          <button
            className="ctrl-btn"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(steps.length - 1);
            }}
            title="Jump to End"
            disabled={steps.length === 0}
          >
            &#11177;
          </button>
        </div>
      </div>

      {/* Scrubber slider */}
      {steps.length > 0 && (
        <div className="timeline-scrubber">
          <div className="scrubber-label-row">
            <span className="control-label">Emitted Step:</span>
            <span className="control-val font-mono">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={steps.length - 1}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(parseInt(e.target.value));
            }}
            className="slider-range"
          />
        </div>
      )}

      {/* Live Output Preview */}
      <div className="cumulative-display-box">
        <span className="box-label">CUMULATIVE RESPONSE (UP TO STEP {currentStepIndex + 1}):</span>
        <div className="response-live-text">
          {renderedText}
          {currentStepIndex < steps.length - 1 && <span className="cursor-blink">&block;</span>}
        </div>
      </div>

      {/* Step Pills List */}
      <div className="steps-chips-scroll">
        {steps.map((st, i) => {
          const isCurrent = i === currentStepIndex;
          const isPast = i < currentStepIndex;

          return (
            <button
              key={i}
              className={`step-pill ${isCurrent ? 'active' : ''} ${isPast ? 'past' : ''}`}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(i);
              }}
            >
              <span className="step-num font-mono">{i + 1}</span>
              <span className="step-tok font-mono">{st.display || st.token.replace(/ /g, '␣')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
