import React from 'react';
import styled, {css} from 'styled-components/native';
import ErrorBoundary from 'react-native-error-boundary';
import {SvgUri} from 'react-native-svg';
import {Slate} from '../../../../styles/colors';

interface ImageParams {
  borderRadius?: number;
  height: number;
  width?: number;
  fallbackComponent?: () => JSX.Element;
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

const DefaultFallbackComponent = styled.View<ImageParams>`
  ${({height, width, borderRadius}) => css`
    height: ${height}px;
    width: ${width}px;
    border-radius: ${borderRadius}px;
    background-color: ${Slate};
  `}
`;

export default ({
  uri,
  height,
  width,
  borderRadius,
  fallbackComponent,
}: ImageParams & {uri: string}) => {
  const imageWidth = width || height;
  const imageBorderRadius = borderRadius || 0;
  const defaultSvgFallback = () => (
    <DefaultFallbackComponent
      height={height}
      width={imageWidth}
      borderRadius={imageBorderRadius}
    />
  );
  const svgFallbackComponent = fallbackComponent || defaultSvgFallback;
  return (
    <ImageContainer
      height={height}
      width={imageWidth}
      borderRadius={imageBorderRadius}>
      {!uri ? (
        <>{svgFallbackComponent()}</>
      ) : uri?.endsWith('.svg') ? (
        <ErrorBoundary FallbackComponent={svgFallbackComponent}>
          <SvgUri height={`${height}px`} width={`${imageWidth}px`} uri={uri} />
        </ErrorBoundary>
      ) : (
        <RemoteImage
          height={height}
          width={imageWidth}
          borderRadius={imageBorderRadius}
          source={{uri}}
        />
      )}
    </ImageContainer>
  );
};
