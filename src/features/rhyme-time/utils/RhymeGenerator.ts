import { RHYME_DATA, RhymeWord } from '../data/rhymeData';

export interface MatchRound {
    target: RhymeWord;
    options: RhymeWord[];
    correctOptionId: string;
}

const shuffle = <T>(array: T[]): T[] => array.sort(() => Math.random() - 0.5);

export const generateMatchRound = (): MatchRound => {
    // 1. Pick a random family
    const familyIndex = Math.floor(Math.random() * RHYME_DATA.length);
    const family = RHYME_DATA[familyIndex];

    // 2. Pick target word from family (e.g., Cat)
    const targetIndex = Math.floor(Math.random() * family.words.length);
    const target = family.words[targetIndex];

    // 3. Pick a DIFFERENT correct match from SAME family (e.g., Bat)
    let correctMatch: RhymeWord;
    do {
        const idx = Math.floor(Math.random() * family.words.length);
        correctMatch = family.words[idx];
    } while (correctMatch.id === target.id);

    // 4. Pick 2 Distractors from OTHER families
    const distractors: RhymeWord[] = [];
    while (distractors.length < 2) {
        const otherFamilyIndex = Math.floor(Math.random() * RHYME_DATA.length);
        if (otherFamilyIndex === familyIndex) continue; // Skip same family

        const otherFamily = RHYME_DATA[otherFamilyIndex];
        const distractor = otherFamily.words[Math.floor(Math.random() * otherFamily.words.length)];

        // Prevent dupes
        if (!distractors.find(d => d.id === distractor.id)) {
            distractors.push(distractor);
        }
    }

    // 5. Combine and Shuffle
    const options = shuffle([correctMatch, ...distractors]);

    return {
        target,
        options,
        correctOptionId: correctMatch.id
    };
};
