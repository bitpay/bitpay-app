import React from 'react';
import styled, {css} from 'styled-components/native';
import {SvgUri} from 'react-native-svg';

interface ImageParams {
  borderRadius?: number;
  height: number;
  width?: number;
}
const ImageContainer = styled.View<ImageParams>`
  ${({height, width, borderRadius}) => css`
    border-radius: ${borderRadius}px;
    overflow: hidden;
    height: ${height}px;
    width: ${width}px;
  `}
`;

const RemoteImage = styled.Image<ImageParams>`
  ${({height, width}) => css`
    height: ${height}px;
    width: ${width}px;
  `}
`;

export default ({
  icon,
  height,
  width,
  borderRadius,
}: ImageParams & {icon: string}) => {
  const imageWidth = width || height;
  const imageBorderRadius = borderRadius || 0;
  return (
    <ImageContainer
      height={height}
      width={imageWidth}
      borderRadius={imageBorderRadius}>
      {icon.endsWith('.svg') ? (
        <SvgUri height={`${height}px`} width={`${imageWidth}px`} uri={icon} />
      ) : (
        <RemoteImage
          height={height}
          width={imageWidth}
          borderRadius={imageBorderRadius}
          source={{uri: icon}}
        />
      )}
    </ImageContainer>
  );
};
