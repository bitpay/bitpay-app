import React, {memo} from 'react';
import {View} from 'react-native';
import Svg, {Path, Rect} from 'react-native-svg';

const hsl2rgb = require('./hsl2rgb');

interface BlockieProps {
  seed?: string;
  size?: number;
}

type BlockieRenderData = {
  backgroundColor: string;
  colorPath: string;
  color: string;
  spotColorPath: string;
  spotColor: string;
};

const BLOCKIE_GRID_SIZE = 8;
const BLOCKIE_CACHE_LIMIT = 128;
const blockieCache = new Map<string, BlockieRenderData>();
const randseed = new Array(4); // Xorshift: [x, y, z, w] 32 bit values

/* eslint-disable no-bitwise */
const seedrand = (seed: string) => {
  for (let index = 0; index < randseed.length; index++) {
    randseed[index] = 0;
  }
  for (let index = 0; index < seed.length; index++) {
    randseed[index % 4] =
      (randseed[index % 4] << 5) - randseed[index % 4] + seed.charCodeAt(index);
  }
};

const rand = () => {
  // Based on Java's String.hashCode(), expanded to four 32-bit values.
  const t = randseed[0] ^ (randseed[0] << 11);

  randseed[0] = randseed[1];
  randseed[1] = randseed[2];
  randseed[2] = randseed[3];
  randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8);

  return (randseed[3] >>> 0) / ((1 << 31) >>> 0);
};
/* eslint-enable no-bitwise */

const createColor = () => {
  const hue = Math.floor(rand() * 360);
  const saturation = rand() * 60 + 40;
  const lightness = (rand() + rand() + rand() + rand()) * 25;

  return [hue / 360, saturation / 100, lightness / 100];
};

const createImageData = () => {
  const dataWidth = Math.ceil(BLOCKIE_GRID_SIZE / 2);
  const mirrorWidth = BLOCKIE_GRID_SIZE - dataWidth;
  const data: number[] = [];

  for (let y = 0; y < BLOCKIE_GRID_SIZE; y++) {
    const row: number[] = [];
    for (let x = 0; x < dataWidth; x++) {
      row[x] = Math.floor(rand() * 2.3);
    }
    data.push(...row, ...row.slice(0, mirrorWidth).reverse());
  }

  return data;
};

const toRgbColor = (hslColor: number[]) => {
  const [red, green, blue] = hsl2rgb(...hslColor);
  return `rgb(${red},${green},${blue})`;
};

const buildColorPath = (imageData: number[], colorIndex: number) => {
  let path = '';

  imageData.forEach((value, index) => {
    if (value !== colorIndex) {
      return;
    }

    const x = index % BLOCKIE_GRID_SIZE;
    const y = Math.floor(index / BLOCKIE_GRID_SIZE);
    path += `M${x} ${y}h1v1h-1z`;
  });

  return path;
};

const makeBlockie = (address: string): BlockieRenderData => {
  seedrand(address.toLowerCase());

  const color = createColor();
  const backgroundColor = createColor();
  const spotColor = createColor();
  const imageData = createImageData();

  return {
    backgroundColor: toRgbColor(backgroundColor),
    color: toRgbColor(color),
    colorPath: buildColorPath(imageData, 1),
    spotColor: toRgbColor(spotColor),
    spotColorPath: buildColorPath(imageData, 2),
  };
};

const getCachedBlockie = (address: string) => {
  const cacheKey = address.toLowerCase();
  const cachedBlockie = blockieCache.get(cacheKey);

  if (cachedBlockie) {
    blockieCache.delete(cacheKey);
    blockieCache.set(cacheKey, cachedBlockie);
    return cachedBlockie;
  }

  const blockie = makeBlockie(cacheKey);

  if (blockieCache.size >= BLOCKIE_CACHE_LIMIT) {
    const oldestCacheKey = blockieCache.keys().next().value;
    if (oldestCacheKey !== undefined) {
      blockieCache.delete(oldestCacheKey);
    }
  }

  blockieCache.set(cacheKey, blockie);
  return blockie;
};

export const hasCachedBlockie = (address?: string): boolean =>
  !!address && blockieCache.has(address.toLowerCase());

const Blockie = ({
  seed = Math.floor(Math.random() * Math.pow(10, 16)).toString(16),
  size = 40,
}: BlockieProps) => {
  const blockie = getCachedBlockie(seed);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
      }}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${BLOCKIE_GRID_SIZE} ${BLOCKIE_GRID_SIZE}`}>
        <Rect
          width={BLOCKIE_GRID_SIZE}
          height={BLOCKIE_GRID_SIZE}
          fill={blockie.backgroundColor}
        />
        <Path d={blockie.colorPath} fill={blockie.color} />
        <Path d={blockie.spotColorPath} fill={blockie.spotColor} />
      </Svg>
    </View>
  );
};

export default memo(Blockie);
