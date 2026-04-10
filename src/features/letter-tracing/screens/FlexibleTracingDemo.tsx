import React, { useState, useRef } from 'react';
import { View, StyleSheet, PanResponder, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, Defs, Mask, Rect, LinearGradient, Stop, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { DT } from '../../../utils/DyslexiaTheme';

export default function FlexibleTracingDemo() {
    const navigation = useNavigation();
    
    // A complex, continuous path for an 'S' shape to demonstrate flexibility
    const letterPath = "M 200 100 C 150 50, 100 50, 100 120 C 100 190, 250 180, 250 250 C 250 320, 150 350, 100 300";

    const [userPaths, setUserPaths] = useState<string[]>([]);
    const currentPathRef = useRef<Array<{x: number, y: number}>>([]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                currentPathRef.current = [{ x: locationX, y: locationY }];
                updatePaths();
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                currentPathRef.current.push({ x: locationX, y: locationY });
                updatePaths();
            },
            onPanResponderRelease: () => {
                currentPathRef.current = [];
            }
        })
    ).current;

    const updatePaths = () => {
        if (currentPathRef.current.length === 0) return;
        
        let pathString = `M ${currentPathRef.current[0].x} ${currentPathRef.current[0].y}`;
        for (let i = 1; i < currentPathRef.current.length; i++) {
            pathString += ` L ${currentPathRef.current[i].x} ${currentPathRef.current[i].y}`;
        }

        setUserPaths(prev => {
            // Replace the last path if we are currently drawing
            if (currentPathRef.current.length > 1) {
                const newPaths = [...prev];
                if (newPaths.length > 0 && currentPathRef.current.length > 2) {
                    newPaths[newPaths.length - 1] = pathString;
                    return newPaths;
                } else {
                    return [...prev, pathString];
                }
            }
            return prev;
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Progressive Paint</Text>
                <TouchableOpacity style={styles.resetBtn} onPress={() => setUserPaths([])}>
                    <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
            </View>
            
            <Text style={styles.subtitle}>Trace anywhere near the letter 'S' to organically fill it with paint! No puck tracking, no pausing.</Text>

            <View style={styles.canvasContainer} {...panResponder.panHandlers}>
                <Svg width="350" height="400" viewBox="0 0 350 400">
                    <Defs>
                        {/* Beautiful vibrant paint color */}
                        <LinearGradient id="paintGrad" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor={DT.accent.violet} stopOpacity="1" />
                            <Stop offset="0.5" stopColor={DT.accent.sky} stopOpacity="1" />
                            <Stop offset="1" stopColor={DT.accent.green} stopOpacity="1" />
                        </LinearGradient>

                        {/* 
                            This is the magic! 
                            We use the user's messy strokes as a MASK.
                            The color will only show up inside the actual letter path.
                        */}
                        <Mask id="userPaintMask">
                            <Rect x="0" y="0" width="100%" height="100%" fill="black" />
                            <G>
                                {userPaths.map((p, idx) => (
                                    <Path 
                                        key={idx} 
                                        d={p} 
                                        stroke="white" 
                                        strokeWidth="55" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                    />
                                ))}
                            </G>
                        </Mask>
                    </Defs>

                    {/* 1. Underlying faintly visible reference path */}
                    <Path 
                        d={letterPath} 
                        stroke="#2b3b45" 
                        strokeWidth="50" 
                        fill="none" 
                        strokeLinecap="round" 
                    />
                    
                    {/* 2. The glowing outline guide */}
                    <Path 
                        d={letterPath} 
                        stroke="#52656d" 
                        strokeWidth="52" 
                        fill="none" 
                        strokeLinecap="round" 
                        strokeDasharray="15,15"
                    />

                    {/* 3. The progressive vibrant paint! Only revealed through the mask */}
                    <Path 
                        d={letterPath} 
                        stroke="url(#paintGrad)" 
                        strokeWidth="50" 
                        fill="none" 
                        strokeLinecap="round" 
                        mask="url(#userPaintMask)"
                    />
                </Svg>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DT.bg.skyBlue,
        paddingTop: 50,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backBtn: { padding: 10, backgroundColor: 'white', borderRadius: 10 },
    backText: { fontSize: 16, fontWeight: 'bold' },
    title: { fontSize: 22, fontWeight: 'bold', alignSelf: 'center' },
    resetBtn: { padding: 10, backgroundColor: DT.accent.indigo, borderRadius: 10 },
    resetText: { fontSize: 16, fontWeight: 'bold', color: 'white' },
    subtitle: {
        fontSize: 16,
        paddingHorizontal: 30,
        textAlign: 'center',
        marginBottom: 40,
        color: DT.text.secondary,
        fontWeight: 'bold',
    },
    canvasContainer: {
        width: 350,
        height: 400,
        backgroundColor: '#131F24',
        borderRadius: 20,
        borderWidth: 4,
        borderColor: '#37464F',
        overflow: 'hidden',
    }
});
