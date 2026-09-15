import React, { useId } from 'react';
import { View, StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';
import Svg, { Defs, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';
import type { ColorFilterPrimitive } from './mascotColorFilters';

export interface PixelPetSpriteSvgProps {
  source: ImageSourcePropType;
  alt: string;
  width: number;
  fullHeight: number;
  displayHeight: number;
  filterPrimitives?: ColorFilterPrimitive[];
  style?: StyleProp<ViewStyle>;
}

// Renders one pose's PNG sprite inside an SVG so a colorway can be approximated
// via chained feColorMatrix filters (RN <Image> has no CSS-filter equivalent).
// The outer View clips to `displayHeight` while the image keeps `fullHeight`,
// which reproduces the old procedural sprite's halfBody crop (peeking over an
// edge) instead of shrinking the whole sprite to fit a shorter box.
export const PixelPetSpriteSvg: React.FC<PixelPetSpriteSvgProps> = ({
  source,
  alt,
  width,
  fullHeight,
  displayHeight,
  filterPrimitives,
  style,
}) => {
  const filterId = useId();
  const hasFilter = !!filterPrimitives && filterPrimitives.length > 0;

  return (
    <View
      style={[{ width, height: displayHeight, overflow: 'hidden' }, style]}
      accessible
      accessibilityLabel={alt}
    >
      <Svg width={width} height={fullHeight} viewBox={`0 0 ${width} ${fullHeight}`}>
        {hasFilter && (
          <Defs>
            <Filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              {filterPrimitives!.map((primitive, index) => (
                <FeColorMatrix key={index} type={primitive.type} values={primitive.values} />
              ))}
            </Filter>
          </Defs>
        )}
        <SvgImage
          href={source}
          x={0}
          y={0}
          width={width}
          height={fullHeight}
          preserveAspectRatio="xMidYMid meet"
          filter={hasFilter ? `url(#${filterId})` : undefined}
        />
      </Svg>
    </View>
  );
};

export default PixelPetSpriteSvg;
