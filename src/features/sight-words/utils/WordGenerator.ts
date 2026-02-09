import { SIGHT_WORDS_DATA, DifficultyLevel } from '../../../data/sightWords';

export interface GameRound {
    targetWord: string;
    flyingWords: FlyingWord[];
}

export interface FlyingWord {
    id: string;
    text: string;
    isCorrect: boolean;
    velocity: { x: number; y: number };
    startPos: { x: number; y: number };
}

// Helper to shuffle array
const shuffle = <T>(array: T[]): T[] => {
    return array.sort(() => Math.random() - 0.5);
};

export const generateRound = (levelId: DifficultyLevel, screenWidth: number, screenHeight: number): GameRound => {
    const levelData = SIGHT_WORDS_DATA.find(l => l.id === levelId) || SIGHT_WORDS_DATA[0];
    const allWords = levelData.words;

    // 1. Pick Target Word
    const targetIndex = Math.floor(Math.random() * allWords.length);
    const targetWord = allWords[targetIndex];

    // 2. Pick Distractors
    // Try to find words with similar length or starting letter for better difficulty
    const otherWords = allWords.filter(w => w !== targetWord);

    // Simple heuristic: mix of random words and "similar" words (if any)
    // For now, just random to keep it fast
    const distractors = shuffle(otherWords).slice(0, 3); // 3 distractors

    // 3. Create Flying Objects
    const rawWords = [targetWord, ...distractors];
    const shuffledWords = shuffle(rawWords);

    const flyingWords: FlyingWord[] = shuffledWords.map((word, index) => {
        // Random start position (mostly from sides)
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const startX = side === 'left' ? -100 : screenWidth + 100;
        const startY = Math.random() * (screenHeight * 0.6) + (screenHeight * 0.1); // Keep within middle 60% vertical

        // Velocity towards center-ish
        // Speed varies by level? For now constant-ish.
        const speed = Math.random() * 2 + 2; // 2 to 4 px/frame roughly
        const angle = Math.atan2((screenHeight / 2) - startY, (screenWidth / 2) - startX);

        // Add some noise to angle
        const noisyAngle = angle + (Math.random() * 0.5 - 0.25);

        return {
            id: `${word}-${index}-${Date.now()}`,
            text: word,
            isCorrect: word === targetWord,
            startPos: { x: startX, y: startY },
            velocity: {
                x: Math.cos(noisyAngle) * speed,
                y: Math.sin(noisyAngle) * speed
            }
        };
    });

    return {
        targetWord,
        flyingWords
    };
};
