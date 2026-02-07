import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Vibration,
  Animated,
  Image,
  Easing,
  Text,
} from 'react-native';
import Svg, { Path, Circle, Line, G, Defs, Marker, Polygon, Text as SvgText } from 'react-native-svg';
// Note: 'Animate' is not directly exported by react-native-svg in all versions, 
// but often works as a child. If type error, we might need a different approach or ignore it.
// React Native SVG typically supports SMIL animation elements as children.
import { IdealPathData, ValidationResult } from '../models/TracingData';
import { LETTER_PATHS } from '../constants/LetterPaths';

import { CANVAS_CONFIG } from '../constants/LetterPaths';

interface TracingCanvasProps {
  idealPath: IdealPathData;
  activeStrokeIndex: number;
  letterStrokes: any[];
  onTouchStart?: () => void;
  onTouchMove?: (x: number, y: number, pressure: number) => void;
  onTouchEnd?: () => void;
  showGuidelines?: boolean;
  showFeedback?: boolean;
  validationFeedback?: ValidationResult;
  tolerancePixels?: number;
  onStrokeComplete?: (strokeIndex: number) => void;
  width?: number;
  height?: number;
  showHand?: boolean;
  showStrokeHints?: boolean;
  autoPlay?: boolean;
  showGrid?: boolean;
  showActiveStrokeBackground?: boolean;
  showActiveStrokeGuide?: boolean;
}

const TracingCanvas: React.FC<TracingCanvasProps> = ({
  idealPath,
  activeStrokeIndex,
  letterStrokes,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  showGuidelines = true,
  showFeedback = true,
  validationFeedback,
  tolerancePixels = 60,
  onStrokeComplete,
  width = 300,
  height = 400,
  showHand = true,
  showStrokeHints = true,
  autoPlay = false,
  showGrid = true,
  showActiveStrokeBackground = true,
  showActiveStrokeGuide = true,
}) => {
  const [userPath, setUserPath] = useState<Array<{ x: number; y: number }>>([]);
  const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number } | null>(null);
  const [isOnTrack, setIsOnTrack] = useState(true);
  const [permanentPaths, setPermanentPaths] = useState<string[]>([]);
  
  const pathRef = useRef<Array<{ x: number; y: number }>>([]);
  const lastVibrateRef = useRef<number>(0);

  // Auto-play animation state
  const autoPlayAnim = useRef(new Animated.Value(0)).current;
  const [demoHandPos, setDemoHandPos] = useState<{ x: number; y: number } | null>(null);
  
  useEffect(() => {
    setPermanentPaths([]);
    setUserPath([]);
    pathRef.current = [];
  }, [idealPath]);

  // Hand Animation Logic (Updated for AutoPlay)
  useEffect(() => {
     if (!showHand) return;

     if (autoPlay) {
         // Auto-play full letter path animation
         Animated.loop(
             Animated.timing(autoPlayAnim, {
                 toValue: 1,
                 duration: 4000,
                 useNativeDriver: false, // We need to interpolate values for coordinates
                 easing: Easing.linear,
             })
         ).start();
         
         // Listener to update hand position based on idealPath points
         const listenerId = autoPlayAnim.addListener(({ value }) => {
             // Map 0-1 to total points
             if (!idealPath.points || idealPath.points.length === 0) return;
             
             const totalPoints = idealPath.points.length;
             const index = Math.min(Math.floor(value * totalPoints), totalPoints - 1);
             const point = idealPath.points[index];
             
             if (point) {
                 setDemoHandPos({ x: point.x, y: point.y });

                 // Calculate trails
                 // Find which stroke we are currently in
                 let currentStrokeIndex = 0;
                 // strokeBoundaries is [0, end1, end2, end3...]
                 // If index is between bound[i] and bound[i+1], we are in stroke i (0-indexed)
                 for (let i = 0; i < idealPath.strokeBoundaries.length - 1; i++) {
                     if (index >= idealPath.strokeBoundaries[i] && index < idealPath.strokeBoundaries[i+1]) {
                         currentStrokeIndex = i;
                         break;
                     }
                 }

                 // 1. Previous strokes are fully permanent
                 // We can generate them once or just reconstruct
                 const newPermanentPaths: string[] = [];
                 for (let i = 0; i < currentStrokeIndex; i++) {
                     newPermanentPaths.push(getStrokePath(i));
                 }
                 setPermanentPaths(newPermanentPaths);

                 // 2. Current stroke is userPath (partial)
                 const startIdx = idealPath.strokeBoundaries[currentStrokeIndex];
                 // const endIdx = index; 
                 // We need points from startIdx to index
                 // BUT we can't just slice idealPath.points because they are dense.
                 // We can just use the points directly.
                 const currentSegmentPoints = idealPath.points.slice(startIdx, index + 1);
                 setUserPath(currentSegmentPoints);
             }
         });
         
         return () => {
             autoPlayAnim.removeAllListeners();
             autoPlayAnim.setValue(0);
             // Reset paths on exit
             setPermanentPaths([]);
             setUserPath([]);
         };

     } else {
        // Bobbing animation for static hand
        if (!showGuidelines) return;
        
        handAnim.setValue(0);
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(handAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true, 
                }),
                Animated.delay(500)
            ])
        );
        animation.start();
        return () => animation.stop();
     }
  }, [activeStrokeIndex, showHand, autoPlay, idealPath]); // Added idealPath dep

  // Helper to get hand position (Either Autoplay or Static Start)
  const getHandPosition = () => {
      if (autoPlay) return demoHandPos;
      
      if (activeStrokeIndex >= idealPath.strokeBoundaries.length) return null;
      const startIdx = activeStrokeIndex === 0 ? 0 : idealPath.strokeBoundaries[activeStrokeIndex - 1];
      const point = idealPath.points[startIdx];
      return point;
  };
  
  // Check if user is on track
  const checkOnTrack = useCallback((x: number, y: number): boolean => {
    // If we have full `idealPath` with `strokeBoundaries`, we should check only against the CURRENT stroke.
    // Otherwise check against all points (fallback).
    if (!showGuidelines) return true;
    
    let startIndex = 0;
    let endIndex = idealPath.points.length;
    
    if (idealPath.strokeBoundaries && idealPath.strokeBoundaries.length > activeStrokeIndex + 1) {
        // strokeBoundaries has N+1 entries for N strokes.
        // Stroke i is from boundaries[i] to boundaries[i+1]
        startIndex = idealPath.strokeBoundaries[activeStrokeIndex];
        endIndex = idealPath.strokeBoundaries[activeStrokeIndex + 1];
    } else {
        // Fallback: check whole letter if boundaries missing/invalid
        // (Though arguably we should fail closed or assume single stroke)
    }

    // Optimization: Check only points near expected progress?
    // For now, check all points in the current stroke to be safe, 
    // or a sliding window if we had progress tracking.
    // Simple robust approach: check distance to ANY point in the current stroke.
    
    let minDistance = Infinity;
    // We iterate the points of the current stroke
    for (let i = startIndex; i < endIndex; i++) {
        const point = idealPath.points[i];
        if (!point) continue;
        const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
        if (distance < minDistance) minDistance = distance;
    }

    return minDistance <= tolerancePixels;
  }, [idealPath, tolerancePixels, activeStrokeIndex, showGuidelines]);
  
  // Scale usually determined by the tighter constraint
  const viewBoxWidth = CANVAS_CONFIG.width; // 600
  const viewBoxHeight = CANVAS_CONFIG.height; // 800
  
  // Calculate content bounding box to center the view on the actual letter
  const getContentBounds = () => {
      if (!idealPath.points || idealPath.points.length === 0) {
          return { 
              minX: 0, maxX: viewBoxWidth, 
              minY: 0, maxY: viewBoxHeight,
              centerX: viewBoxWidth / 2, centerY: viewBoxHeight / 2
          };
      }
      
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of idealPath.points) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
      }
      
      return {
          minX, maxX, minY, maxY,
          centerX: (minX + maxX) / 2,
          centerY: (minY + maxY) / 2
      };
  };

  const bounds = getContentBounds();

  // Actually zoom in visually by reducing the viewBox size
  // This makes the content appear larger within the same screen area
  const zoomLevel = 1.35; 
  const zoomedViewBoxWidth = viewBoxWidth / zoomLevel;
  const zoomedViewBoxHeight = viewBoxHeight / zoomLevel;
  
  // Center the viewBox on the content's center
  // Adjust based on user feedback: "shifted left upwards" -> move Right and Down
  // Decrease minX/minY to shift viewBox left/up relative to content (which moves content right/down)
  const viewBoxMinX = bounds.centerX - (zoomedViewBoxWidth / 2) - 35; 
  const viewBoxMinY = bounds.centerY - (zoomedViewBoxHeight / 2) - 35;
  
  // Calculate scale based on the ZOOMED viewBox (pixels per SVG unit)
  // This scale is larger than 1.0 if zooming in
  const scale = Math.min(width / zoomedViewBoxWidth, height / zoomedViewBoxHeight);
  
  const renderedWidth = zoomedViewBoxWidth * scale; // Should roughly equal 'width' or 'height'
  const renderedHeight = zoomedViewBoxHeight * scale;
  
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;
  
  const getSvgCoordinates = (locationX: number, locationY: number) => {
      // Convert screen pixels to "standardized" SVG units (relative to top-left of rendered area)
      const relativeX = (locationX - offsetX) / scale;
      const relativeY = (locationY - offsetY) / scale;
      
      // Add the viewBox offset to map back to the original coordinate space (0-width, 0-height)
      const svgX = relativeX + viewBoxMinX;
      const svgY = relativeY + viewBoxMinY;
      
      return { x: svgX, y: svgY };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !autoPlay, // Disable touch in auto-play
      onMoveShouldSetPanResponder: () => !autoPlay,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        if (autoPlay) return; // double check
        const { locationX, locationY } = evt.nativeEvent;
        const { x: svgX, y: svgY } = getSvgCoordinates(locationX, locationY);
        pathRef.current = [{ x: svgX, y: svgY }];
        setUserPath([{ x: svgX, y: svgY }]);
        setCurrentPosition({ x: svgX, y: svgY });
        onTouchStart?.();
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (autoPlay) return;
        const { locationX, locationY } = evt.nativeEvent;
        const force = (evt.nativeEvent as any).force || 1;
        const { x: svgX, y: svgY } = getSvgCoordinates(locationX, locationY);
        pathRef.current.push({ x: svgX, y: svgY });
        setUserPath([...pathRef.current]);
        setCurrentPosition({ x: svgX, y: svgY });
        const onTrack = checkOnTrack(svgX, svgY);
        setIsOnTrack(onTrack);
        if (!onTrack && showFeedback) {
          const now = Date.now();
          if (now - lastVibrateRef.current > 200) {
            Vibration.vibrate(50);
            lastVibrateRef.current = now;
          }
        }
        onTouchMove?.(svgX, svgY, force);
      },
      onPanResponderRelease: () => {
        if (autoPlay) return;
        const wasOnTrack = isOnTrack;
        const pathLength = pathRef.current.length;
        const pointsToSave = [...pathRef.current];
        if (pointsToSave.length > 5) {
          const newPath = generateSVGPath(pointsToSave);
          setPermanentPaths(prev => [...prev, newPath]);
        }
        setUserPath([]);
        pathRef.current = [];
        setCurrentPosition(null);
        onTouchEnd?.();
        if (wasOnTrack && pathLength > 20) {
            onStrokeComplete?.(activeStrokeIndex);
        }
      },
      onPanResponderTerminate: () => {
        if (autoPlay) return;
        const pointsToSave = [...pathRef.current];
        if (pointsToSave.length > 5) {
          const newPath = generateSVGPath(pointsToSave);
          setPermanentPaths(prev => [...prev, newPath]);
        }
        setUserPath([]);
        pathRef.current = [];
        setCurrentPosition(null);
        onTouchEnd?.();
      },
    })
  ).current;

  // Re-declare internal helpers for path generation
  
  const generateSVGPath = (points: Array<{ x: number; y: number }>): string => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const getStrokePath = (index: number): string => {
      // Get path definition for a specific stroke index from idealPath
      if (!idealPath.strokeBoundaries || idealPath.strokeBoundaries.length <= index + 1) return '';
      
      const start = idealPath.strokeBoundaries[index];
      const end = idealPath.strokeBoundaries[index + 1];
      
      // Safety check
      if (start === undefined || end === undefined) return '';

      const segmentPoints = idealPath.points.slice(start, end); 
      if (segmentPoints.length === 0) return '';
      
      return segmentPoints.reduce((path, pt, i) => {
          return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
      }, '');
  };
  
  const getArrowInfo = () => {
       // Get arrow position and rotation for the end of the current stroke
      if (activeStrokeIndex >= idealPath.strokeBoundaries.length - 1) return null;
      
      // We want the arrow at the END of the CURRENT stroke
      const endIdx = idealPath.strokeBoundaries[activeStrokeIndex + 1] - 1; // -1 to get the last point index
      
      if (endIdx < 5 || endIdx >= idealPath.points.length) return null;
      
      const p2 = idealPath.points[endIdx];
      const p1 = idealPath.points[endIdx - 5]; // 5 points back for direction
      
      if (!p1 || !p2) return null;
      
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
      return { x: p2.x, y: p2.y, rotation: angle };
  };

  const handAnim = useRef(new Animated.Value(0)).current;

  // Remove the old bobbing useEffect specifically, merged into the new one above.
  
  const handPos = getHandPosition();
  const arrowInfo = getArrowInfo();

  return (
    <View style={[styles.container, { width, height }]} {...panResponder.panHandlers}>
      <Svg 
        width={width} 
        height={height} 
        viewBox={`${viewBoxMinX} ${viewBoxMinY} ${zoomedViewBoxWidth} ${zoomedViewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={styles.svg}
      >
        <Defs>
            <Marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
            >
                <Path d="M 0 0 L 10 5 L 0 10 z" fill="#2196F3" />
            </Marker>
        </Defs>

        {showGuidelines && showGrid && (
          <G opacity={0.2}>
            <Line x1={0} y1={CANVAS_CONFIG.baseline} x2={CANVAS_CONFIG.width} y2={CANVAS_CONFIG.baseline} stroke="#52656d" strokeWidth={2} strokeDasharray="10,10" />
            <Line x1={CANVAS_CONFIG.centerX} y1={0} x2={CANVAS_CONFIG.centerX} y2={CANVAS_CONFIG.height} stroke="#52656d" strokeWidth={2} strokeDasharray="10,10" />
             <Line x1={0} y1={CANVAS_CONFIG.centerY} x2={CANVAS_CONFIG.width} y2={CANVAS_CONFIG.centerY} stroke="#52656d" strokeWidth={2} strokeDasharray="10,10" />
          </G>
        )}

        {showGuidelines && (
          <G opacity={0.15}>
            {idealPath.strokeBoundaries.slice(0, -1).map((_, idx) => (
                <Path
                    key={`stroke-${idx}`}
                    d={getStrokePath(idx)}
                    stroke="#BCBCBC" 
                    strokeWidth={40} 
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={1} 
                />
            ))}
          </G>
        )}

        {showGuidelines && showStrokeHints && idealPath.strokeBoundaries.slice(0, -1).map((_, idx) => {
            const strokeIndex = idx;
            const pointStartIndex = idealPath.strokeBoundaries[strokeIndex];
            const startPoint = idealPath.points[pointStartIndex];
            if (!startPoint) return null;

            return (
                <G key={`hint-${idx}`}>
                    <Circle cx={startPoint.x} cy={startPoint.y} r={18} fill="#37464F" />
                    <SvgText x={startPoint.x} y={startPoint.y + 6} fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">{idx + 1}</SvgText>
                </G>
            );
        })}

        {showGuidelines && activeStrokeIndex < idealPath.strokeBoundaries.length && (
            <G>
                {showActiveStrokeBackground && (
                    <Path d={getStrokePath(activeStrokeIndex)} stroke="#2b3b45" strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
                
                {showActiveStrokeGuide && (
                    <Path d={getStrokePath(activeStrokeIndex)} stroke="#58CC02" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="15,10" opacity={0.6} />
                )}
                
                {/* START DOT - Only show in interactive mode or if specifically desired */}
                {!autoPlay && showStrokeHints && (() => {
                   const startIdx = activeStrokeIndex === 0 ? 0 : idealPath.strokeBoundaries[activeStrokeIndex - 1];
                   const startPoint = idealPath.points[startIdx];
                   if (startPoint) {
                       return (
                           <G>
                               <Circle cx={startPoint.x} cy={startPoint.y} r={18} fill="#58CC02" opacity={0.4} />
                               <Circle cx={startPoint.x} cy={startPoint.y} r={10} fill="#58CC02" />
                               <Circle cx={startPoint.x} cy={startPoint.y} r={4} fill="#fff" />
                           </G>
                       )
                   }
                   return null;
                })()}

                {showStrokeHints && arrowInfo && (
                    <G x={arrowInfo.x} y={arrowInfo.y} rotation={arrowInfo.rotation}>
                         <Polygon points="0,0 -12,-8 -12,8" fill="#58CC02" />
                    </G>
                )}
            </G>
        )}
        
        {permanentPaths.map((path, index) => (
             <Path key={`perm-${index}`} d={path} stroke="#58CC02" strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}

        <Path
          d={generateSVGPath(userPath)}
          stroke={(validationFeedback?.isValid ?? isOnTrack) ? '#58CC02' : '#FF4B4B'}
          strokeWidth={20}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {currentPosition && (
          <Circle cx={currentPosition.x} cy={currentPosition.y} r={25} fill={(validationFeedback?.isValid ?? isOnTrack) ? '#58CC02' : '#FF4B4B'} opacity={0.3} />
        )}
      </Svg>
      
      {/* Hand Component (Overlay) */}
      {showGuidelines && showHand && handPos && (
          <View 
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: width,
                height: height,
                pointerEvents: 'none',
            }}
          >
              <Animated.View
                style={{
                    position: 'absolute',
                    left: (handPos.x * scale) + offsetX - 20, 
                    top: (handPos.y * scale) + offsetY,     
                    transform: [
                        { rotate: '-15deg' },
                        // Only bob if NOT auto-playing
                        !autoPlay ? { translateY: handAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, -10, 0] 
                        })} : { translateY: 0 }
                    ]
                }}
              >
                  <Text style={{ fontSize: 40 }}>👆</Text>
              </Animated.View>
          </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#131F24',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#37464F',
  },
  svg: {
    backgroundColor: 'transparent',
  },
});

export default TracingCanvas;
