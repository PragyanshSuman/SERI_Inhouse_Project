import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Animated, Text, TouchableOpacity } from 'react-native';
import { useSettings } from '../context/SettingsContext';

const { width, height } = Dimensions.get('window');

const AssistiveOverlay = () => {
    const { settings } = useSettings();
    const { overlayColor, isRulerEnabled, rulerHeight } = settings;
    const [isRulerVisible, setIsRulerVisible] = useState(false);

    // Ruler Drag State
    const pan = useRef(new Animated.ValueXY({ x: 0, y: height / 3 })).current;

    const rulerPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event([null, { dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: () => {
                pan.flattenOffset();
            }
        })
    ).current;

    // Toggle Button Drag State
    const fabPan = useRef(new Animated.ValueXY({ x: 0, y: 100 })).current;
    
    // Allow dragging the toggle button freely, snap to nearest side edge
    const fabPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                fabPan.setOffset({
                    x: (fabPan.x as any)._value,
                    y: (fabPan.y as any)._value
                });
                fabPan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event([null, { dx: fabPan.x, dy: fabPan.y }], { useNativeDriver: false }),
            onPanResponderRelease: (e, gestureState) => {
                 fabPan.flattenOffset();

                 // Detect Click
                 // Check if total movement is small
                 const isClick = Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10;
                 
                 console.log('FAB Release:', { dx: gestureState.dx, dy: gestureState.dy, isClick });

                 if (isClick) {
                     setIsRulerVisible(prev => !prev);
                 } else {
                     // Snap to nearest edge logic
                     const destX = gestureState.moveX > width / 2 ? width - 48 : 0;
                     Animated.spring(fabPan, {
                         toValue: { x: destX, y: (fabPan.y as any)._value },
                         useNativeDriver: false,
                         bounciness: 10
                     }).start();
                 }
            }
        })
    ).current;

    // Clamp ruler logic remains same
    const clampedY = pan.y.interpolate({
        inputRange: [0, height - rulerHeight],
        outputRange: [0, height - rulerHeight],
        extrapolate: 'clamp'
    });

    if (!isRulerEnabled && overlayColor === 'transparent') {
        return null;
    }

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Color Tint Overlay - Always active if set */}
            {overlayColor !== 'transparent' && (
                <View 
                    style={[styles.tint, { backgroundColor: overlayColor }]} 
                    pointerEvents="none" 
                />
            )}

            {/* Floating Toggle Button - Only if Ruler Enabled */}
            {isRulerEnabled && (
                <Animated.View
                    style={[
                        styles.fab,
                        {
                            transform: [
                                { translateX: fabPan.x },
                                { translateY: fabPan.y }
                            ]
                        }
                    ]}
                    {...fabPanResponder.panHandlers}
                >
                    {/* 
                      Use a specialized View instead of TouchableOpacity for combined Drag + Click.
                      We will handle the "Click" inside the PanResponder if the move is small.
                    */}
                    <View style={styles.fabTouch}>
                         <Text style={styles.fabIcon}>{isRulerVisible ? '📏' : '👁️'}</Text>
                    </View>
                </Animated.View>
            )}

            {/* Reading Ruler - Conditionally Visible */}
            {isRulerEnabled && isRulerVisible && (
                <View style={[styles.rulerContainer]} pointerEvents="box-none">
                    {/* Darkened Top */}
                    <Animated.View 
                        style={[
                            styles.dimmedArea, 
                            { 
                                bottom: undefined, 
                                top: 0,
                                height: clampedY 
                            }
                        ]} 
                        pointerEvents="none"
                    />

                    {/* Clear Window (The Ruler) */}
                    <Animated.View 
                        style={[
                            styles.rulerWindow, 
                            { 
                                top: clampedY, 
                                height: rulerHeight 
                            }
                        ]}
                        pointerEvents="box-none" // Allow clicks to pass through the clear area
                    >
                        {/* Draggable Top Border */}
                        <View 
                            style={styles.dragBorder} 
                            {...rulerPanResponder.panHandlers} 
                        />

                        {/* Drag Handle (Right) */}
                        <View 
                            style={styles.handle}
                            {...rulerPanResponder.panHandlers}
                        >
                            <Text style={styles.handleIcon}>↕</Text>
                        </View>

                        {/* Draggable Bottom Border */}
                        <View 
                            style={[styles.dragBorder, { top: undefined, bottom: 0 }]} 
                            {...rulerPanResponder.panHandlers} 
                        />
                    </Animated.View>

                    {/* Darkened Bottom */}
                    <Animated.View 
                        style={[
                            styles.dimmedArea, 
                            { 
                                top: undefined,
                                bottom: 0, 
                                height: Animated.subtract(height, Animated.add(clampedY, rulerHeight))
                            }
                        ]} 
                        pointerEvents="none"
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999, // Ensure it's on top of everything
        elevation: 9999,
    },
    tint: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.3, // Subtle tint but visible
    },
    rulerContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    dimmedArea: {
        position: 'absolute',
        left: 0, 
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    rulerWindow: {
        position: 'absolute',
        left: 0, 
        right: 0,
        // Borders are now part of the drag zones
        justifyContent: 'center',
        alignItems: 'flex-end', // Handle on right
    },
    dragBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 10, // Draggable area height
        backgroundColor: 'rgba(255, 255, 0, 0.3)', // Visible yellow tint for border
        zIndex: 10,
    },
    handle: {
        width: 40,
        height: '100%', // Make handle full height for easier grabbing
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 0,
        zIndex: 20,
    },
    handleIcon: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    
    // Floating Button
    fab: {
        position: 'absolute',
        // left: 0, top: 0  <-- Removing these to ensure transform works relative to top-left 0,0 
        // effectively, but relying on absolute position with no top/left defaults usually implies 0,0 
        // depending on container. Let's be explicit.
        top: 0,
        left: 0,
        zIndex: 10000,
    },
    fabTouch: {
        width: 48,
        height: 48,
        backgroundColor: '#FFF',
        borderRadius: 24, // Make it fully round for free floating
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    fabIcon: {
        fontSize: 24,
    }
});

export default AssistiveOverlay;
