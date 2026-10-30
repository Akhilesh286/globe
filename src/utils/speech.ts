export const SPEECH_GENDER_STORAGE_KEY = 'world-atlas:speech-gender:v1';
export const SPEECH_SPEED_STORAGE_KEY = 'world-atlas:speech-speed:v1';

export type SpeechGender = 'female' | 'male';
export type SpeechSpeed = 'slow' | 'normal' | 'fast';

export const SPEECH_RATES: Record<SpeechSpeed, number> = {
  slow: 0.7,
  normal: 1,
  fast: 1.3,
};

const FEMALE_NAMES = new Set([
  'agnes',
  'allison',
  'amy',
  'aria',
  'ava',
  'clare',
  'emily',
  'emma',
  'eva',
  'fiona',
  'hazel',
  'heather',
  'ivy',
  'jenny',
  'joanna',
  'karen',
  'kathy',
  'kendra',
  'kimberly',
  'libby',
  'linda',
  'michelle',
  'moira',
  'natasha',
  'olivia',
  'princess',
  'salli',
  'samantha',
  'serena',
  'sonia',
  'sophia',
  'susan',
  'tessa',
  'vicki',
  'victoria',
  'zira',
]);

const MALE_NAMES = new Set([
  'aaron',
  'alex',
  'arthur',
  'brian',
  'christopher',
  'connor',
  'daniel',
  'david',
  'eric',
  'fred',
  'george',
  'gordon',
  'guy',
  'james',
  'joey',
  'justin',
  'liam',
  'mark',
  'matthew',
  'oliver',
  'reed',
  'rishi',
  'roger',
  'ryan',
  'steffan',
  'thomas',
  'tom',
]);

const FEMALE_PHRASES = ['google us english'];
const MALE_PHRASES = ['google uk english male'];

export function speechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.speechSynthesis.speak === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

export function isSpeechGender(value: string | null): value is SpeechGender {
  return value === 'female' || value === 'male';
}

export function isSpeechSpeed(value: string | null): value is SpeechSpeed {
  return value === 'slow' || value === 'normal' || value === 'fast';
}

export function voiceIdentifier(voice: SpeechSynthesisVoice): string {
  return voice.voiceURI || `${voice.name}::${voice.lang}`;
}

function isEnglishVoice(voice: SpeechSynthesisVoice): boolean {
  return voice.lang.toLowerCase().startsWith('en');
}

function normaliseVoiceDescriptor(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function inferVoiceGender(voice: SpeechSynthesisVoice): SpeechGender | null {
  const descriptor = normaliseVoiceDescriptor(`${voice.name} ${voice.voiceURI}`);

  if (FEMALE_PHRASES.some((phrase) => descriptor.includes(phrase))) return 'female';
  if (MALE_PHRASES.some((phrase) => descriptor.includes(phrase))) return 'male';
  if (/\b(female|woman|girl)\b/.test(descriptor)) return 'female';
  if (/\b(male|man|boy)\b/.test(descriptor)) return 'male';

  for (const token of descriptor.split(' ')) {
    if (FEMALE_NAMES.has(token)) return 'female';
    if (MALE_NAMES.has(token)) return 'male';
  }

  return null;
}

export function sortSpeechVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const seen = new Set<string>();
  const unique = voices.filter((voice) => {
    const id = voiceIdentifier(voice);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return unique.sort((first, second) => {
    const englishDifference = Number(!isEnglishVoice(first)) - Number(!isEnglishVoice(second));
    if (englishDifference !== 0) return englishDifference;

    const languageDifference = first.lang.localeCompare(second.lang);
    if (languageDifference !== 0) return languageDifference;

    return first.name.localeCompare(second.name);
  });
}

export function preferredEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const english = voices.filter(isEnglishVoice);
  return (
    english.find((voice) => voice.default) ??
    english.find((voice) => voice.localService) ??
    english[0] ??
    null
  );
}

function voicePreferenceScore(voice: SpeechSynthesisVoice): number {
  let score = 0;
  if (voice.default) score += 8;
  if (voice.localService) score += 4;
  if (voice.lang.toLowerCase() === 'en-us') score += 2;
  if (voice.lang.toLowerCase() === 'en-gb') score += 1;
  return score;
}

export function findVoiceForGender(
  voices: SpeechSynthesisVoice[],
  gender: SpeechGender,
): SpeechSynthesisVoice | null {
  const matches = voices.filter(
    (voice) => isEnglishVoice(voice) && inferVoiceGender(voice) === gender,
  );
  if (matches.length === 0) return null;

  return matches.sort(
    (first, second) =>
      voicePreferenceScore(second) - voicePreferenceScore(first) ||
      first.name.localeCompare(second.name),
  )[0];
}
