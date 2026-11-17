import React, { useState } from 'react';
import { CloseIcon, SparklesIcon } from './Icons';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  token: string | null;
  onSendToChat?: (imagePrompt: string) => void;
  theme?: 'light' | 'dark';
}

const STYLE_PRESETS = [
  { id: 'photo', label: '📸 8K Photorealistic', suffix: 'ultra-realistic photography, 8k resolution, highly detailed, photorealistic, sharp focus, 35mm lens, natural lighting, crystal clear' },
  { id: 'cinematic', label: '🎬 Cinematic Masterpiece', suffix: 'cinematic lighting, film still, shallow depth of field, blockbuster movie aesthetic, 8k, sharp focus' },
  { id: 'digital', label: '🎨 Digital Art', suffix: 'concept art, highly detailed digital painting, vibrant colors, trending on artstation, masterpiece' },
  { id: 'cyberpunk', label: '🌆 Cyberpunk Neon', suffix: 'cyberpunk style, neon rain, volumetric lighting, futuristic city, 8k HD resolution, crisp reflections' },
  { id: 'portrait', label: '👤 Sharp Studio Portrait', suffix: 'close-up portrait, studio lighting, sharp facial details, hyper-realistic, 8k UHD, crisp texture' }
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square (1024×1024)', width: 1024, height: 1024 },
  { id: '16:9', label: '16:9 Landscape (1280×720)', width: 1280, height: 720 },
  { id: '9:16', label: '9:16 Portrait (720×1280)', width: 720, height: 1280 }
];

export function ImageStudioModal({
  isOpen,
  onClose,
  apiUrl,
  token,
  onSendToChat,
  theme = 'light'
}: ImageStudioModalProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('photo');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg('');
    setGeneratedImgUrl(null);

    const stylePreset = STYLE_PRESETS.find(s => s.id === selectedStyle);
    const ratioPreset = ASPECT_RATIOS.find(r => r.id === selectedRatio) || ASPECT_RATIOS[0];
    const fullPrompt = `${prompt.trim()}, ${stylePreset ? stylePreset.suffix : '8k resolution, photorealistic, sharp focus, masterpiece'}`;

    try {
      const res = await fetch(`${apiUrl}/api/image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          width: ratioPreset.width,
          height: ratioPreset.height,
          model: 'sana'
        })
      });

      if (!res.ok) {
        throw new Error('Image generation failed. Please try again.');
      }

      const data = await res.json();
      setGeneratedImgUrl(data.url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Image synthesis encountered an error.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImgUrl) return;
    const a = document.createElement('a');
    a.href = generatedImgUrl;
    a.download = `chatgpt-hd-${Date.now()}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleInsertToChat = () => {
    if (onSendToChat && prompt.trim()) {
      onSendToChat(`/image ${prompt.trim()}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
        theme === 'dark' ? 'bg-[#1e1e1e] border-[#333333] text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          theme === 'dark' ? 'border-[#2d2d2d]' : 'border-gray-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-sm">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">HD Image Studio (PNG)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Generate crystal-clear 8K high-definition images in lossless PNG</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              theme === 'dark' ? 'hover:bg-[#2d2d2d] text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Image Description (Prompt)
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A futuristic cyberpunk city with neon reflections in rain, Bangalore skyline, ultra sharp details..."
              className={`w-full p-3.5 rounded-xl text-sm border focus:outline-none transition-all resize-none ${
                theme === 'dark'
                  ? 'bg-[#282828] border-[#3d3d3d] text-white placeholder-gray-500 focus:border-emerald-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:bg-white'
              }`}
            />
          </div>

          {/* Style Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Style & Clarity Preset
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedStyle(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selectedStyle === preset.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : theme === 'dark'
                      ? 'bg-[#282828] border-[#3d3d3d] text-gray-300 hover:border-gray-500'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Format & Resolution
            </label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => setSelectedRatio(ratio.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selectedRatio === ratio.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : theme === 'dark'
                      ? 'bg-[#282828] border-[#3d3d3d] text-gray-300 hover:border-gray-500'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
              {errorMsg}
            </div>
          )}

          {/* Generated Result Preview */}
          {isGenerating && (
            <div className="rounded-2xl border border-dashed border-emerald-500/40 p-8 flex flex-col items-center justify-center text-center bg-emerald-500/5 min-h-[220px]">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Synthesizing 8K Ultra-HD PNG...</p>
              <p className="text-xs text-gray-500 mt-1">Applying sharpness enhancement and non-blurry clarity modifiers</p>
            </div>
          )}

          {generatedImgUrl && !isGenerating && (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg bg-black">
                <img
                  src={generatedImgUrl}
                  alt={prompt}
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                  className="w-full h-auto max-h-[360px] object-contain mx-auto"
                />
              </div>

              {/* Action Buttons for Generated Image */}
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>⬇️ Download Lossless PNG</span>
                </button>
                {onSendToChat && (
                  <button
                    type="button"
                    onClick={handleInsertToChat}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      theme === 'dark' ? 'bg-[#2a2a2a] hover:bg-[#333333] border-[#3f3f3f] text-white' : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-800'
                    }`}
                  >
                    <span>💬 Insert to Chat</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`flex items-center justify-between px-6 py-3.5 border-t ${
          theme === 'dark' ? 'border-[#2d2d2d] bg-[#1a1a1a]' : 'border-gray-100 bg-gray-50'
        }`}>
          <span className="text-[11px] text-gray-500">
            Powered by 8K Sana HD Generative Engine • Lossless PNG
          </span>
          <button
            type="button"
            disabled={!prompt.trim() || isGenerating}
            onClick={() => handleGenerate()}
            className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              !prompt.trim() || isGenerating
                ? 'opacity-50 cursor-not-allowed bg-gray-400 text-white'
                : 'bg-[#10A37F] hover:bg-[#0D8A6C] text-white active:scale-95'
            }`}
          >
            <SparklesIcon className="w-3.5 h-3.5 text-white" />
            <span>{isGenerating ? 'Rendering HD Image...' : 'Generate HD Image'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
