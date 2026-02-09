export type DifficultyLevel = 'pre_k' | 'kindergarten' | 'first_grade' | 'second_grade' | 'third_grade';

export interface SightWordLevel {
    id: DifficultyLevel;
    label: string;
    color: string;
    words: string[];
}

export const SIGHT_WORDS_DATA: SightWordLevel[] = [
    {
        id: 'pre_k',
        label: 'Pre-K (Ninja Initiate)',
        color: '#4ade80', // Green
        words: [
            'a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for',
            'funny', 'go', 'help', 'here', 'I', 'in', 'is', 'it', 'jump', 'little',
            'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run', 'said',
            'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you'
        ]
    },
    {
        id: 'kindergarten',
        label: 'Kindergarten (Ninja Apprentice)',
        color: '#fbbf24', // Amber
        words: [
            'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came',
            'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like',
            'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran',
            'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this',
            'too', 'under', 'want', 'well', 'went', 'what', 'white', 'who', 'will', 'with', 'yes'
        ]
    },
    {
        id: 'first_grade',
        label: '1st Grade (Ninja Warrior)',
        color: '#f87171', // Red
        words: [
            'after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could', 'every', 'fly',
            'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
            'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
            'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk',
            'were', 'when'
        ]
    },
    {
        id: 'second_grade',
        label: '2nd Grade (Ninja Master)',
        color: '#a78bfa', // Purple
        words: [
            'always', 'around', 'because', 'been', 'before', 'best', 'both', 'buy', 'call',
            'cold', 'does', 'don\'t', 'fast', 'first', 'five', 'found', 'gave', 'goes',
            'green', 'its', 'made', 'many', 'off', 'or', 'pull', 'read', 'right', 'sing',
            'sit', 'sleep', 'tell', 'their', 'these', 'those', 'upon', 'us', 'use', 'very',
            'wash', 'which', 'why', 'wish', 'work', 'would', 'write', 'your'
        ]
    }
];

export const getWordsForLevel = (levelId: DifficultyLevel): string[] => {
    const level = SIGHT_WORDS_DATA.find(l => l.id === levelId);
    return level ? level.words : [];
};
