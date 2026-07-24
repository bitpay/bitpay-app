import React from 'react';
import {View} from 'react-native';
import {render} from '@testing-library/react-native';
import Blockie from './Blockie';

jest.mock('react-native-fast-image', () => {
  const MockReact = require('react');
  const {View: MockView} = require('react-native');
  const FastImage = (props: object) => MockReact.createElement(MockView, props);
  FastImage.resizeMode = {contain: 'contain'};

  return {
    __esModule: true,
    default: FastImage,
  };
});

jest.mock('./pnglib', () =>
  jest.fn().mockImplementation(() => ({
    buffer: [],
    color: () => '\x01',
    getBase64: () => 'mock-png',
    index: () => 0,
  })),
);

const pnglibMock = require('./pnglib') as jest.Mock;

describe('Blockie', () => {
  it('reuses generated image data for equivalent seeds', () => {
    const {rerender, UNSAFE_getAllByType} = render(
      <>
        <Blockie seed="0xABC" size={40} />
        <Blockie seed="0xabc" size={24} />
      </>,
    );

    expect(pnglibMock).toHaveBeenCalledTimes(1);

    const images = UNSAFE_getAllByType(View);
    expect(images[0].props.source).toEqual(images[1].props.source);
    expect(images[0].props.style).toMatchObject({width: 40, height: 40});
    expect(images[1].props.style).toMatchObject({width: 24, height: 24});

    rerender(
      <>
        <Blockie seed="0xABC" size={40} />
        <Blockie seed="0xabc" size={24} />
        <Blockie seed="0xDEF" size={40} />
      </>,
    );

    expect(pnglibMock).toHaveBeenCalledTimes(2);
  });
});
