export interface CardOptionValue {
  type: 'text' | 'drawing' | 'audio' | 'image';
  content: string; // Text content, base64 data URL for drawing/image, or audio file URL/reference
  waveformData?: number[]; // Optional: pre-computed waveform data for audio
  id?: string; // Optional unique ID for options, useful for keys and comparisons
  language?: 'en' | 'de'; // ADDED: Language of the original content
}

export interface Definition {
  id?: string; // Optional: will be assigned by Firestore
  typeCategory: CardOptionValue;
  keyAttributes: CardOptionValue;
  impactPurpose: CardOptionValue;
  termId?: string; // ADDED: Store the language-neutral ID
  termLanguage?: 'en' | 'de'; // ADDED: Store the language of the term saved
  termText?: string; // REPLACED term with termText for clarity
  createdAt?: any; // For Firestore serverTimestamp
  likes?: number; // Added for popular sorting
}

export interface TermData {
  id: string; // Language-neutral identifier
  en: LanguageSpecificTermData;
  de: LanguageSpecificTermData; // MODIFIED: German version can now also have phonetic
}

// MODIFIED TermData structure for multilingual support
export interface LanguageSpecificTermData {
  term: string;
  etymology?: string;
  phonetic?: string; // Phonetic is optional, mainly for English
  defaultDefinition: {
    typeCategory: CardOptionValue;
    keyAttributes: CardOptionValue;
    impactPurpose: CardOptionValue;
  };
} 