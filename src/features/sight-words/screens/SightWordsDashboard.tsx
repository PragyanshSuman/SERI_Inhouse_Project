import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { SIGHT_WORDS_DATA } from '../../../data/sightWords';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';



const SightWordsDashboard = () => {
    const navigation = useNavigation<any>();
    const { settings } = useSettings();
    const [tourVisible, setTourVisible] = useState(false);

    const tourSteps: TourStep[] = [
        {
            title: getTranslation(settings.language, 'dashboard_ninja_title'),
            description: getTranslation(settings.language, 'tour_ninja_welcome_desc'),
            position: 'top',
            style: { top: 120, alignSelf: 'center' },
            arrowPosition: 'bottom',
        },
        {
            title: getTranslation(settings.language, 'dashboard_ninja_subtitle'),
            description: "Choose a Rank from the list below: Pre-K, Kindergarten, 1st Grade, or 2nd Grade. Each level has different sight words to master!",
            position: 'center',
            style: { top: '50%', alignSelf: 'center' },
            arrowPosition: 'bottom',
        }
    ];

    const getLevelLabel = (id: string, defaultLabel: string) => {
        switch(id) {
            case 'prek': return getTranslation(settings.language, 'dashboard_ninja_level_prek');
            case 'kindergarten': return getTranslation(settings.language, 'dashboard_ninja_level_k');
            case 'first_grade': return getTranslation(settings.language, 'dashboard_ninja_level_1st');
            case 'second_grade': return getTranslation(settings.language, 'dashboard_ninja_level_2nd');
            default: return defaultLabel;
        }
    };

    return (
        <View style={styles.container}>
            <EmotionTracker moduleName="Sight Words Dashboard" isActive={!tourVisible} />
            <BackButton color={DT.text.primary} />
            <InfoButton onPress={() => setTourVisible(true)} color={DT.text.primary} />
            <LinearGradient colors={DT.gradient.cream} style={StyleSheet.absoluteFillObject} />
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <Text style={styles.title}>{getTranslation(settings.language, 'dashboard_ninja_title')}</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scroll}>
                    <Text style={styles.subtitle}>{getTranslation(settings.language, 'dashboard_ninja_subtitle')}</Text>
                    
                    {SIGHT_WORDS_DATA.map((level) => (
                        <TouchableOpacity
                            key={level.id}
                            style={[styles.card]}
                            onPress={() => navigation.navigate('WordNinjaGame', { levelId: level.id })}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={DT.gradient.warmCard}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.cardGradient}
                            >
                                <View style={styles.cardContent}>
                                    <View>
                                        <Text style={styles.cardTitle}>{getLevelLabel(level.id, level.label)}</Text>
                                        <Text style={styles.cardSub}>{level.words.length} {getTranslation(settings.language, 'dashboard_ninja_words_suffix')}</Text>
                                    </View>
                                    <Text style={styles.playIcon}>▶</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <FeatureTour 
                visible={tourVisible}
                steps={tourSteps}
                onComplete={() => setTourVisible(false)}
                onSkip={() => setTourVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DT.bg.cream,
    },
    overlay: {
        flex: 1,
        paddingTop: 70,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    title: {
        fontSize: 30,
        color: DT.text.primary,
        fontWeight: DT.typography.weightHeavy,
        fontFamily: 'OpenDyslexic-Regular',
        letterSpacing: DT.typography.letterSpacingUI,
    },
    subtitle: {
        fontSize: 14,
        color: DT.text.muted,
        marginBottom: 20,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    scroll: {
        paddingHorizontal: 20,
        paddingBottom: 50,
    },
    card: {
        height: 100,
        marginBottom: 14,
        borderRadius: DT.radius.xl,
        borderWidth: 1,
        borderColor: DT.surface.cardBorder,
        overflow: 'hidden',
        ...DT.shadow.soft,
    },
    cardGradient: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 20,
        color: DT.text.primary,
        fontWeight: DT.typography.weightBold,
        fontFamily: 'OpenDyslexic-Regular',
        letterSpacing: DT.typography.letterSpacingBody,
    },
    cardSub: {
        fontSize: 13,
        color: DT.text.secondary,
        marginTop: 4,
        lineHeight: 20,
    },
    playIcon: {
        fontSize: 24,
        color: DT.accent.indigo,
    }
});

export default SightWordsDashboard;
