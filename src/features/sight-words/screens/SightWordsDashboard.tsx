import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SIGHT_WORDS_DATA } from '../../../data/sightWords';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';

const BG_IMAGE = require('../../../assets/images/dashboard_bg.png'); // Reuse existing bg

const SightWordsDashboard = () => {
    const navigation = useNavigation<any>();
    const { settings } = useSettings();

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
        <ImageBackground source={BG_IMAGE} style={styles.container}>
            <LinearGradient colors={['rgba(30,41,59,0.9)', 'rgba(30,41,59,0.4)']} style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{getTranslation(settings.language, 'dashboard_ninja_title')}</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scroll}>
                    <Text style={styles.subtitle}>{getTranslation(settings.language, 'dashboard_ninja_subtitle')}</Text>
                    
                    {SIGHT_WORDS_DATA.map((level) => (
                        <TouchableOpacity
                            key={level.id}
                            style={[styles.card, { borderColor: level.color }]}
                            onPress={() => navigation.navigate('WordNinjaGame', { levelId: level.id })}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[level.color, '#1E293B']}
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
            </LinearGradient>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    backText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 32,
        color: '#FFF',
        fontWeight: 'bold',
        fontFamily: 'OpenDyslexic-Regular',
    },
    subtitle: {
        fontSize: 18,
        color: '#CBD5E1',
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
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 2,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
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
        fontSize: 22,
        color: '#FFF',
        fontWeight: 'bold',
        fontFamily: 'OpenDyslexic-Regular',
    },
    cardSub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },
    playIcon: {
        fontSize: 28,
        color: '#FFF',
    }
});

export default SightWordsDashboard;
