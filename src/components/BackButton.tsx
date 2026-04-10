import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  backgroundColor?: string;
  style?: any;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  onPress, 
  color = '#4F46E5', 
  backgroundColor = 'rgba(255, 255, 255, 0.9)',
  style 
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor }, style]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={28} color={color} style={styles.icon} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 5,
  },
  icon: {
    marginLeft: -2, // Optical centering for chevron
  },
});

export default BackButton;
