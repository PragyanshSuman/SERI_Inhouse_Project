import { WordService } from '../../../services/WordService';

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

export const generateRound = (levelId: string, screenWidth: number, screenHeight: number): GameRound => {
    let allWords: string[] = [];
    
    if (levelId === 'Tricky') {
        allWords = WordService.getTrickyWords(50);
    } else {
        allWords = WordService.getWordsByLevel(levelId as any, 50);
    }

    if (allWords.length === 0) {
        // Fallback if corpus is somehow empty or levelId is invalid
        allWords = ['the', 'and', 'was', 'for'];
    }

    // 1. Pick Target Word
    const targetIndex = Math.floor(Math.random() * allWords.length);
    const targetWord = allWords[targetIndex];

    // 2. Pick Distractors
    // Crucial for Dyslexia: Distractors should NOT share the same starting letter,
    // which prevents rapid visual confusion and cognitive overload.
    const otherWords = allWords.filter(w => w !== targetWord && w[0].toLowerCase() !== targetWord[0].toLowerCase());

    // Reduce clutter: Only 2 distractors instead of 3
    const distractors = shuffle(otherWords).slice(0, 2);

    // 3. Create Flying Objects
    const rawWords = [targetWord, ...distractors];
    const shuffledWords = shuffle(rawWords);

    // We have exactly 3 words. Divide screenHeight * 0.65 into 3 vertical lanes.
    const laneHeight = (screenHeight * 0.65) / 3;
    const topMargin = screenHeight * 0.15;

    const flyingWords: FlyingWord[] = shuffledWords.map((word, index) => {
        // Random start position (mostly from sides)
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const startX = side === 'left' ? -100 : screenWidth + 100;

        // Assign a dedicated vertical lane to strictly prevent overlap
        const startY = topMargin + (index * laneHeight) + (Math.random() * (laneHeight * 0.4));

        // Velocity towards center-ish
        // Dyslexia-Friendly: Make them float gently like balloons, not fast fruit.
        const speed = Math.random() * 0.7 + 0.8; // 0.8 to 1.5 px/frame 
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
