import { useCallback, useEffect, useRef, useState } from 'react';
import { speechSupported, SPEECH_RATES, type SpeechSpeed } from '../utils/speech';

export function usePronunciation(
  text: string,
  voice: SpeechSynthesisVoice | null = null,
  speed: SpeechSpeed = 'normal',
) {
  const [supported] = useState(speechSupported);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const tokenRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tokenRef.current += 1;
      if (speechSupported()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!supported) return;
    // A different name, voice or speed is now selected; stop the old reading.
    tokenRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setError(null);
  }, [speed, supported, text, voice]);

  const stop = useCallback(() => {
    if (!supported) return;
    tokenRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(() => {
    const name = text.trim();
    if (!supported || !name) return;

    const token = tokenRef.current + 1;
    tokenRef.current = token;
    const synthesis = window.speechSynthesis;

    try {
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(name);
      utterance.lang = voice?.lang ?? 'en';
      utterance.rate = SPEECH_RATES[speed];
      utterance.pitch = 1;
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        if (!mountedRef.current || token !== tokenRef.current) return;
        setSpeaking(true);
        setError(null);
      };
      utterance.onend = () => {
        if (!mountedRef.current || token !== tokenRef.current) return;
        setSpeaking(false);
      };
      utterance.onerror = (event) => {
        if (!mountedRef.current || token !== tokenRef.current) return;
        setSpeaking(false);
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          setError('The browser could not pronounce this name.');
        }
      };

      synthesis.speak(utterance);
      setSpeaking(true);
      setError(null);
    } catch {
      setSpeaking(false);
      setError('The browser could not start speech pronunciation.');
    }
  }, [speed, supported, text, voice]);

  return { supported, speaking, error, speak, stop };
}
