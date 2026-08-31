import React, { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { makeGrid, cloneGrid, rect, px, darken, PixelGrid, PixelSpriteSvg } from './pixelSpriteUtils';
import { PetColorwayId, getPetColorway } from './petColorways';
import type { PetPose } from './PixelDog';

type CatColorKey = 'B' | 'O' | 'D' | 'C' | 'W' | 'P';

const GRID_COLS = 22;
const GRID_ROWS = 18;

// Sitting cat, front-facing — pointy ears, almond eyes, curled tail. All poses derive from this base.
const buildBaseCat = (): PixelGrid<CatColorKey> => {
  const g = makeGrid<CatColorKey>(GRID_ROWS, GRID_COLS);

  // Ears
  px(g, 0, 6, 'B');
  px(g, 1, 5, 'B'); px(g, 1, 6, 'O'); px(g, 1, 7, 'B');
  px(g, 2, 4, 'B'); px(g, 2, 5, 'O'); px(g, 2, 6, 'C'); px(g, 2, 7, 'O'); px(g, 2, 8, 'B');
  rect(g, 3, 3, 4, 8, 'O'); px(g, 3, 4, 'B'); px(g, 3, 8, 'B');

  px(g, 0, 14, 'B');
  px(g, 1, 13, 'B'); px(g, 1, 14, 'O'); px(g, 1, 15, 'B');
  px(g, 2, 12, 'B'); px(g, 2, 13, 'O'); px(g, 2, 14, 'C'); px(g, 2, 15, 'O'); px(g, 2, 16, 'B');
  rect(g, 3, 3, 12, 16, 'O'); px(g, 3, 12, 'B'); px(g, 3, 16, 'B');

  // Head
  rect(g, 4, 4, 5, 15, 'O'); px(g, 4, 4, 'B'); px(g, 4, 16, 'B');
  rect(g, 5, 5, 5, 15, 'O'); px(g, 5, 4, 'B'); px(g, 5, 16, 'B');

  // Eyes row (almond)
  rect(g, 6, 6, 5, 15, 'O'); px(g, 6, 4, 'B'); px(g, 6, 16, 'B');
  px(g, 6, 7, 'B'); px(g, 6, 8, 'B'); px(g, 6, 12, 'B'); px(g, 6, 13, 'B');

  rect(g, 7, 7, 5, 15, 'O'); px(g, 7, 4, 'B'); px(g, 7, 16, 'B');

  // Whiskers (cat-specific, dog has none)
  px(g, 8, 1, 'D'); px(g, 8, 2, 'D');
  px(g, 8, 18, 'D'); px(g, 8, 19, 'D');

  // Muzzle
  px(g, 8, 4, 'B'); px(g, 8, 16, 'B');
  rect(g, 8, 8, 5, 8, 'O'); rect(g, 8, 8, 9, 11, 'C'); rect(g, 8, 8, 12, 15, 'O');

  // Nose + mouth
  px(g, 9, 4, 'B'); px(g, 9, 16, 'B');
  rect(g, 9, 9, 5, 8, 'O'); px(g, 9, 9, 'C'); px(g, 9, 10, 'P'); px(g, 9, 11, 'C'); rect(g, 9, 9, 12, 15, 'O');

  // Chin
  px(g, 10, 4, 'B'); px(g, 10, 16, 'B');
  rect(g, 10, 10, 5, 8, 'O'); rect(g, 10, 10, 9, 11, 'C'); rect(g, 10, 10, 12, 15, 'O');

  // Chest / neck
  for (const r of [11, 12, 13]) {
    px(g, r, 3, 'B'); px(g, r, 17, 'B');
    rect(g, r, r, 4, 6, 'O'); rect(g, r, r, 7, 13, 'C'); rect(g, r, r, 14, 16, 'O');
  }

  // Front legs / paws
  px(g, 14, 3, 'B'); px(g, 14, 17, 'B');
  rect(g, 14, 14, 4, 7, 'O'); rect(g, 14, 14, 8, 9, 'D'); px(g, 14, 10, 'C'); rect(g, 14, 14, 11, 12, 'D'); rect(g, 14, 14, 13, 16, 'O');

  px(g, 15, 3, 'B'); px(g, 15, 17, 'B');
  rect(g, 15, 15, 4, 7, 'O'); rect(g, 15, 15, 8, 9, 'D'); px(g, 15, 10, 'O'); rect(g, 15, 15, 11, 12, 'D'); rect(g, 15, 15, 13, 16, 'O');

  px(g, 16, 3, 'B'); px(g, 16, 17, 'B');
  rect(g, 16, 16, 4, 7, 'O'); rect(g, 16, 16, 8, 9, 'W'); px(g, 16, 10, 'O'); rect(g, 16, 16, 11, 12, 'W'); rect(g, 16, 16, 13, 16, 'O');

  rect(g, 17, 17, 3, 17, 'B');

  // Long tail sweeping down and wrapping around the side (distinct from the dog's over-the-back curl)
  px(g, 12, 18, 'B'); px(g, 12, 19, 'O');
  px(g, 13, 19, 'B'); px(g, 13, 20, 'O');
  px(g, 14, 20, 'B'); px(g, 14, 21, 'O');
  px(g, 15, 20, 'O'); px(g, 15, 21, 'B');
  px(g, 16, 19, 'B'); px(g, 16, 20, 'W');

  return g;
};

const baseCat = buildBaseCat();

const buildSleeping = (): PixelGrid<CatColorKey> => {
  const g = cloneGrid(baseCat);
  px(g, 6, 7, 'D'); px(g, 6, 8, 'D'); px(g, 6, 12, 'D'); px(g, 6, 13, 'D');
  return g;
};

const buildAlert = (): PixelGrid<CatColorKey> => {
  const g = cloneGrid(baseCat);
  px(g, 5, 7, 'D'); px(g, 5, 8, 'D'); px(g, 5, 12, 'D'); px(g, 5, 13, 'D');
  return g;
};

const clearFrontLegs = (g: PixelGrid<CatColorKey>) => {
  rect(g, 14, 16, 8, 9, 'O');
  rect(g, 14, 16, 11, 12, 'O');
};

const buildPointing = (): PixelGrid<CatColorKey> => {
  const g = cloneGrid(baseCat);
  rect(g, 14, 16, 11, 12, 'O');
  rect(g, 10, 10, 15, 16, 'D'); rect(g, 11, 11, 15, 16, 'D'); rect(g, 12, 12, 15, 16, 'W');
  return g;
};

const buildGrabbing = (): PixelGrid<CatColorKey> => {
  const g = cloneGrid(baseCat);
  clearFrontLegs(g);
  rect(g, 14, 14, 5, 6, 'D'); rect(g, 14, 14, 14, 15, 'D');
  rect(g, 15, 15, 5, 6, 'D'); rect(g, 15, 15, 14, 15, 'D');
  rect(g, 16, 16, 5, 6, 'W'); rect(g, 16, 16, 14, 15, 'W');
  return g;
};

const buildPushing = (): PixelGrid<CatColorKey> => {
  const g = cloneGrid(baseCat);
  clearFrontLegs(g);
  rect(g, 9, 9, 3, 4, 'D'); rect(g, 10, 10, 3, 4, 'D'); rect(g, 11, 11, 3, 4, 'W');
  rect(g, 9, 9, 16, 17, 'D'); rect(g, 10, 10, 16, 17, 'D'); rect(g, 11, 11, 16, 17, 'W');
  return g;
};

const buildCelebrating = (): PixelGrid<CatColorKey> => {
  const g = cloneGrid(baseCat);
  clearFrontLegs(g);
  rect(g, 2, 2, 1, 2, 'D'); rect(g, 3, 3, 1, 2, 'D'); rect(g, 4, 4, 1, 2, 'W');
  rect(g, 2, 2, 18, 19, 'D'); rect(g, 3, 3, 18, 19, 'D'); rect(g, 4, 4, 18, 19, 'W');
  return g;
};

const POSE_MAP: Record<PetPose, PixelGrid<CatColorKey>> = {
  flying: baseCat,
  sleeping: buildSleeping(),
  pointing: buildPointing(),
  grabbing: buildGrabbing(),
  pushing: buildPushing(),
  alert: buildAlert(),
  celebrating: buildCelebrating(),
};

export interface PixelCatProps {
  pose?: PetPose;
  pixelSize?: number;
  halfBody?: boolean;
  colorway?: PetColorwayId;
  style?: StyleProp<ViewStyle>;
}

export const PixelCat: React.FC<PixelCatProps> = ({
  pose = 'flying',
  pixelSize = 3,
  halfBody = false,
  colorway = 'ash',
  style,
}) => {
  const fullGrid = POSE_MAP[pose] ?? baseCat;
  const grid = halfBody ? fullGrid.slice(0, 12) : fullGrid;

  const colorMap = useMemo(() => {
    const palette = getPetColorway(colorway);
    return {
      B: '#1A140D',
      O: palette.main,
      D: darken(palette.main, 0.22),
      C: palette.secondary,
      W: '#FFFFFF',
      P: '#F2799A',
    } as Record<CatColorKey, string>;
  }, [colorway]);

  return <PixelSpriteSvg grid={grid} colorMap={colorMap} gridCols={GRID_COLS} pixelSize={pixelSize} style={style} />;
};

export default PixelCat;
