import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import BackButton from '../../../components/BackButton';
import InfoButton from '../../../components/InfoButton';
import FeatureTour, { TourStep } from '../../../components/FeatureTour';
import EmotionTracker from '../../../components/EmotionTracker';
import { DT } from '../../../utils/DyslexiaTheme';


const RhymeDashboard = () => {
    const navigation = useNavigation<any>();
    const { settings } = useSettings();
    const [tourVisible, setTourVisible] = useState(false);

    const tourSteps: TourStep[] = [
        {
            title: getTranslation(settings.language, 'dashboard_rhyme_title'),
            description: getTranslation(settings.language, 'tour_rhyme_welcome_desc'),
            position: 'top',
            style: { top: 120, alignSelf: 'center' },
            arrowPosition: 'bottom',
        },
        {
            title: getTranslation(settings.language, 'dashboard_rhyme_match_title'),
            description: "Start your mission with 'Make a Match'! Other cool modes like Rhyme Train and Voice Vault are coming soon.",
            position: 'center',
            style: { top: '50%', alignSelf: 'center' },
            arrowPosition: 'top',
        }
    ];

    return (
        <View style={styles.container}>
            <EmotionTracker moduleName="Rhyme Dashboard" isActive={!tourVisible} />
            <LinearGradient colors={DT.gradient.sage} style={StyleSheet.absoluteFillObject} />
            <BackButton color={DT.text.primary} />
            <InfoButton onPress={() => setTourVisible(true)} color={DT.text.primary} />
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <Text style={styles.title}>{getTranslation(settings.language, 'dashboard_rhyme_title')}</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scroll}>
                    {/* Game Mode 1: Make a Match */}
                    <TouchableOpacity
                        style={[styles.card]}
                        onPress={() => navigation.navigate('RhymingMatchGame')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient colors={DT.gradient.warmCard} style={styles.cardGradient}>
                            <View style={[styles.iconContainer, { backgroundColor: DT.bg.lavender }]}>
                                <Text style={styles.icon}>🐱</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{getTranslation(settings.language, 'dashboard_rhyme_match_title')}</Text>
                                <Text style={styles.cardDesc}>{getTranslation(settings.language, 'dashboard_rhyme_match_desc')}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Game Mode 2: Rhyme Train (Coming Soon) */}
                    <TouchableOpacity style={[styles.card, styles.locked]} activeOpacity={1}>
                        <LinearGradient colors={DT.gradient.cream} style={styles.cardGradient}>
                            <View style={[styles.iconContainer, { backgroundColor: DT.bg.lemon }]}>
                                <Text style={styles.icon}>🚂</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{getTranslation(settings.language, 'dashboard_rhyme_train_title')}</Text>
                                <Text style={styles.cardDesc}>{getTranslation(settings.language, 'dashboard_rhyme_train_desc')}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Game Mode 3: Voice Vault (Coming Soon) */}
                    <TouchableOpacity style={[styles.card, styles.locked]} activeOpacity={1}>
                        <LinearGradient colors={DT.gradient.cream} style={styles.cardGradient}>
                            <View style={[styles.iconContainer, { backgroundColor: DT.bg.blush }]}>
                                <Text style={styles.icon}>🦜</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{getTranslation(settings.language, 'dashboard_rhyme_vault_title')}</Text>
                                <Text style={styles.cardDesc}>{getTranslation(settings.language, 'dashboard_rhyme_vault_desc')}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
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
    container: { flex: 1, backgroundColor: DT.bg.sage },
    overlay: { flex: 1, paddingTop: 70 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 20 },
    title: { fontSize: 30, color: DT.text.primary, fontWeight: DT.typography.weightHeavy, fontFamily: 'OpenDyslexic-Regular', letterSpacing: DT.typography.letterSpacingUI },
    
    scroll: { paddingHorizontal: 20, paddingBottom: 50, gap: 14 },
    card: {
        height: 100,
        borderRadius: DT.radius.xl,
        borderWidth: 1,
        borderColor: DT.surface.cardBorder,
        overflow: 'hidden',
        backgroundColor: DT.surface.card,
        ...DT.shadow.soft,
        marginBottom: 2
    },
    cardGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: DT.bg.lavender,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    icon: { fontSize: 30 },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 19, fontWeight: DT.typography.weightBold, color: DT.text.primary, fontFamily: 'OpenDyslexic-Regular', letterSpacing: DT.typography.letterSpacingBody },
    cardDesc: { fontSize: 13, color: DT.text.secondary, lineHeight: 20 },
    locked: { opacity: 0.65 }
});

export default RhymeDashboard;
