import React, { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { makeGrid, cloneGrid, rect, px, darken, PixelGrid, PixelSpriteSvg } from './pixelSpriteUtils';
import { PetColorwayId, getPetColorway } from './petColorways';

export type PetPose = 'flying' | 'sleeping' | 'pointing' | 'grabbing' | 'pushing' | 'alert' | 'celebrating';

type DogColorKey = 'B' | 'O' | 'D' | 'C' | 'W' | 'P';

const GRID_COLS = 22;
const GRID_ROWS = 20;

// Shiba Inu, sitting, front-facing — ears up, tongue out. All poses derive from this base.
const buildBaseDog = (): PixelGrid<DogColorKey> => {
  const g = makeGrid<DogColorKey>(GRID_ROWS, GRID_COLS);

  // Ears
  px(g, 0, 5, 'B'); px(g, 0, 6, 'B');
  px(g, 1, 4, 'B'); px(g, 1, 5, 'O'); px(g, 1, 6, 'O'); px(g, 1, 7, 'B');
  rect(g, 2, 3, 3, 3, 'B'); rect(g, 2, 3, 4, 4, 'O'); rect(g, 2, 3, 5, 6, 'C'); rect(g, 2, 3, 7, 7, 'O'); rect(g, 2, 3, 8, 8, 'B');

  px(g, 0, 15, 'B'); px(g, 0, 16, 'B');
  px(g, 1, 14, 'B'); px(g, 1, 15, 'O'); px(g, 1, 16, 'O'); px(g, 1, 17, 'B');
  rect(g, 2, 3, 13, 13, 'B'); rect(g, 2, 3, 14, 14, 'O'); rect(g, 2, 3, 15, 16, 'C'); rect(g, 2, 3, 17, 17, 'O'); rect(g, 2, 3, 18, 18, 'B');

  // Head
  rect(g, 4, 5, 4, 17, 'O'); px(g, 4, 3, 'B'); px(g, 4, 18, 'B'); px(g, 5, 3, 'B'); px(g, 5, 18, 'B');

  // Eyes row
  rect(g, 6, 6, 4, 17, 'O'); px(g, 6, 3, 'B'); px(g, 6, 18, 'B');
  px(g, 6, 7, 'B'); px(g, 6, 8, 'B'); px(g, 6, 13, 'B'); px(g, 6, 14, 'B');

  rect(g, 7, 7, 4, 17, 'O'); px(g, 7, 3, 'B'); px(g, 7, 18, 'B');

  // Muzzle
  px(g, 8, 3, 'B'); px(g, 8, 18, 'B');
  rect(g, 8, 8, 4, 7, 'O'); rect(g, 8, 8, 8, 13, 'C'); rect(g, 8, 8, 14, 17, 'O');

  // Nose
  px(g, 9, 3, 'B'); px(g, 9, 18, 'B');
  rect(g, 9, 9, 4, 7, 'O'); rect(g, 9, 9, 8, 9, 'C'); rect(g, 9, 9, 10, 11, 'B'); rect(g, 9, 9, 12, 13, 'C'); rect(g, 9, 9, 14, 17, 'O');

  // Mouth + tongue
  px(g, 10, 3, 'B'); px(g, 10, 18, 'B');
  rect(g, 10, 10, 4, 7, 'O'); px(g, 10, 8, 'C'); px(g, 10, 9, 'B'); rect(g, 10, 10, 10, 11, 'P'); px(g, 10, 12, 'B'); px(g, 10, 13, 'C'); rect(g, 10, 10, 14, 17, 'O');

  // Chin
  px(g, 11, 3, 'B'); px(g, 11, 18, 'B');
  rect(g, 11, 11, 4, 7, 'O'); rect(g, 11, 11, 8, 13, 'C'); rect(g, 11, 11, 14, 17, 'O');

  // Chest / neck
  for (const r of [12, 13, 14]) {
    px(g, r, 2, 'B'); px(g, r, 19, 'B');
    rect(g, r, r, 3, 5, 'O'); rect(g, r, r, 6, 15, 'C'); rect(g, r, r, 16, 18, 'O');
  }

  // Front legs / paws
  px(g, 15, 2, 'B'); px(g, 15, 19, 'B');
  rect(g, 15, 15, 3, 6, 'O'); rect(g, 15, 15, 7, 8, 'D'); rect(g, 15, 15, 9, 12, 'C'); rect(g, 15, 15, 13, 14, 'D'); rect(g, 15, 15, 15, 18, 'O');

  px(g, 16, 2, 'B'); px(g, 16, 19, 'B');
  rect(g, 16, 16, 3, 6, 'O'); rect(g, 16, 16, 7, 8, 'D'); rect(g, 16, 16, 9, 12, 'O'); rect(g, 16, 16, 13, 14, 'D'); rect(g, 16, 16, 15, 18, 'O');

  px(g, 17, 2, 'B'); px(g, 17, 19, 'B');
  rect(g, 17, 17, 3, 6, 'O'); rect(g, 17, 17, 7, 8, 'W'); rect(g, 17, 17, 9, 12, 'O'); rect(g, 17, 17, 13, 14, 'W'); rect(g, 17, 17, 15, 18, 'O');

  rect(g, 18, 18, 2, 19, 'B');

  // Curled tail (right side)
  px(g, 8, 19, 'B'); px(g, 8, 20, 'O');
  px(g, 9, 19, 'B'); px(g, 9, 20, 'O'); px(g, 9, 21, 'O');
  px(g, 10, 19, 'B'); px(g, 10, 20, 'O'); px(g, 10, 21, 'O');
  px(g, 11, 20, 'O'); px(g, 11, 21, 'W');
  px(g, 12, 20, 'W'); px(g, 12, 21, 'W');
  px(g, 13, 20, 'W'); px(g, 13, 21, 'B');
  px(g, 14, 20, 'B');

  return g;
};

const baseDog = buildBaseDog();

const buildSleeping = (): PixelGrid<DogColorKey> => {
  const g = cloneGrid(baseDog);
  px(g, 6, 7, 'D'); px(g, 6, 8, 'D'); px(g, 6, 13, 'D'); px(g, 6, 14, 'D');
  rect(g, 10, 10, 10, 11, 'C'); px(g, 10, 9, 'C'); px(g, 10, 12, 'C');
  return g;
};

const buildAlert = (): PixelGrid<DogColorKey> => {
  const g = cloneGrid(baseDog);
  px(g, 5, 7, 'D'); px(g, 5, 8, 'D'); px(g, 5, 13, 'D'); px(g, 5, 14, 'D');
  return g;
};

const clearFrontLegs = (g: PixelGrid<DogColorKey>) => {
  rect(g, 15, 17, 7, 8, 'O');
  rect(g, 15, 17, 13, 14, 'O');
};

const buildPointing = (): PixelGrid<DogColorKey> => {
  const g = cloneGrid(baseDog);
  rect(g, 15, 17, 13, 14, 'O');
  rect(g, 11, 11, 16, 17, 'D'); rect(g, 12, 12, 16, 17, 'D'); rect(g, 13, 13, 16, 17, 'W');
  return g;
};

const buildGrabbing = (): PixelGrid<DogColorKey> => {
  const g = cloneGrid(baseDog);
  clearFrontLegs(g);
  rect(g, 15, 15, 5, 6, 'D'); rect(g, 15, 15, 15, 16, 'D');
  rect(g, 16, 16, 5, 6, 'D'); rect(g, 16, 16, 15, 16, 'D');
  rect(g, 17, 17, 5, 6, 'W'); rect(g, 17, 17, 15, 16, 'W');
  return g;
};

const buildPushing = (): PixelGrid<DogColorKey> => {
  const g = cloneGrid(baseDog);
  clearFrontLegs(g);
  rect(g, 10, 10, 4, 5, 'D'); rect(g, 11, 11, 4, 5, 'D'); rect(g, 12, 12, 4, 5, 'W');
  rect(g, 10, 10, 16, 17, 'D'); rect(g, 11, 11, 16, 17, 'D'); rect(g, 12, 12, 16, 17, 'W');
  return g;
};

const buildCelebrating = (): PixelGrid<DogColorKey> => {
  const g = cloneGrid(baseDog);
  clearFrontLegs(g);
  rect(g, 3, 3, 1, 2, 'D'); rect(g, 4, 4, 1, 2, 'D'); rect(g, 5, 5, 1, 2, 'W');
  rect(g, 3, 3, 19, 20, 'D'); rect(g, 4, 4, 19, 20, 'D'); rect(g, 5, 5, 19, 20, 'W');
  return g;
};

const POSE_MAP: Record<PetPose, PixelGrid<DogColorKey>> = {
  flying: baseDog,
  sleeping: buildSleeping(),
  pointing: buildPointing(),
  grabbing: buildGrabbing(),
  pushing: buildPushing(),
  alert: buildAlert(),
  celebrating: buildCelebrating(),
};

export interface PixelDogProps {
  pose?: PetPose;
  pixelSize?: number;
  halfBody?: boolean;
  colorway?: PetColorwayId;
  style?: StyleProp<ViewStyle>;
}

export const PixelDog: React.FC<PixelDogProps> = ({
  pose = 'flying',
  pixelSize = 3,
  halfBody = false,
  colorway = 'shiba',
  style,
}) => {
  const fullGrid = POSE_MAP[pose] ?? baseDog;
  const grid = halfBody ? fullGrid.slice(0, 13) : fullGrid;

  const colorMap = useMemo(() => {
    const palette = getPetColorway(colorway);
    return {
      B: '#1A140D',
      O: palette.main,
      D: darken(palette.main, 0.22),
      C: palette.secondary,
      W: '#FFFFFF',
      P: '#F2799A',
    } as Record<DogColorKey, string>;
  }, [colorway]);

  return <PixelSpriteSvg grid={grid} colorMap={colorMap} gridCols={GRID_COLS} pixelSize={pixelSize} style={style} />;
};

export default PixelDog;
