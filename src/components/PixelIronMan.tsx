import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';

export type IronManPose = 'flying' | 'sleeping' | 'pointing' | 'grabbing' | 'pushing' | 'alert' | 'celebrating';

const IRON_MAN_COLORS = {
  black: '#050505',
  white: '#f2f2f2',
  red: '#B71A1A',
  yellow: '#EDD712',
  orange: '#F49715',
  aqua1: '#20EAF8',
  aqua2: '#62A7BC',
  gray1: '#BFBFBF',
  gray2: '#868686',
} as const;

type ColorKey = keyof typeof IRON_MAN_COLORS | null;
type PixelRow = ColorKey[];
type PixelGrid = PixelRow[];

const B = 'black' as const;
const W = 'white' as const;
const R = 'red' as const;
const Y = 'yellow' as const;
const O = 'orange' as const;
const A1 = 'aqua1' as const;
const A2 = 'aqua2' as const;
const G1 = 'gray1' as const;
const G2 = 'gray2' as const;
const _ = null;

const baseFlying: PixelGrid = [
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,B,B,B,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,B,B,B,B,B,B,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,B,R,R,R,R,R,R,B,_,_,_,_,_],
  [_,_,_,_,_,_,B,R,Y,Y,R,B,B,B,R,B,_,_,_,_],
  [_,_,_,_,_,_,B,R,Y,Y,R,R,B,R,R,B,_,_,_,_],
  [_,_,_,_,_,_,B,R,Y,Y,Y,R,R,R,Y,Y,Y,R,B,_],
  [_,_,_,_,_,B,R,B,Y,Y,Y,Y,Y,Y,Y,Y,Y,B,R,B],
  [_,_,_,_,_,B,R,B,B,B,B,B,B,B,B,B,B,B,R,B],
  [_,_,_,_,_,B,R,O,W,W,W,B,B,B,W,W,W,O,R,B],
  [_,_,_,_,_,B,R,O,Y,Y,Y,Y,Y,Y,Y,Y,Y,O,R,B],
  [_,_,_,_,_,_,B,R,O,O,Y,Y,Y,Y,Y,O,O,R,B,_],
  [_,_,_,_,_,_,B,R,R,O,Y,Y,Y,Y,Y,O,R,R,B,_],
  [_,_,_,_,_,_,_,B,R,O,B,B,B,B,B,O,R,B,_,_],
  [_,_,_,_,_,_,_,_,B,B,Y,Y,R,Y,Y,B,B,_,_,_],
  [_,_,_,_,_,_,_,B,R,B,R,R,R,R,R,B,R,B,_,_],
  [_,_,_,_,_,_,B,R,R,R,R,B,B,B,R,R,R,R,B,_],
  [_,_,_,_,_,B,Y,Y,B,R,B,W,W,W,B,R,B,Y,Y,B],
  [_,_,_,_,B,R,R,Y,B,R,R,B,W,B,R,R,B,Y,R,B],
  [_,_,_,_,B,W,R,B,B,R,R,R,B,R,R,R,B,B,R,B],
  [_,_,_,_,A1,W,A1,_,B,R,R,R,R,R,R,R,R,B,_,A1,W,A1].slice(0,20),
  [_,_,_,A2,A1,A2,B,Y,Y,R,R,R,R,R,Y,Y,B,A2,A1,A2],
  [_,_,_,_,A1,_,B,R,Y,Y,B,B,B,Y,Y,R,B,_,A1,_],
  [_,_,_,_,A1,B,B,R,R,B,_,_,_,B,R,R,B,B,A1,_],
  [_,_,_,_,A2,B,R,R,R,B,_,_,_,B,R,R,R,B,A2,_],
  [_,_,_,_,G1,B,B,B,B,B,_,_,_,B,B,B,B,B,G1,_],
  [_,_,G2,G1,_,A1,W,A1,_,_,_,_,_,_,A1,W,A1,_,G1,G2],
  [_,G2,G1,G1,G1,A2,W,A2,_,G2,_,G2,_,A2,W,A2,G1,G1,G1,G2],
  [G2,G2,G1,A2,_,A1,_,A2,G1,G2,G1,A2,_,A1,_,A2,G1,G2,G2,_].slice(0,20),
  [_,G2,G2,G1,A2,A1,A2,G1,G1,_,G1,G1,A2,A1,A2,G1,G1,G2,G2,_].slice(0,20),
];

const buildResting = (): PixelGrid => {
  const g = baseFlying.map(r => [...r]);
  for (let r = 26; r < g.length; r++) g[r] = g[r].map(() => _);
  for (let r = 18; r < 26; r++) {
    for (let c = 0; c < 8; c++) g[r][c] = _;
    for (let c = 12; c < 20; c++) g[r][c] = _;
  }
  g[17] = g[17].map((_, c) => (c < 5 || c > 14 ? _ : baseFlying[17][c]));
  return g;
};

const buildSleeping = (): PixelGrid => {
  const g = buildResting();
  if (g[9]) for (let c = 7; c <= 18; c++) if (g[9][c] === O || g[9][c] === W) g[9][c] = B;
  if (g[10]) for (let c = 7; c <= 18; c++) if (g[10][c] === Y || g[10][c] === O) g[10][c] = B;
  return g;
};

const buildPointing = (): PixelGrid => {
  const g = baseFlying.map(r => [...r]);
  if (g[17]) { g[17][3]=B; g[17][4]=R; g[17][5]=R; g[17][6]=R; g[17][7]=R; g[17][8]=Y; }
  if (g[18]) { g[18][2]=B; g[18][3]=R; g[18][4]=Y; g[18][5]=Y; g[18][6]=B; }
  if (g[19]) { g[19][1]=B; g[19][2]=R; g[19][3]=W; g[19][4]=W; g[19][5]=B; }
  if (g[20]) { g[20][0]=A1; g[20][1]=W; g[20][2]=A1; }
  return g;
};

const buildGrabbing = (): PixelGrid => {
  const g = baseFlying.map(r => [...r]);
  if (g[17]) { g[17][3]=B; g[17][4]=Y; g[17][5]=Y; g[17][6]=B; g[17][7]=R; g[17][8]=B; g[17][9]=W; g[17][10]=W; }
  if (g[18]) { g[18][2]=B; g[18][3]=R; g[18][4]=R; g[18][5]=Y; g[18][6]=B; g[18][7]=R; g[18][8]=R; g[18][9]=B; g[18][10]=W; g[18][11]=B; }
  if (g[19]) { g[19][1]=B; g[19][2]=W; g[19][3]=R; g[19][4]=B; g[19][5]=B; g[19][6]=R; g[19][7]=R; g[19][8]=R; g[19][9]=B; g[19][10]=R; }
  if (g[20]) { g[20][0]=A1; g[20][1]=W; g[20][2]=A1; }
  return g;
};

const buildPushing = (): PixelGrid => {
  const g = baseFlying.map(r => [...r]);
  // Raise arms up to push the card from underneath with glowing repulsors
  if (g[12]) { g[12][2]=A1; g[12][3]=W; g[12][4]=A1; g[12][15]=A1; g[12][16]=W; g[12][17]=A1; }
  if (g[13]) { g[13][2]=B; g[13][3]=Y; g[13][4]=Y; g[13][5]=B; g[13][14]=B; g[13][15]=Y; g[13][16]=Y; g[13][17]=B; }
  if (g[14]) { g[14][2]=B; g[14][3]=R; g[14][4]=Y; g[14][5]=B; g[14][14]=B; g[14][15]=Y; g[14][16]=R; g[14][17]=B; }
  if (g[15]) { g[15][2]=B; g[15][3]=R; g[15][4]=R; g[15][5]=B; g[15][14]=B; g[15][15]=R; g[15][16]=R; g[15][17]=B; }
  if (g[16]) { g[16][3]=B; g[16][4]=R; g[16][5]=R; g[16][14]=R; g[16][15]=R; g[16][16]=B; }
  // Chest Arc reactor glowing bright white/aqua
  if (g[17]) { g[17][7]=A1; g[17][8]=W; g[17][9]=W; g[17][10]=W; g[17][11]=W; g[17][12]=A1; }
  if (g[18]) { g[18][8]=A1; g[18][9]=W; g[18][10]=W; g[18][11]=A1; }
  // Supercharged jet flame exhaust below boots
  if (g[26]) {
    g[26][4]=O; g[26][5]=Y; g[26][6]=W; g[26][7]=Y; g[26][8]=O;
    g[26][11]=O; g[26][12]=Y; g[26][13]=W; g[26][14]=Y; g[26][15]=O;
  }
  if (g[27]) {
    g[27][4]=A2; g[27][5]=A1; g[27][6]=W; g[27][7]=A1; g[27][8]=A2;
    g[27][11]=A2; g[27][12]=A1; g[27][13]=W; g[27][14]=A1; g[27][15]=A2;
  }
  if (g[28]) {
    g[28][3]=A2; g[28][4]=A1; g[28][5]=W; g[28][6]=A1; g[28][7]=A2;
    g[28][12]=A2; g[28][13]=A1; g[28][14]=W; g[28][15]=A1; g[28][16]=A2;
  }
  if (g[29]) {
    g[29][4]=A1; g[29][5]=W; g[29][6]=A1;
    g[29][13]=A1; g[29][14]=W; g[29][15]=A1;
  }
  return g;
};

const buildAlert = (): PixelGrid => {
  const g = baseFlying.map(r => [...r]);
  // Alert pose: warning orange eyes and alert stance
  if (g[9]) for (let c = 7; c <= 18; c++) if (g[9][c] === W) g[9][c] = O;
  if (g[10]) for (let c = 7; c <= 18; c++) if (g[10][c] === Y) g[10][c] = O;
  if (g[17]) { g[17][8]=O; g[17][9]=W; g[17][10]=O; }
  if (g[18]) { g[18][8]=O; g[18][9]=W; g[18][10]=O; }
  return g;
};

const buildCelebrating = (): PixelGrid => {
  const g = baseFlying.map(r => [...r]);
  // Celebrating pose: arms raised with victory gesture
  if (g[14]) { g[14][1]=B; g[14][2]=Y; g[14][3]=Y; g[14][4]=B; g[14][15]=B; g[14][16]=Y; g[14][17]=Y; g[14][18]=B; }
  if (g[15]) { g[15][1]=B; g[15][2]=R; g[15][3]=R; g[15][4]=B; g[15][15]=B; g[15][16]=R; g[15][17]=R; g[15][18]=B; }
  if (g[16]) { g[16][2]=B; g[16][3]=R; g[16][4]=R; g[16][15]=R; g[16][16]=R; g[16][17]=B; }
  if (g[17]) { g[17][8]=A1; g[17][9]=W; g[17][10]=A1; }
  return g;
};

const POSE_MAP: Record<IronManPose, PixelGrid> = {
  flying: baseFlying,
  sleeping: buildSleeping(),
  pointing: buildPointing(),
  grabbing: buildGrabbing(),
  pushing: buildPushing(),
  alert: buildAlert(),
  celebrating: buildCelebrating(),
};

const GRID_COLS = 20;
const GRID_ROWS = 30;

export interface PixelIronManProps {
  pose?: IronManPose;
  pixelSize?: number;
  halfBody?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PixelIronMan: React.FC<PixelIronManProps> = ({
  pose = 'flying',
  pixelSize = 3,
  halfBody = false,
  style,
}) => {
  const fullGrid = POSE_MAP[pose] ?? baseFlying;
  const grid = halfBody ? fullGrid.slice(0, 20) : fullGrid;
  const width = GRID_COLS * pixelSize;
  const height = grid.length * pixelSize;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style}>
      <G>
        {grid.map((row, rowIdx) =>
          row.map((colorKey, colIdx) => {
            if (!colorKey) return null;
            const fill = IRON_MAN_COLORS[colorKey];
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
};
