
/**
 * Largest Triangle Three Buckets (LTTB) data downsampling algorithm.
 * Reduces the number of data points while preserving the visual shape of the trend.
 * 
 * @param data - Array of data points
 * @param threshold - Target number of data points
 * @param xKey - Key for the x-axis value (default: 'x')
 * @param yKey - Key for the y-axis value (default: 'y')
 * @returns Downsampled array of data points
 */
export function lttb<T>(data: T[], threshold: number, xKey: keyof T = 'x' as keyof T, yKey: keyof T = 'y' as keyof T): T[] {
  if (!data || data.length <= threshold || threshold < 3) {
    return data;
  }

  const sampled: T[] = [];
  let sampledIndex = 0;

  // Bucket size. Leave room for start and end data points
  const every = (data.length - 2) / (threshold - 2);

  let a = 0; // Initially a is the first point in the triangle
  let maxAreaPoint: T | null = null;
  let maxArea: number;
  let area: number;
  let nextA: number;

  // Always add the first point
  sampled[sampledIndex++] = data[a];

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (containing c)
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * every) + 1;
    let avgRangeEnd = Math.floor((i + 2) * every) + 1;
    avgRangeEnd = avgRangeEnd < data.length ? avgRangeEnd : data.length;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      // We need to handle different types for x (number, date, string)
      // For calculation, we need numbers.
      const xVal = getNumericValue(data[avgRangeStart][xKey]);
      const yVal = Number(data[avgRangeStart][yKey]);
      
      avgX += xVal;
      avgY += yVal;
    }

    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    let rangeOffs = Math.floor((i + 0) * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    // Point a
    const pointAX = getNumericValue(data[a][xKey]);
    const pointAY = Number(data[a][yKey]);

    maxArea = -1;
    maxAreaPoint = null;

    for (; rangeOffs < rangeTo; rangeOffs++) {
      // Calculate triangle area over three buckets
      const pointBX = getNumericValue(data[rangeOffs][xKey]);
      const pointBY = Number(data[rangeOffs][yKey]);
      
      area = Math.abs(
        (pointAX - avgX) * (pointBY - pointAY) -
        (pointAX - pointBX) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[rangeOffs];
        nextA = rangeOffs;
      }
    }

    if (maxAreaPoint) {
      sampled[sampledIndex++] = maxAreaPoint;
      a = nextA!; // This a is the next a (chosen b)
    }
  }

  // Always add the last point
  sampled[sampledIndex++] = data[data.length - 1];

  return sampled;
}

function getNumericValue(val: any): number {
  if (typeof val === 'number') return val;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'string') {
    const num = parseFloat(val);
    if (!isNaN(num)) return num;
    const date = new Date(val);
    if (!isNaN(date.getTime())) return date.getTime();
  }
  return 0;
}
