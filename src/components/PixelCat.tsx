import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PixelPetSpriteSvg } from './PixelPetSpriteSvg';
import { PetColorwayId } from './petColorways';
import { CAT_COLORWAY_FILTERS } from './mascotColorFilters';
import type { PetPose } from './PixelDog';

const CAT_POSE_IMAGES: Record<PetPose, number> = {
  flying: require('../../assets/mascot/cat_flying.png'),
  sleeping: require('../../assets/mascot/cat_sleeping.png'),
  pointing: require('../../assets/mascot/cat_pointing.png'),
  grabbing: require('../../assets/mascot/cat_grabbing.png'),
  pushing: require('../../assets/mascot/cat_pushing.png'),
  alert: require('../../assets/mascot/cat_alert.png'),
  celebrating: require('../../assets/mascot/cat_celebrating.png'),
  listening: require('../../assets/mascot/cat_listening.png'),
};

// Base units kept from the previous procedural sprite (22 cols x 18 rows) so
// existing call sites' pixelSize props keep producing the same on-screen size.
const WIDTH_UNITS = 22;
const HEIGHT_UNITS = 18;
const HALF_BODY_RATIO = 12 / 18;

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
  const width = Math.round(WIDTH_UNITS * pixelSize);
  const fullHeight = Math.round(HEIGHT_UNITS * pixelSize);
  const displayHeight = halfBody ? Math.round(fullHeight * HALF_BODY_RATIO) : fullHeight;
  const source = CAT_POSE_IMAGES[pose] ?? CAT_POSE_IMAGES.flying;

  return (
    <PixelPetSpriteSvg
      source={source}
      alt={`Mascota Gato - ${pose}`}
      width={width}
      fullHeight={fullHeight}
      displayHeight={displayHeight}
      filterPrimitives={CAT_COLORWAY_FILTERS[colorway]}
      style={style}
    />
  );
};

export default PixelCat;
