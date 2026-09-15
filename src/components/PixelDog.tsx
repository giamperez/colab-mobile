import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PixelPetSpriteSvg } from './PixelPetSpriteSvg';
import { PetColorwayId } from './petColorways';
import { DOG_COLORWAY_FILTERS } from './mascotColorFilters';

export type PetPose = 'flying' | 'sleeping' | 'pointing' | 'grabbing' | 'pushing' | 'alert' | 'celebrating';

const DOG_POSE_IMAGES: Record<PetPose, number> = {
  flying: require('../../assets/mascot/dog_flying.png'),
  sleeping: require('../../assets/mascot/dog_sleeping.png'),
  pointing: require('../../assets/mascot/dog_pointing.png'),
  grabbing: require('../../assets/mascot/dog_grabbing.png'),
  pushing: require('../../assets/mascot/dog_pushing.png'),
  alert: require('../../assets/mascot/dog_alert.png'),
  celebrating: require('../../assets/mascot/dog_celebrating.png'),
};

// Base units kept from the previous procedural sprite (22 cols x 20 rows) so
// existing call sites' pixelSize props keep producing the same on-screen size.
const WIDTH_UNITS = 22;
const HEIGHT_UNITS = 20;
const HALF_BODY_RATIO = 13 / 20;

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
  const width = Math.round(WIDTH_UNITS * pixelSize);
  const fullHeight = Math.round(HEIGHT_UNITS * pixelSize);
  const displayHeight = halfBody ? Math.round(fullHeight * HALF_BODY_RATIO) : fullHeight;
  const source = DOG_POSE_IMAGES[pose] ?? DOG_POSE_IMAGES.flying;

  return (
    <PixelPetSpriteSvg
      source={source}
      alt={`Mascota Perro - ${pose}`}
      width={width}
      fullHeight={fullHeight}
      displayHeight={displayHeight}
      filterPrimitives={DOG_COLORWAY_FILTERS[colorway]}
      style={style}
    />
  );
};

export default PixelDog;
