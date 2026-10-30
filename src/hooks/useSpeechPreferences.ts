import { useCallback, useEffect, useState } from 'react';
import {
  findVoiceForGender,
  isSpeechGender,
  isSpeechSpeed,
  preferredEnglishVoice,
  sortSpeechVoices,
  speechSupported,
  SPEECH_GENDER_STORAGE_KEY,
  SPEECH_SPEED_STORAGE_KEY,
  type SpeechGender,
  type SpeechSpeed,
} from '../utils/speech';

function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // A private or locked-down browser can reject storage writes; the choice
    // still works for this session because it is also kept in React state.
  }
}

function initialGender(): SpeechGender {
  const stored = readPreference(SPEECH_GENDER_STORAGE_KEY);
  return isSpeechGender(stored) ? stored : 'female';
}

function initialSpeed(): SpeechSpeed {
  const stored = readPreference(SPEECH_SPEED_STORAGE_KEY);
  return isSpeechSpeed(stored) ? stored : 'normal';
}

export function useSpeechPreferences() {
  const [supported] = useState(speechSupported);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesReady, setVoicesReady] = useState(false);
  const [gender, setGenderState] = useState<SpeechGender>(initialGender);
  const [speed, setSpeedState] = useState<SpeechSpeed>(initialSpeed);

  useEffect(() => {
    if (!supported) return;

    const synthesis = window.speechSynthesis;
    const updateVoices = () => {
      try {
        const nextVoices = sortSpeechVoices(synthesis.getVoices());
        setVoices((previousVoices) => {
          const unchanged =
            previousVoices.length === nextVoices.length &&
            previousVoices.every(
              (voice, index) =>
                voice.name === nextVoices[index].name &&
                voice.lang === nextVoices[index].lang &&
                voice.voiceURI === nextVoices[index].voiceURI,
            );
          return unchanged ? previousVoices : nextVoices;
        });
      } catch {
        // Keep automatic pronunciation available even if the platform voice
        // list cannot be read.
      } finally {
        setVoicesReady(true);
      }
    };

    updateVoices();
    synthesis.addEventListener('voiceschanged', updateVoices);
    return () => synthesis.removeEventListener('voiceschanged', updateVoices);
  }, [supported]);

  const setGender = useCallback((nextGender: SpeechGender) => {
    setGenderState(nextGender);
    writePreference(SPEECH_GENDER_STORAGE_KEY, nextGender);
  }, []);

  const setSpeed = useCallback((nextSpeed: SpeechSpeed) => {
    setSpeedState(nextSpeed);
    writePreference(SPEECH_SPEED_STORAGE_KEY, nextSpeed);
  }, []);

  const matchingVoice = findVoiceForGender(voices, gender);

  return {
    supported,
    voicesReady,
    hasVoices: voices.length > 0,
    hasMatchingVoice: matchingVoice !== null,
    gender,
    speed,
    voice: matchingVoice ?? preferredEnglishVoice(voices),
    setGender,
    setSpeed,
  };
}
