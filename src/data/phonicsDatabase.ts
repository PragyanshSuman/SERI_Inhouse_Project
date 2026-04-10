export interface PhonicsLevel {
  id: number;
  title: string;
  description: string;
  words: string[];
}

export const phonicsDatabase: PhonicsLevel[] = [
  {
    id: 1,
    title: 'CVC Words',
    description: 'Consonant-Vowel-Consonant words with short vowel sounds.',
    words: [
      'cat', 'dog', 'hit', 'sun', 'mop',
      'bat', 'log', 'sit', 'run', 'top',
      'hat', 'frog', 'bit', 'fun', 'hop',
      'mat', 'fog', 'fit', 'bun', 'pop'
    ]
  },
  {
    id: 2,
    title: 'Blends & Digraphs',
    description: 'Two consonants together making one or two sounds.',
    words: [
      'ship', 'chat', 'stop', 'glad', 'frog',
      'shop', 'chin', 'step', 'flag', 'crab',
      'shut', 'chop', 'slip', 'plum', 'spin',
      'shed', 'chip', 'snap', 'plan', 'swim'
    ]
  },
  {
    id: 3,
    title: 'Magic E',
    description: 'Vowel-Consonant-E words where the silent E makes the vowel long.',
    words: [
      'cake', 'rope', 'bite', 'cube', 'hide',
      'lake', 'hope', 'kite', 'tube', 'ride',
      'make', 'joke', 'site', 'mule', 'wide',
      'take', 'poke', 'white', 'rule', 'side'
    ]
  },
  {
    id: 4,
    title: 'Vowel Teams',
    description: 'Two vowels together making a single sound.',
    words: [
      'boat', 'rain', 'seed', 'leaf', 'coin',
      'coat', 'train', 'weed', 'read', 'join',
      'goat', 'main', 'feed', 'team', 'point',
      'toad', 'pain', 'need', 'mean', 'boil'
    ]
  }
];

// Helper function to get random words from a specific level
export const getRandomPhonicsWords = (levelId: number, count: number = 5): string[] => {
    const level = phonicsDatabase.find(l => l.id === levelId);
    if (!level) return [];
    
    // Simple shuffle
    const shuffled = [...level.words].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};
