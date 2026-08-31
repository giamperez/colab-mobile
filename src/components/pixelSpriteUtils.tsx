import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';

export type PixelGrid<T extends string> = (T | null)[][];

export function makeGrid<T extends string>(rows: number, cols: number): PixelGrid<T> {
  return Array.from({ length: rows }, () => Array<T | null>(cols).fill(null));
}

export function cloneGrid<T extends string>(grid: PixelGrid<T>): PixelGrid<T> {
  return grid.map((row) => [...row]);
}

export function rect<T extends string>(
  grid: PixelGrid<T>,
  r0: number,
  r1: number,
  c0: number,
  c1: number,
  color: T
): void {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (grid[r]) grid[r][c] = color;
    }
  }
}

export function px<T extends string>(grid: PixelGrid<T>, r: number, c: number, color: T | null): void {
  if (grid[r]) grid[r][c] = color;
}

export function darken(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export interface PixelSpriteSvgProps<T extends string> {
  grid: PixelGrid<T>;
  colorMap: Record<T, string>;
  gridCols: number;
  pixelSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function PixelSpriteSvg<T extends string>({
  grid,
  colorMap,
  gridCols,
  pixelSize = 2,
  style,
}: PixelSpriteSvgProps<T>) {
  const width = gridCols * pixelSize;
  const height = grid.length * pixelSize;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style}>
      <G>
        {grid.map((row, rowIdx) =>
          row.map((colorKey, colIdx) => {
            if (!colorKey) return null;
            const fill = colorMap[colorKey];
            if (!fill) return null;
            return (
              <Rect
                key={`${rowIdx}-${colIdx}`}
                x={colIdx * pixelSize}
                y={rowIdx * pixelSize}
                width={pixelSize}
                height={pixelSize}
                fill={fill}
              />
            );
          })
        )}
      </G>
    </Svg>
  );
}
