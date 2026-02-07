export default {
    primary: '#4F46E5', // Indigo-600
    secondary: '#10B981', // Emerald-500
    background: '#F9FAFB', // Gray-50
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6', // Gray-100
    textPrimary: '#1F2937', // Gray-800
    textSecondary: '#6B7280', // Gray-500
    textTertiary: '#9CA3AF', // Gray-400
    textOnPrimary: '#FFFFFF',
    border: '#E5E7EB', // Gray-200
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    shadowColor: '#000000',
    accent: '#8B5CF6', // Violet-500
    riskLow: '#10B981',
    riskMild: '#FCD34D',
    riskModerate: '#F59E0B',
    riskHigh: '#EF4444',
    riskSevere: '#7F1D1D',
};

export const ColorUtils = {
    getDifficultyColor: (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '#10B981';
            case 'medium': return '#F59E0B';
            case 'hard': return '#EF4444';
            default: return '#9CA3AF';
        }
    },
    getScoreColor: (score: number) => {
        if (score >= 80) return '#10B981';
        if (score >= 60) return '#F59E0B';
        return '#EF4444';
    },
    getRiskColor: (level: string) => {
        switch (level?.toLowerCase()) {
            case 'low': return '#10B981';
            case 'medium': return '#F59E0B';
            case 'high': return '#EF4444';
            case 'severe': return '#7F1D1D';
            default: return '#9CA3AF';
        }
    }
};
