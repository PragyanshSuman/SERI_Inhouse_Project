import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { DT } from '../utils/DyslexiaTheme';

export interface AppTextProps extends TextProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const AppText: React.FC<AppTextProps> = ({ children, style, ...props }) => {
  const { settings } = useSettings();
  const { dyslexiaFormattingEnabled, themeMode, fontFamily } = settings;

  // Flatten the incoming style to inspect its properties
  const flattenedStyle = StyleSheet.flatten(style || {}) as TextStyle;
  
  // Calculate Base Font Size (enforcing minimum 16px if formatting enabled)
  let baseFontSize = flattenedStyle.fontSize || 16;
  if (dyslexiaFormattingEnabled && baseFontSize < 16) {
    baseFontSize = 16;
  }

  // Construct Custom Dyslexia Rules if toggled
  const dyslexiaOverrides: TextStyle = {};
  
  if (dyslexiaFormattingEnabled) {
    // Dyslexia research: 35% letter spacing of font width (approx)
    // React Native letterSpacing works explicitly in pixels
    dyslexiaOverrides.letterSpacing = baseFontSize * 0.35;
    
    // Dyslexia research: 1.5x leading gap
    dyslexiaOverrides.lineHeight = baseFontSize * 1.5;
    
    // Dyslexia research: Avoid justified alignment, stick to left
    // We conditionally preserve explicit 'center' for strict UI symmetries (like radial gauges)
    if (flattenedStyle.textAlign !== 'center') {
      dyslexiaOverrides.textAlign = 'left';
    }
  }

  // Enforce Safe Dark Mode or Safe Light Colors
  const rawColor = flattenedStyle.color;
  let safeColor = rawColor;

  if (themeMode === 'dyslexicDark') {
     // If user is operating in 'Safe Dark Mode', override pure black text
     if (!rawColor || rawColor === '#000' || rawColor === '#000000' || rawColor === DT.text.primary) {
         safeColor = '#D1D5DB'; // Light grey text on dark background
     }
  } else {
     // If user is in Standard Mode but explicitly formatting is on
     if (dyslexiaFormattingEnabled) {
        if (!rawColor || rawColor === '#000' || rawColor === '#000000') {
           safeColor = DT.text.primary; // Muted dark brown instead of pure black
        }
     }
  }
  
  // Map standard font string to loaded Expo Font names
  let derivedFontFamily = undefined;
  if (fontFamily === 'Lexend') derivedFontFamily = 'Lexend-Regular';
  if (fontFamily === 'Roboto') derivedFontFamily = 'Roboto-Regular';
  if (fontFamily === 'OpenSans') derivedFontFamily = 'OpenSans-Regular';
  if (fontFamily === 'AtkinsonHyperlegible') derivedFontFamily = 'AtkinsonHyperlegible-Regular';
  // OpenDyslexic logic will go here if loaded
  
  if (derivedFontFamily) {
      dyslexiaOverrides.fontFamily = derivedFontFamily;
  }

  const finalStyle: TextStyle = {
    ...flattenedStyle,
    fontSize: baseFontSize,
    color: safeColor || undefined,
    ...dyslexiaOverrides,
  };

  return (
    <Text {...props} style={finalStyle}>
      {children}
    </Text>
  );
};
