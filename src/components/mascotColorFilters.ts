import { PetColorwayId } from './petColorways';

// Approximates the CSS filter() chains used by the web app (sepia/grayscale/
// brightness/contrast/saturate/hue-rotate) as chained SVG feColorMatrix
// primitives, since React Native has no CSS filter equivalent for images.
export type ColorFilterPrimitive =
  | { type: 'matrix'; values: number[] }
  | { type: 'saturate'; values: [number] }
  | { type: 'hueRotate'; values: [number] };

const grayscale = (amount: number): ColorFilterPrimitive => {
  const lr = 0.2126;
  const lg = 0.7152;
  const lb = 0.0722;
  return {
    type: 'matrix',
    values: [
      1 - amount + lr * amount, lg * amount, lb * amount, 0, 0,
      lr * amount, 1 - amount + lg * amount, lb * amount, 0, 0,
      lr * amount, lg * amount, 1 - amount + lb * amount, 0, 0,
      0, 0, 0, 1, 0,
    ],
  };
};

const sepia = (amount: number): ColorFilterPrimitive => ({
  type: 'matrix',
  values: [
    1 - amount + 0.393 * amount, 0.769 * amount, 0.189 * amount, 0, 0,
    0.349 * amount, 1 - amount + 0.686 * amount, 0.168 * amount, 0, 0,
    0.272 * amount, 0.534 * amount, 1 - amount + 0.131 * amount, 0, 0,
    0, 0, 0, 1, 0,
  ],
});

const brightness = (amount: number): ColorFilterPrimitive => ({
  type: 'matrix',
  values: [
    amount, 0, 0, 0, 0,
    0, amount, 0, 0, 0,
    0, 0, amount, 0, 0,
    0, 0, 0, 1, 0,
  ],
});

const contrast = (amount: number): ColorFilterPrimitive => {
  const intercept = 0.5 * (1 - amount);
  return {
    type: 'matrix',
    values: [
      amount, 0, 0, 0, intercept,
      0, amount, 0, 0, intercept,
      0, 0, amount, 0, intercept,
      0, 0, 0, 1, 0,
    ],
  };
};

const saturate = (amount: number): ColorFilterPrimitive => ({ type: 'saturate', values: [amount] });

const hueRotate = (degrees: number): ColorFilterPrimitive => ({ type: 'hueRotate', values: [degrees] });

// Mirrors PixelDog's colorwayFilter switch on the web (colab-frontend).
export const DOG_COLORWAY_FILTERS: Partial<Record<PetColorwayId, ColorFilterPrimitive[]>> = {
  choco: [sepia(0.35), saturate(1.35), brightness(0.88), contrast(1.08)],
  night: [grayscale(0.75), brightness(0.78), contrast(1.18)],
  snow: [brightness(1.15), saturate(0.6), contrast(0.96)],
  ash: [grayscale(0.65), brightness(1.04)],
  // shiba is the dog's native color: no filter applied.
};

// Mirrors PixelCat's colorwayFilter switch on the web (colab-frontend).
export const CAT_COLORWAY_FILTERS: Partial<Record<PetColorwayId, ColorFilterPrimitive[]>> = {
  choco: [sepia(0.55), saturate(1.2), brightness(0.85), contrast(1.1)],
  night: [grayscale(0.85), brightness(0.65), contrast(1.2)],
  snow: [brightness(1.2), saturate(0.4), contrast(0.95)],
  shiba: [saturate(1.2), hueRotate(-10)],
  // ash is the cat's native color: no filter applied.
};
