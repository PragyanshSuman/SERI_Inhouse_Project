import { Point, PathSegment, GuidelinePoint, IdealPathData } from '../models/TracingData';
import { distance, bezierPoint, perpendicularNormal, pointToLineDistance } from './MathUtils';

/**
 * Generate ideal path points from letter path segments
 */
export const generateIdealPath = (strokes: PathSegment[][], samplesPerSegment: number = 30): IdealPathData => {
    const allPoints: GuidelinePoint[] = [];
    const strokeBoundaries: number[] = [0];
    let totalLength = 0;
    let globalIndex = 0;

    for (const stroke of strokes) {
        for (const segment of stroke) {
            const segmentPoints = sampleSegment(segment, samplesPerSegment);

            for (let i = 0; i < segmentPoints.length; i++) {
                const point = segmentPoints[i];

                // Calculate normal vector for this point
                let normal = { x: 0, y: 1 };

                if (i > 0 && i < segmentPoints.length - 1) {
                    const prev = segmentPoints[i - 1];
                    const next = segmentPoints[i + 1];
                    normal = perpendicularNormal(prev, next);
                } else if (i === 0 && segmentPoints.length > 1) {
                    const next = segmentPoints[i + 1];
                    normal = perpendicularNormal(point, next);
                } else if (i === segmentPoints.length - 1 && segmentPoints.length > 1) {
                    const prev = segmentPoints[i - 1];
                    normal = perpendicularNormal(prev, point);
                }

                allPoints.push({
                    x: point.x,
                    y: point.y,
                    index: globalIndex++,
                    normalX: normal.x,
                    normalY: normal.y,
                });

                if (i > 0) {
                    totalLength += distance(segmentPoints[i - 1], point);
                }
            }
        }

        strokeBoundaries.push(allPoints.length);
    }

    return {
        points: allPoints,
        totalLength,
        strokeBoundaries,
    };
};

/**
 * Sample points along a path segment
 */
const sampleSegment = (segment: PathSegment, samples: number): Point[] => {
    const points: Point[] = [];

    if (segment.type === 'line') {
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            points.push({
                x: segment.start.x + t * (segment.end.x - segment.start.x),
                y: segment.start.y + t * (segment.end.y - segment.start.y),
            });
        }
    } else if (segment.type === 'bezier' && segment.control1 && segment.control2) {
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            points.push(bezierPoint(t, segment.start, segment.control1, segment.control2, segment.end));
        }
    }

    return points;
};
