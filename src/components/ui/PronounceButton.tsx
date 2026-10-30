import { Square, Volume2 } from 'lucide-react';
import { usePronunciation } from '../../hooks/usePronunciation';
import type { SpeechSpeed } from '../../utils/speech';

interface PronounceButtonProps {
  text: string;
  voice?: SpeechSynthesisVoice | null;
  speed?: SpeechSpeed;
  className?: string;
}

export function PronounceButton({
  text,
  voice = null,
  speed = 'normal',
  className,
}: PronounceButtonProps) {
  const { supported, speaking, error, speak, stop } = usePronunciation(text, voice, speed);

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        className={`pronounce-button ${speaking ? 'pronounce-button--speaking' : ''} ${className ?? ''}`.trim()}
        onClick={speaking ? stop : speak}
        aria-label={speaking ? `Stop pronouncing ${text}` : `Pronounce ${text}`}
        aria-pressed={speaking}
        title={speaking ? 'Stop pronunciation' : `Hear “${text}”`}
      >
        {speaking ? (
          <Square size={11} strokeWidth={2} fill="currentColor" aria-hidden="true" />
        ) : (
          <Volume2 size={15} strokeWidth={1.9} aria-hidden="true" />
        )}
      </button>
      {error ? (
        <span className="sr-only" role="status">
          {error}
        </span>
      ) : null}
    </>
  );
}
