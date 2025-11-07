'use client';

import React from 'react';
import { Button } from '@frok/ui';
import type { TTSSettings } from '@/hooks/useTextToSpeech';
import { useTranslations } from '@/lib/i18n/I18nProvider';

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
  const t = useTranslations('tts');
  const tCommon = useTranslations('common');
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
        className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">🔊 {t('title')}</h2>

        {/* Playback Speed */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            {t('speed.label')}: {rate.toFixed(1)}x
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
          <div className="flex justify-between text-xs text-foreground/60 mt-1">
            <span>{t('speed.verySlow')}</span>
            <span>{t('speed.normal')}</span>
            <span>{t('speed.veryFast')}</span>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">{t('voice.label')}</label>
          <select
            value={selectedVoice || ''}
            onChange={(e) => setSelectedVoice(e.target.value || null)}
            className="w-full px-3 py-2 bg-surface border border-border rounded focus:outline-none focus:border-primary/500 text-sm"
          >
            {englishVoices.length === 0 ? (
              <option>{tCommon('loading')}</option>
            ) : (
              englishVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))
            )}
          </select>
          <p className="text-xs text-foreground/60 mt-1">
            {englishVoices.length} English voice{englishVoices.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button onClick={onClose} variant="outline">
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSave} variant="primary">
            {tCommon('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
