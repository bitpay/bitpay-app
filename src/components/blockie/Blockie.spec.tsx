import React from 'react';
import {View} from 'react-native';
import {render} from '@testing-library/react-native';
import {Path} from 'react-native-svg';
import Blockie, {hasCachedBlockie} from './Blockie';

describe('Blockie', () => {
  it('renders equivalent seeds synchronously with the same SVG data', () => {
    const {rerender, UNSAFE_getAllByType} = render(
      <>
        <Blockie seed="0xABC" size={40} />
        <Blockie seed="0xabc" size={24} />
      </>,
    );

    const containers = UNSAFE_getAllByType(View);
    expect(containers[0].props.style).toMatchObject({width: 40, height: 40});
    expect(containers[1].props.style).toMatchObject({width: 24, height: 24});

    const paths = UNSAFE_getAllByType(Path);
    expect(paths).toHaveLength(4);
    expect(paths[0].props).toMatchObject(paths[2].props);
    expect(paths[1].props).toMatchObject(paths[3].props);

    rerender(
      <>
        <Blockie seed="0xABC" size={40} />
        <Blockie seed="0xabc" size={24} />
        <Blockie seed="0xDEF" size={40} />
      </>,
    );

    const rerenderedPaths = UNSAFE_getAllByType(Path);
    expect(rerenderedPaths).toHaveLength(6);
    expect(rerenderedPaths[4].props.d).not.toBe(rerenderedPaths[0].props.d);
  });
});

describe('hasCachedBlockie', () => {
  it('is false for an address that was never rendered', () => {
    expect(hasCachedBlockie('0xnever-rendered')).toBe(false);
  });

  it('is true once that address was rendered, ignoring casing', () => {
    render(<Blockie seed="0xCachedAddress" size={40} />);

    expect(hasCachedBlockie('0xCachedAddress')).toBe(true);
    expect(hasCachedBlockie('0xcachedaddress')).toBe(true);
  });

  it('is false for missing input', () => {
    expect(hasCachedBlockie()).toBe(false);
    expect(hasCachedBlockie('')).toBe(false);
  });
});
