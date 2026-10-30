import type { SpeechGender, SpeechSpeed } from '../../utils/speech';

const GENDERS: Array<{ value: SpeechGender; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

const SPEEDS: Array<{ value: SpeechSpeed; label: string }> = [
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
];

interface PronunciationSettingsProps {
  gender: SpeechGender;
  speed: SpeechSpeed;
  voicesReady: boolean;
  hasVoices: boolean;
  hasMatchingVoice: boolean;
  onGenderChange: (gender: SpeechGender) => void;
  onSpeedChange: (speed: SpeechSpeed) => void;
}

export function PronunciationSettings({
  gender,
  speed,
  voicesReady,
  hasVoices,
  hasMatchingVoice,
  onGenderChange,
  onSpeedChange,
}: PronunciationSettingsProps) {
  const genderDisabled = !voicesReady || !hasVoices;
  let note: string | null = null;

  if (voicesReady) {
    if (!hasVoices) {
      note = 'No voices detected; using the browser default.';
    } else if (!hasMatchingVoice) {
      note = `No ${gender} English voice detected; using a fallback voice.`;
    }
  }

  return (
    <div className="pronunciation-settings">
      <div className="pronunciation-setting">
        <span className="pronunciation-setting__label">Voice</span>
        <div className="segmented-control" role="group" aria-label="Pronunciation voice gender">
          {GENDERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="segmented-control__button"
              aria-pressed={gender === option.value}
              onClick={() => onGenderChange(option.value)}
              disabled={genderDisabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pronunciation-setting">
        <span className="pronunciation-setting__label">Speed</span>
        <div className="segmented-control" role="group" aria-label="Pronunciation speed">
          {SPEEDS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="segmented-control__button"
              aria-pressed={speed === option.value}
              onClick={() => onSpeedChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {note ? (
        <p className="pronunciation-settings__note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}
