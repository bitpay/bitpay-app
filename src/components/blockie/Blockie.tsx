import React, { Component } from 'react';
import Svg, { Rect, Defs, ClipPath, Circle, G } from 'react-native-svg';

const randseed: number[] = new Array(4);

interface BlockieProps {
  seed?: string;
  color?: string;
  bgcolor?: string;
  spotcolor?: string;
  size?: number;
  scale?: number;
}

class Blockie extends Component<BlockieProps> {
  seedrand(seed: string) {
    for (let i = 0; i < randseed.length; i++) {
      randseed[i] = 0;
    }

    for (let i = 0; i < seed.length; i++) {
      randseed[i % 4] =
        (randseed[i % 4] << 5) - randseed[i % 4] + seed.charCodeAt(i);
    }
  }

  rand(): number {
    const t = randseed[0] ^ (randseed[0] << 11);

    randseed[0] = randseed[1];
    randseed[1] = randseed[2];
    randseed[2] = randseed[3];
    randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8);

    return (randseed[3] >>> 0) / ((1 << 31) >>> 0);
  }

  createColor(): string {
    const h = Math.floor(this.rand() * 360);
    const s = `${this.rand() * 60 + 40}%`;
    const l = `${
      (this.rand() + this.rand() + this.rand() + this.rand()) * 25
    }%`;

    return `hsl(${h},${s},${l})`;
  }

  createImageData(size: number): number[] {
    const width = size;
    const height = size;

    const dataWidth = Math.ceil(width / 2);
    const mirrorWidth = width - dataWidth;

    const data: number[] = [];

    for (let y = 0; y < height; y++) {
      let row: number[] = [];

      for (let x = 0; x < dataWidth; x++) {
        row[x] = Math.floor(this.rand() * 2.3);
      }

      let r = row.slice(0, mirrorWidth);
      r.reverse();

      row = row.concat(r);

      for (let i = 0; i < row.length; i++) {
        data.push(row[i]);
      }
    }

    return data;
  }

  renderIcon(size: number) {
    const seed =
      this.props.seed ||
      Math.floor(Math.random() * Math.pow(10, 16)).toString(16);

    this.seedrand(seed);

    const color = this.props.color || this.createColor();
    const bgcolor = this.props.bgcolor || this.createColor();
    const spotcolor = this.props.spotcolor || this.createColor();

    const imageData = this.createImageData(size);
    const width = Math.sqrt(imageData.length);

    return imageData.map((item, i) => {
      let fill = bgcolor;

      if (item) {
        fill = item === 1 ? color : spotcolor;
      }

      const row = Math.floor(i / size);
      const col = i % size;

      return (
        <Rect
          key={i}
          x={row * 10}
          y={col * 10}
          width={size}
          height={size}
          fill={fill}
        />
      );
    });
  }

  render() {
    const size = this.props.size || 8;
    const radius = size / 2;
    return (
      <Svg height={size} width={size}>
        <Defs>
          <ClipPath id="clip">
            <Circle cx={radius} cy={radius} r={radius} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#clip)">
          {this.renderIcon(size)}
        </G>
      </Svg>
    );
  }
}

export default Blockie;