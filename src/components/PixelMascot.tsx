import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PixelIronMan, IronManPose } from './PixelIronMan';
import { PixelDog } from './PixelDog';
import { PixelCat } from './PixelCat';
import { useMascot } from '../context/MascotContext';

export interface PixelMascotProps {
  pose?: IronManPose;
  pixelSize?: number;
  halfBody?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PixelMascot: React.FC<PixelMascotProps> = (props) => {
  const { mascotType, mascotColorway } = useMascot();

  if (mascotType === 'dog') {
    return <PixelDog {...props} colorway={mascotColorway} />;
  }
  if (mascotType === 'cat') {
    return <PixelCat {...props} colorway={mascotColorway} />;
  }
  return <PixelIronMan {...props} />;
};

export default PixelMascot;
