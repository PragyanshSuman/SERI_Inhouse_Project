import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../../../context/SettingsContext';
import { getTranslation } from '../../../utils/Translations';
import EmotionTracker from '../../../components/EmotionTracker';

// Placeholder Assets
const BG_IMAGE = require('../../../assets/images/dashboard_bg.png'); 

const RhymeDashboard = () => {
    const navigation = useNavigation<any>();
    const { settings } = useSettings();

    return (
        <ImageBackground source={BG_IMAGE} style={styles.container}>
            <EmotionTracker moduleName="Rhyme Dashboard" isActive={true} />
            <LinearGradient colors={['rgba(30,41,59,0.9)', 'rgba(79, 70, 229, 0.4)']} style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{getTranslation(settings.language, 'dashboard_rhyme_title')}</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scroll}>
                    {/* Game Mode 1: Make a Match */}
                    <TouchableOpacity
                        style={[styles.card, { borderColor: '#818CF8' }]}
                        onPress={() => navigation.navigate('RhymingMatchGame')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient colors={['#FFF', '#E0E7FF']} style={styles.cardGradient}>
                            <View style={styles.iconContainer}>
                                <Text style={styles.icon}>🐱</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{getTranslation(settings.language, 'dashboard_rhyme_match_title')}</Text>
                                <Text style={styles.cardDesc}>{getTranslation(settings.language, 'dashboard_rhyme_match_desc')}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Game Mode 2: Rhyme Train (Coming Soon) */}
                    <TouchableOpacity style={[styles.card, styles.locked, { borderColor: '#FCD34D' }]} activeOpacity={1}>
                        <LinearGradient colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.5)']} style={styles.cardGradient}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                                <Text style={styles.icon}>🚂</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{getTranslation(settings.language, 'dashboard_rhyme_train_title')}</Text>
                                <Text style={styles.cardDesc}>{getTranslation(settings.language, 'dashboard_rhyme_train_desc')}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Game Mode 3: Voice Vault (Coming Soon) */}
                    <TouchableOpacity style={[styles.card, styles.locked, { borderColor: '#F87171' }]} activeOpacity={1}>
                        <LinearGradient colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.5)']} style={styles.cardGradient}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                                <Text style={styles.icon}>🦜</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{getTranslation(settings.language, 'dashboard_rhyme_vault_title')}</Text>
                                <Text style={styles.cardDesc}>{getTranslation(settings.language, 'dashboard_rhyme_vault_desc')}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </LinearGradient>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    overlay: { flex: 1, paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, paddingHorizontal: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    backText: { color: '#FFF', fontSize: 24 },
    title: { fontSize: 32, color: '#FFF', fontWeight: 'bold', fontFamily: 'OpenDyslexic-Regular' },
    
    scroll: { paddingHorizontal: 20, paddingBottom: 50, gap: 20 },
    card: {
        height: 100,
        borderRadius: 20,
        borderWidth: 2,
        overflow: 'hidden',
        backgroundColor: '#FFF',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        marginBottom: 16
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
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    icon: { fontSize: 30 },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', fontFamily: 'OpenDyslexic-Regular' },
    cardDesc: { fontSize: 14, color: '#64748B' },
    locked: { opacity: 0.7 }
});

export default RhymeDashboard;
