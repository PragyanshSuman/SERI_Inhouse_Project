import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, PanResponder, Text, TouchableOpacity, Animated, Dimensions, Platform, StatusBar } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { DT } from '../../../utils/DyslexiaTheme';

const { width: SCREEN_W } = Dimensions.get('window');
const CANVAS_W = SCREEN_W * 0.85;
const CANVAS_H = CANVAS_W * 1.3;

// --- PROCEDURAL GEOMETRY ENGINE (Demo) ---
// This mathematically parses an SVG Cubic Bezier string and returns a perfect tracking array
function generateGeometricPointsFromSVG(svgString: string, samplesPerCurve: number = 60) {
    const points = [];
    
    // Updated: Simple Regex to find ALL Cubic Bezier curves in an SVG path
    const regex = /M\s+([-\d.]+)\s+([-\d.]+)|C\s+([-\d.]+)\s+([-\d.]+),\s*([-\d.]+)\s+([-\d.]+),\s*([-\d.]+)\s+([-\d.]+)/g;
    
    let match;
    let currentX = 0, currentY = 0;

    while ((match = regex.exec(svgString)) !== null) {
        if (match[1] !== undefined) {
            // It's an M command
            currentX = Number(match[1]);
            currentY = Number(match[2]);
            if (points.length === 0) {
                points.push({ x: currentX, y: currentY, angle: 0 });
            }
        } else if (match[3] !== undefined) {
            // It's a C command
            const cx1 = Number(match[3]), cy1 = Number(match[4]);
            const cx2 = Number(match[5]), cy2 = Number(match[6]);
            const x3 = Number(match[7]), cy3 = Number(match[8]);

            for (let i = 1; i <= samplesPerCurve; i++) {
                const t = i / samplesPerCurve;
                const x = Math.pow(1-t, 3)*currentX + 3*Math.pow(1-t, 2)*t*cx1 + 3*(1-t)*Math.pow(t, 2)*cx2 + Math.pow(t, 3)*x3;
                const y = Math.pow(1-t, 3)*currentY + 3*Math.pow(1-t, 2)*t*cy1 + 3*(1-t)*Math.pow(t, 2)*cy2 + Math.pow(t, 3)*cy3;
                points.push({ x, y, angle: 0 });
            }
            currentX = x3;
            currentY = cy3;
        }
    }

    // Mathematically assign rotation angles based on trajectory vectors
    for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i+1].x - points[i].x;
        const dy = points[i+1].y - points[i].y;
        points[i].angle = Math.atan2(dy, dx) * (180 / Math.PI);
    }
    if (points.length > 0) {
        points[points.length - 1].angle = points[points.length - 2].angle;
    }
    
    return points;
}

// Distance Helper
const nearestIndex = (pts: any[], pt: {x: number, y: number}) => {
    let minD2 = Infinity;
    let idx = 0;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - pt.x;
      const dy = pts[i].y - pt.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < minD2) {
        minD2 = dist2;
        idx = i;
      }
    }
    return { index: idx, dist2: minD2 };
};


export default function ProceduralGeometryDemo() {
    const navigation = useNavigation();
    
    // We pass an actual multi-curve SVG for the letter "S" or "C"!
    // Let's do an "S" which is very recognizable
    const rawSVG = "M 250 100 C 120 70, 70 170, 180 200 C 280 220, 250 370, 100 320";
    
    // The engine automatically builds the smooth tracking array!
    const proceduralSegment = useMemo(() => ({
        pts: generateGeometricPointsFromSVG(rawSVG, 60), // Generates smooth tracking points dynamically!
        pathDef: rawSVG
    }), []);

    const [isDone, setIsDone] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Procedural Puck Engine</Text>
                <TouchableOpacity style={styles.resetBtn} onPress={() => setIsDone(false)}>
                    <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
            </View>
            
            <Text style={styles.subtitle}>The exact same puck game, but its track was generated procedurally from an infinitely scalable math string!</Text>

            <View style={styles.canvasWrap}>
                <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
                    <Path
                        d={proceduralSegment.pathDef}
                        stroke="rgba(0,0,0,0.1)"
                        strokeWidth={25}
                        strokeLinecap="round"
                        fill="none"
                    />
                </Svg>
                
                {!isDone ? (
                    <SegmentTracer segment={proceduralSegment} onDone={() => setIsDone(true)} />
                ) : (
                    <Text style={styles.successText}>🎉 Flawless Geometry! 🎉</Text>
                )}
            </View>
        </View>
    );
}

// Exactly identical to their beloved SegmentTracer puck dragging logic!
function SegmentTracer({ segment, onDone }: any) {
    const TOLERANCE = 45;
    const BACK_SLACK = 10;
    const puckR = 18;
    const progressIndexRef = useRef(0);
    const [offTrack, setOffTrack] = useState(false);
    const [rotation, setRotation] = useState(segment.pts[0]?.angle || 0);
    const puck = useRef(new Animated.ValueXY({ x: segment.pts[0].x, y: segment.pts[0].y })).current;
    const glow = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;
  
    const setPuckToIndex = useCallback(
      (idx: number) => {
        const clamped = Math.max(0, Math.min(segment.pts.length - 1, idx));
        const pt = segment.pts[clamped];
        puck.setValue({ x: pt.x, y: pt.y });
        setRotation(pt.angle);
      },
      [segment.pts, puck]
    );
  
    useEffect(() => {
      const glowAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      );
      const pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      glowAnim.start();
      pulseAnim.start();
      return () => {
        glowAnim.stop();
        pulseAnim.stop();
      };
    }, [glow, pulse]);
  
    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: () => {
            setOffTrack(false);
            setPuckToIndex(progressIndexRef.current);
          },
          onPanResponderMove: (evt) => {
            const touchX = evt.nativeEvent.locationX;
            const touchY = evt.nativeEvent.locationY;
            const { index, dist2 } = nearestIndex(segment.pts, { x: touchX, y: touchY });
            
            // Allow tracking ONLY if finger is actually near the glowing line
            const within = dist2 <= TOLERANCE * TOLERANCE;
            if (!within) {
              setOffTrack(true);
              return;
            }
            setOffTrack(false);
            
            const prev = progressIndexRef.current;

            // ALLOW FREELY DRAGGING BACKWARDS: 
            // If the finger goes backwards, we visually un-fill the stroke!
            // We ONLY prevent extreme skipping forward (e.g. jumping over the whole letter)
            
            if (index <= prev + 8) {
                // Allows moving anywhere backwards, OR moving smoothly forwards
                progressIndexRef.current = index;
            } else if (index > prev + 8 && index <= prev + 15) {
               // Fast swiping forgiveness
                progressIndexRef.current = index;
            }

            setPuckToIndex(progressIndexRef.current);
            
            if (progressIndexRef.current >= segment.pts.length - 2) {
              setTimeout(onDone, 300);
            }
          },
          onPanResponderRelease: () => {
            if (offTrack) setPuckToIndex(progressIndexRef.current);
          },
        }),
      [segment.pts, onDone, offTrack, setPuckToIndex]
    );
  
    const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(34,197,94,0.0)', 'rgba(255,215,0,0.8)'] });
  
    const puckStyle = {
      transform: [
        { translateX: Animated.subtract(puck.x as any, puckR) },
        { translateY: Animated.subtract(puck.y as any, puckR) },
        { scale: pulse },
      ],
    };
  
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none" {...panResponder.panHandlers}>
        <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="rainbowTrail2" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FF6B6B" stopOpacity="1" />
              <Stop offset="100%" stopColor="#4D96FF" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Path
            d={`M ${segment.pts[0].x} ${segment.pts[0].y} ` + segment.pts.slice(1, progressIndexRef.current + 1).map((p: any) => `L ${p.x} ${p.y}`).join(' ')}
            stroke={offTrack ? '#F87171' : 'url(#rainbowTrail2)'}
            strokeWidth={20}
            strokeLinecap="round"
            opacity={0.95}
            fill="none"
          />
        </Svg>
        <Animated.View style={[styles.puck, puckStyle, offTrack && styles.puckOff]}>
          <Animated.View style={[styles.puckGlow, { backgroundColor: glowColor as any }]} />
          <Text style={[styles.puckArrow, { transform: [{ rotate: `${rotation}deg` }] }]}>→</Text>
        </Animated.View>
      </View>
    );
}

const SAFE_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

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
        fontSize: 14,
        paddingHorizontal: 40,
        textAlign: 'center',
        marginBottom: 40,
        color: DT.text.secondary,
        fontWeight: 'bold',
    },
    canvasWrap: { 
        width: CANVAS_W, 
        height: CANVAS_H, 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 4,
        borderColor: '#37464F',
        overflow: 'hidden',
    },
    puck: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: '#0284C7',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      },
      puckOff: { backgroundColor: '#EF4444', borderColor: '#DC2626', shadowColor: '#EF4444' },
      puckGlow: { position: 'absolute', top: -14, left: -14, right: -14, bottom: -14, borderRadius: 34 },
      puckArrow: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0284C7',
        lineHeight: 24,
      },
      successText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: DT.text.success,
      }
});
