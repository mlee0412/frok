'use client';

import React from 'react';
import type { TTSSettings } from '@/hooks/useTextToSpeech';

type TTSSettingsProps = {
  settings: TTSSettings;
  voices: SpeechSynthesisVoice[];
  onUpdate: (settings: Partial<TTSSettings>) => void;
  onClose: () => void;
};

export function TTSSettingsModal({
  settings,
  voices,
  onUpdate,
  onClose,
}: TTSSettingsProps) {
  const [rate, setRate] = React.useState(settings.rate);
  const [selectedVoice, setSelectedVoice] = React.useState(settings.voice);

  const handleSave = () => {
    onUpdate({ rate, voice: selectedVoice });
    onClose();
  };

  // Filter to English voices for better UX
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">🔊 Text-to-Speech Settings</h2>

        {/* Playback Speed */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Playback Speed: {rate.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5x (Slower)</span>
            <span>1.0x (Normal)</span>
            <span>2.0x (Faster)</span>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Voice</label>
          <select
            value={selectedVoice || ''}
            onChange={(e) => setSelectedVoice(e.target.value || null)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-sky-500 text-sm"
          >
            {englishVoices.length === 0 ? (
              <option>Loading voices...</option>
            ) : (
              englishVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))
            )}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {englishVoices.length} English voice{englishVoices.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
