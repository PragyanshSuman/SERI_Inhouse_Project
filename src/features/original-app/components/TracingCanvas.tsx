import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Animated,
  Easing,
  Text,
} from 'react-native';
import Svg, { Path, Circle, Line, G, Defs, Marker, Polygon, Text as SvgText } from 'react-native-svg';
import { IdealPathData } from '../models/TracingData';
import { CANVAS_CONFIG } from '../constants/LetterPaths';

interface TracingCanvasProps {
  idealPath: IdealPathData;
  activeStrokeIndex: number;
  letterStrokes?: any[];
  onTouchStart?: (x: number, y: number) => void;
  onTouchMove?: (x: number, y: number, pressure: number) => void;
  onTouchEnd?: () => void;
  showGuidelines?: boolean;
  onStrokeComplete?: (strokeIndex: number) => void;
  width?: number;
  height?: number;
  showHand?: boolean;
  showStrokeHints?: boolean;
  autoPlay?: boolean;
  isDemo?: boolean; // Support both names for flexibility
  showGrid?: boolean;
  showActiveStrokeBackground?: boolean;
  showActiveStrokeGuide?: boolean;
  isBareMode?: boolean; // New minimalism mode
  letterPath?: any; // To prevent error if passed, though we should handle it
  resetTrigger?: number; // External trigger to clear the canvas
}

const TracingCanvas: React.FC<TracingCanvasProps> = ({
  idealPath,
  activeStrokeIndex,
  letterStrokes,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  showGuidelines = true,
  onStrokeComplete,
  width = 300,
  height = 400,
  showHand = true,
  showStrokeHints = true,
  autoPlay = false,
  isDemo = false,
  showGrid = true,
  showActiveStrokeBackground = true,
  showActiveStrokeGuide = true,
  isBareMode = false,
  resetTrigger = 0,
}) => {
  const [userPath, setUserPath] = useState<Array<{ x: number; y: number }>>([]);
  const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number } | null>(null);
  const [permanentPaths, setPermanentPaths] = useState<string[]>([]);

  const pathRef = useRef<Array<{ x: number; y: number }>>([]);
  
  // Fix stale PanResponder closures
  const propsRef = useRef({ autoPlay, activeStrokeIndex, onTouchStart, onTouchMove, onTouchEnd, onStrokeComplete });
  useEffect(() => {
    propsRef.current = { autoPlay, activeStrokeIndex, onTouchStart, onTouchMove, onTouchEnd, onStrokeComplete };
  });

  // Auto-play animation state
  const autoPlayAnim = useRef(new Animated.Value(0)).current;
  const [demoHandPos, setDemoHandPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setPermanentPaths([]);
    setUserPath([]);
    pathRef.current = [];
  }, [idealPath, resetTrigger]);

  // Hand / auto-play animation
  useEffect(() => {
    if (!showHand || !idealPath) return;

    if (autoPlay || isDemo) {
      Animated.loop(
        Animated.timing(autoPlayAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
          easing: Easing.linear,
        })
      ).start();

      const listenerId = autoPlayAnim.addListener(({ value }) => {
        if (!idealPath || !idealPath.points || idealPath.points.length === 0) return;
        const totalPoints = idealPath.points.length;
        const index = Math.min(Math.floor(value * totalPoints), totalPoints - 1);
        const point = idealPath.points[index];
        if (point) {
          setDemoHandPos({ x: point.x, y: point.y });
          let currentStrokeIndex = 0;
          if (idealPath.strokeBoundaries && idealPath.strokeBoundaries.length > 0) {
            for (let i = 0; i < idealPath.strokeBoundaries.length - 1; i++) {
              if (index >= idealPath.strokeBoundaries[i] && index < idealPath.strokeBoundaries[i + 1]) {
                currentStrokeIndex = i;
                break;
              }
            }
          }
          const newPermanentPaths: string[] = [];
          for (let i = 0; i < currentStrokeIndex; i++) {
            newPermanentPaths.push(getStrokePath(i));
          }
          setPermanentPaths(newPermanentPaths);
          const startIdx = idealPath.strokeBoundaries[currentStrokeIndex];
          const currentSegmentPoints = idealPath.points.slice(startIdx, index + 1);
          setUserPath(currentSegmentPoints);
        }
      });

      return () => {
        autoPlayAnim.removeAllListeners();
        autoPlayAnim.setValue(0);
        setPermanentPaths([]);
        setUserPath([]);
      };
    } else {
      if (!showGuidelines || !idealPath) return;
      handAnim.setValue(0);
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(handAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.delay(500),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [activeStrokeIndex, showHand, autoPlay, idealPath]);

  const getHandPosition = () => {
    if (autoPlay || isDemo) return demoHandPos;
    if (!idealPath || !idealPath.points || !idealPath.strokeBoundaries) return null;
    if (activeStrokeIndex >= idealPath.strokeBoundaries.length) return null;
    const startIdx = activeStrokeIndex === 0 ? 0 : idealPath.strokeBoundaries[activeStrokeIndex]; // Corrected index logic
    return idealPath.points[startIdx];
  };

  const viewBoxWidth = CANVAS_CONFIG.width;
  const viewBoxHeight = CANVAS_CONFIG.height;

  const getContentBounds = () => {
    if (!idealPath.points || idealPath.points.length === 0) {
      return { minX: 0, maxX: viewBoxWidth, minY: 0, maxY: viewBoxHeight, centerX: viewBoxWidth / 2, centerY: viewBoxHeight / 2 };
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of idealPath.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
  };

  const bounds = getContentBounds();
  const zoomLevel = 1.35;
  const zoomedViewBoxWidth = viewBoxWidth / zoomLevel;
  const zoomedViewBoxHeight = viewBoxHeight / zoomLevel;
  const viewBoxMinX = bounds.centerX - (zoomedViewBoxWidth / 2) - 35;
  const viewBoxMinY = bounds.centerY - (zoomedViewBoxHeight / 2) - 35;
  const scale = Math.min(width / zoomedViewBoxWidth, height / zoomedViewBoxHeight);
  const renderedWidth = zoomedViewBoxWidth * scale;
  const renderedHeight = zoomedViewBoxHeight * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;

  // Function to map screen coordinates to SVG coordinates (zoom-aware)
  const getSvgCoordinates = (screenX: number, screenY: number) => {
    // Add aggressive ergonomic Y-offset to explicitly counter Android PanResponder
    // locationY calculation bugs with SafeAreaViews AND to bring the ink up to the tip.
    const fingertipOffsetY = 80; 
    
    const relativeX = (screenX - offsetX) / scale;
    const relativeY = ((screenY - fingertipOffsetY) - offsetY) / scale;
    return { 
        x: relativeX + viewBoxMinX, 
        y: relativeY + viewBoxMinY 
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !propsRef.current.autoPlay,
      onMoveShouldSetPanResponder: () => !propsRef.current.autoPlay,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        if (propsRef.current.autoPlay) return;
        pathRef.current = [];
        const { locationX, locationY } = evt.nativeEvent;
        const { x, y } = getSvgCoordinates(locationX, locationY);
        
        pathRef.current.push({ x, y });
        setUserPath([...pathRef.current]);
        setCurrentPosition({ x, y });
        
        // Pass SVG coords to parent for analysis using the latest function reference
        propsRef.current.onTouchStart?.(x, y);
      },
      onPanResponderMove: (evt: GestureResponderEvent, _gs: PanResponderGestureState) => {
        if (propsRef.current.autoPlay) return;
        const { locationX, locationY } = evt.nativeEvent;
        const force = (evt.nativeEvent as any).force || 1.0;
        const { x, y } = getSvgCoordinates(locationX, locationY);
        
        pathRef.current.push({ x, y });
        setUserPath([...pathRef.current]);
        setCurrentPosition({ x, y });
        
        propsRef.current.onTouchMove?.(x, y, force);
      },
      onPanResponderRelease: () => {
        if (propsRef.current.autoPlay) return;
        const pointsToSave = [...pathRef.current];
        if (pointsToSave.length > 5) {
          setPermanentPaths(prev => [...prev, generateSVGPath(pointsToSave)]);
          // Use latest known stroke index
          propsRef.current.onStrokeComplete?.(propsRef.current.activeStrokeIndex);
        }
        setUserPath([]);
        pathRef.current = [];
        setCurrentPosition(null);
        propsRef.current.onTouchEnd?.();
      },
      onPanResponderTerminate: () => {
        if (propsRef.current.autoPlay) return;
        const pointsToSave = [...pathRef.current];
        if (pointsToSave.length > 5) {
          setPermanentPaths(prev => [...prev, generateSVGPath(pointsToSave)]);
        }
        setUserPath([]);
        pathRef.current = [];
        setCurrentPosition(null);
        propsRef.current.onTouchEnd?.();
      },
    })
  ).current;

  const generateSVGPath = (points: Array<{ x: number; y: number }>): string => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const getStrokePath = (index: number): string => {
    if (!idealPath.strokeBoundaries || idealPath.strokeBoundaries.length <= index + 1) return '';
    const start = idealPath.strokeBoundaries[index];
    const end = idealPath.strokeBoundaries[index + 1];
    if (start === undefined || end === undefined) return '';
    const segmentPoints = idealPath.points.slice(start, end);
    if (segmentPoints.length === 0) return '';
    return segmentPoints.reduce((path, pt, i) =>
      i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`, '');
  };

  const getArrowInfo = () => {
    if (!idealPath || !idealPath.strokeBoundaries || !idealPath.points) return null;
    if (activeStrokeIndex < 0 || activeStrokeIndex >= idealPath.strokeBoundaries.length - 1) return null;
    const endIdx = idealPath.strokeBoundaries[activeStrokeIndex + 1] - 1;
    if (endIdx < 5 || endIdx >= idealPath.points.length) return null;
    const p2 = idealPath.points[endIdx];
    const p1 = idealPath.points[endIdx - 5];
    if (!p1 || !p2) return null;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    return { x: p2.x, y: p2.y, rotation: angle };
  };

  const handAnim = useRef(new Animated.Value(0)).current;
  const handPos = getHandPosition();
  const arrowInfo = getArrowInfo();

  return (
    <View style={[styles.container, { width, height, backgroundColor: isBareMode ? '#1C2938' : '#131F24' }]} {...panResponder.panHandlers}>
      <Svg
        pointerEvents="none"
        width={width}
        height={height}
        viewBox={`${viewBoxMinX} ${viewBoxMinY} ${zoomedViewBoxWidth} ${zoomedViewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={styles.svg}
      >
        <Defs>
          <Marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <Path d="M 0 0 L 10 5 L 0 10 z" fill="#2196F3" />
          </Marker>
        </Defs>

        {/* Grid lines */}
        {showGuidelines && showGrid && !isBareMode && (
          <G opacity={0.2}>
            <Line x1={0} y1={CANVAS_CONFIG.baseline} x2={CANVAS_CONFIG.width} y2={CANVAS_CONFIG.baseline} stroke="#52656d" strokeWidth={2} strokeDasharray="10,10" />
            <Line x1={CANVAS_CONFIG.centerX} y1={0} x2={CANVAS_CONFIG.centerX} y2={CANVAS_CONFIG.height} stroke="#52656d" strokeWidth={2} strokeDasharray="10,10" />
            <Line x1={0} y1={CANVAS_CONFIG.centerY} x2={CANVAS_CONFIG.width} y2={CANVAS_CONFIG.centerY} stroke="#52656d" strokeWidth={2} strokeDasharray="10,10" />
          </G>
        )}

        {/* Ghost template — all strokes faint */}
        {idealPath && idealPath.strokeBoundaries && (
          <G opacity={isBareMode ? 0.08 : 0.15}>
            {idealPath.strokeBoundaries.slice(0, -1).map((_, idx) => (
              <Path key={`stroke-${idx}`} d={getStrokePath(idx)} stroke={isBareMode ? "#fff" : "#BCBCBC"} strokeWidth={isBareMode ? 45 : 40} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </G>
        )}

        {/* Stroke number hints */}
        {showGuidelines && showStrokeHints && !isBareMode && idealPath.strokeBoundaries.slice(0, -1).map((_, idx) => {
          const startPoint = idealPath.points[idealPath.strokeBoundaries[idx]];
          if (!startPoint) return null;
          return (
            <G key={`hint-${idx}`}>
              <Circle cx={startPoint.x} cy={startPoint.y} r={18} fill="#37464F" />
              <SvgText x={startPoint.x} y={startPoint.y + 6} fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">{idx + 1}</SvgText>
            </G>
          );
        })}

        {/* Active stroke visual guide */}
        {showGuidelines && !isBareMode && idealPath && activeStrokeIndex >= 0 && activeStrokeIndex < idealPath.strokeBoundaries.length && (
          <G>
            {showActiveStrokeBackground && (
              <Path d={getStrokePath(activeStrokeIndex)} stroke="#2b3b45" strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {showActiveStrokeGuide && (
              <Path d={getStrokePath(activeStrokeIndex)} stroke="#58CC02" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="15,10" opacity={0.6} />
            )}
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
                );
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

        {/* Permanent user paths — always WHITE/NEUTRAL, no accuracy coloring */}
        {permanentPaths.map((path, index) => (
          <Path key={`perm-${index}`} d={path} stroke="#fff" strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
        ))}

        {/* Current live stroke — always white/neutral */}
        <Path
          d={generateSVGPath(userPath)}
          stroke="#fff"
          strokeWidth={20}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Fingertip indicator */}
        {currentPosition && (
          <Circle cx={currentPosition.x} cy={currentPosition.y} r={25} fill="#fff" opacity={0.25} />
        )}
      </Svg>

      {/* Animated hand */}
      {showGuidelines && showHand && !isBareMode && handPos && (
        <View style={{ position: 'absolute', left: 0, top: 0, width, height, pointerEvents: 'none' }}>
          <Animated.View
            style={{
              position: 'absolute',
              left: (handPos.x * scale) + offsetX - 20,
              top: (handPos.y * scale) + offsetY,
              transform: [
                { rotate: '-15deg' },
                !autoPlay ? { translateY: handAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -10, 0] }) } : { translateY: 0 }
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
