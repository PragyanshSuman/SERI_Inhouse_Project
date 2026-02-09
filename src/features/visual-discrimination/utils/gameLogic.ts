/**
 * Generates a grid of letters where one is the target and the rest are distractors.
 * 
 * @param size Total number of items in the grid (e.g., 16 for 4x4)
 * @param target The letter to find (e.g., 'b')
 * @param distractor The letter to fill the rest of the grid (e.g., 'd')
 * @returns Array of strings representing the grid
 */
export const generateGrid = (size: number, target: string, distractor: string): string[] => {
    // Fill the grid with distractors
    const grid = new Array(size).fill(distractor);

    // Pick a random index for the target
    const targetIndex = Math.floor(Math.random() * size);

    // Place the target
    grid[targetIndex] = target;

    return grid;
};
