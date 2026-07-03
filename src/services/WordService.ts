import corpusData from '../data/lexicalCorpus.json';

export interface WordEntry {
    word: string;
    dds: number;
    level: 'Easy' | 'Medium' | 'Hard';
    isTricky: boolean;
    length: number;
}

const words: WordEntry[] = corpusData as WordEntry[];

/**
 * WordService
 * 
 * Centralised engine to provide dyslexia-optimized words to all modules.
 */
export const WordService = {
    /**
     * Get a list of words filtered by difficulty level.
     */
    getWordsByLevel(level: 'Easy' | 'Medium' | 'Hard', count: number = 10): string[] {
        const filtered = words.filter(w => w.level === level);
        return this.shuffle(filtered).slice(0, count).map(w => w.word);
    },

    /**
     * Get "Tricky" words (non-decodable) for specialized dyslexia training.
     */
    getTrickyWords(count: number = 5): string[] {
        const tricky = words.filter(w => w.isTricky);
        return this.shuffle(tricky).slice(0, count).map(w => w.word);
    },

    /**
     * Get words based on a specific DDS (Dyslexia Difficulty Score) range.
     * Useful for fine-tuned AIRoadmap progression.
     */
    getWordsInRange(minDds: number, maxDds: number, count: number = 5): string[] {
        const inRange = words.filter(w => w.dds >= minDds && w.dds <= maxDds);
        return this.shuffle(inRange).slice(0, count).map(w => w.word);
    },

    /**
     * Get the difficulty info for a specific word.
     */
    getWordInfo(word: string): WordEntry | undefined {
        return words.find(w => w.word.toLowerCase() === word.toLowerCase());
    },

    /**
     * Private helper to shuffle arrays for variety.
     */
    shuffle<T>(array: T[]): T[] {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
};
