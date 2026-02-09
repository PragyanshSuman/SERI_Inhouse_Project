import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// Placeholder Assets
const BG_IMAGE = require('../../../assets/images/dashboard_bg.png'); 

const RhymeDashboard = () => {
    const navigation = useNavigation<any>();

    return (
        <ImageBackground source={BG_IMAGE} style={styles.container}>
            <LinearGradient colors={['rgba(79, 70, 229, 0.9)', 'rgba(79, 70, 229, 0.5)']} style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Rhyme Time 🎵</Text>
                </View>

                <View style={styles.menuContainer}>
                    <TouchableOpacity 
                        style={styles.card}
                        onPress={() => navigation.navigate('RhymingMatchGame')}
                    >
                        <View style={styles.iconCircle}>
                            <Text style={styles.icon}>🐱</Text>
                        </View>
                        <View>
                            <Text style={styles.cardTitle}>Make a Match</Text>
                            <Text style={styles.cardSub}>Find the pair!</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Placeholders for Future Games */}
                    <TouchableOpacity style={[styles.card, { opacity: 0.7 }]}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FCD34D' }]}>
                            <Text style={styles.icon}>🚂</Text>
                        </View>
                        <View>
                            <Text style={styles.cardTitle}>Rhyme Train</Text>
                            <Text style={styles.cardSub}>Coming Soon</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.card, { opacity: 0.7 }]}>
                        <View style={[styles.iconCircle, { backgroundColor: '#F87171' }]}>
                            <Text style={styles.icon}>🦜</Text>
                        </View>
                        <View>
                            <Text style={styles.cardTitle}>Voice Vault</Text>
                            <Text style={styles.cardSub}>Coming Soon</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    overlay: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    backText: { color: '#FFF', fontSize: 24 },
    title: { fontSize: 32, color: '#FFF', fontWeight: 'bold', fontFamily: 'OpenDyslexic-Regular' },
    
    menuContainer: { gap: 20 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#818CF8',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    icon: { fontSize: 30 },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', fontFamily: 'OpenDyslexic-Regular' },
    cardSub: { fontSize: 14, color: '#64748B' }
});

export default RhymeDashboard;
