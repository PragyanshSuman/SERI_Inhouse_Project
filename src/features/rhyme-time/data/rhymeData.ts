export interface RhymeWord {
    id: string;
    word: string;
    image: string; // Emoji for prototype, can be URL/require later
}

export interface RhymeFamily {
    id: string;
    sound: string; // "at", "og"
    words: RhymeWord[];
}

export const RHYME_DATA: RhymeFamily[] = [
    {
        id: 'at',
        sound: 'at',
        words: [
            { id: 'cat', word: 'Cat', image: '🐱' },
            { id: 'bat', word: 'Bat', image: '🦇' },
            { id: 'hat', word: 'Hat', image: '🎩' },
            { id: 'rat', word: 'Rat', image: '🐀' },
            { id: 'mat', word: 'Mat', image: '🧘' }
        ]
    },
    {
        id: 'og',
        sound: 'og',
        words: [
            { id: 'dog', word: 'Dog', image: '🐶' },
            { id: 'frog', word: 'Frog', image: '🐸' },
            { id: 'log', word: 'Log', image: '🪵' },
            { id: 'fog', word: 'Fog', image: '🌫️' }
        ]
    },
    {
        id: 'an',
        sound: 'an',
        words: [
            { id: 'fan', word: 'Fan', image: '🪭' },
            { id: 'man', word: 'Man', image: '👨' },
            { id: 'van', word: 'Van', image: '🚐' },
            { id: 'pan', word: 'Pan', image: '🍳' },
            { id: 'can', word: 'Can', image: '🥫' }
        ]
    },
    {
        id: 'ip',
        sound: 'ip',
        words: [
            { id: 'lip', word: 'Lip', image: '👄' },
            { id: 'ship', word: 'Ship', image: '🚢' },
            { id: 'chip', word: 'Chip', image: '🍟' },
            { id: 'dip', word: 'Dip', image: '🥣' }
        ]
    },
    {
        id: 'un',
        sound: 'un',
        words: [
            { id: 'sun', word: 'Sun', image: '☀️' },
            { id: 'run', word: 'Run', image: '🏃' },
            { id: 'bun', word: 'Bun', image: '🍞' },
            { id: 'fun', word: 'Fun', image: '🥳' }
        ]
    }
];
