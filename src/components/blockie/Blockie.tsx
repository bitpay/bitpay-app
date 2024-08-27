import React, {Component} from 'react';
import FastImage from 'react-native-fast-image';
const pnglib = require('./pnglib');
const hsl2rgb = require('./hsl2rgb');
interface BlockieProps {
  seed?: string;
  color?: string;
  bgcolor?: string;
  spotcolor?: string;
  size?: number;
  scale?: number;
}
const randseed = new Array(4); // Xorshift: [x, y, z, w] 32 bit values

const seedrand = (seed: string) => {
  for (let i = 0; i < randseed.length; i++) {
    randseed[i] = 0;
  }
  for (let i = 0; i < seed.length; i++) {
    randseed[i % 4] =
      (randseed[i % 4] << 5) - randseed[i % 4] + seed.charCodeAt(i);
  }
};

const rand = () => {
  // based on Java's String.hashCode(), expanded to 4 32bit values
  const t = randseed[0] ^ (randseed[0] << 11);

  randseed[0] = randseed[1];
  randseed[1] = randseed[2];
  randseed[2] = randseed[3];
  randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8);

  return (randseed[3] >>> 0) / ((1 << 31) >>> 0);
};

const createColor = () => {
  //saturation is the whole color spectrum
  const h = Math.floor(rand() * 360);
  //saturation goes from 40 to 100, it avoids greyish colors
  const s = rand() * 60 + 40;
  //lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
  const l = (rand() + rand() + rand() + rand()) * 25;

  return [h / 360, s / 100, l / 100];
};

const createImageData = (size: number) => {
  const width = size; // Only support square icons for now
  const height = size;

  const dataWidth = Math.ceil(width / 2);
  const mirrorWidth = width - dataWidth;

  const data = [];
  for (let y = 0; y < height; y++) {
    let row = [];
    for (let x = 0; x < dataWidth; x++) {
      // this makes foreground and background color to have a 43% (1/2.3) probability
      // spot color has 13% chance
      row[x] = Math.floor(rand() * 2.3);
    }
    const r = row.slice(0, mirrorWidth).reverse();
    row = row.concat(r);

    for (let i = 0; i < row.length; i++) {
      data.push(row[i]);
    }
  }

  return data;
};

//@ts-ignore
const fillRect = (png, x, y, w, h, color) => {
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      png.buffer[png.index(x + i, y + j)] = color;
    }
  }
};

//@ts-ignore
const buildOpts = opts => {
  if (!opts.seed) {
    throw new Error('No seed provided');
  }

  seedrand(opts.seed);

  return Object.assign(
    {
      size: 8,
      scale: 16,
      color: createColor(),
      bgcolor: createColor(),
      spotcolor: createColor(),
    },
    opts,
  );
};

const makeBlockie = (address: string) => {
  const opts = buildOpts({seed: address.toLowerCase()});

  const imageData = createImageData(opts.size);
  const width = Math.sqrt(imageData.length);

  const p = new pnglib(opts.size * opts.scale, opts.size * opts.scale, 3);
  const bgcolor = p.color(...hsl2rgb(...opts.bgcolor));
  const color = p.color(...hsl2rgb(...opts.color));
  const spotcolor = p.color(...hsl2rgb(...opts.spotcolor));

  for (let i = 0; i < imageData.length; i++) {
    const row = Math.floor(i / width);
    const col = i % width;
    // if data is 0, leave the background
    if (imageData[i]) {
      // if data is 2, choose spot color, if 1 choose foreground
      const pngColor = imageData[i] == 1 ? color : spotcolor;
      fillRect(
        p,
        col * opts.scale,
        row * opts.scale,
        opts.scale,
        opts.scale,
        pngColor,
      );
    }
  }
  return `data:image/png;base64,${p.getBase64()}`;
};

class Blockie extends Component<BlockieProps> {
  render() {
    const {
      seed = Math.floor(Math.random() * Math.pow(10, 16)).toString(16),
      size = 40,
    } = this.props;
    const blockie = makeBlockie(seed);

    return (
      <FastImage
        source={{uri: blockie}}
        style={{width: size, height: size, borderRadius: size / 2}}
        resizeMode={FastImage.resizeMode.contain}
      />
    );
  }
}

export default Blockie;
