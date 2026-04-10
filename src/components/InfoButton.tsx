import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface InfoButtonProps {
    onPress: () => void;
    color?: string;
}

const InfoButton: React.FC<InfoButtonProps> = ({ onPress, color = '#283593' }) => {
    return (
        <TouchableOpacity 
            style={[styles.button, { borderColor: color }]} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.text, { color }]}>i</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        top: 40,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        zIndex: 100,
    },
    text: {
        fontSize: 20,
        fontWeight: '900',
        fontFamily: 'serif', // More scholarly look for the "i"
    },
});

export default InfoButton;
