import React from 'react';
import {Image, View} from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import {SvgUri} from 'react-native-svg';
import {Slate} from '../../../../styles/colors';

interface ImageParams {
  borderRadius?: number;
  height: number;
  width?: number;
  fallbackComponent?: () => JSX.Element;
}

const ImageContainer = ({
  height,
  width,
  borderRadius,
  style,
  ...rest
}: ImageParams & React.ComponentProps<typeof View>) => (
  <View
    style={[
      {
        borderRadius,
        overflow: 'hidden',
        height,
        width,
      },
      style,
    ]}
    {...rest}
  />
);

const RemoteImage = ({
  height,
  width,
  style,
  ...rest
}: ImageParams & React.ComponentProps<typeof Image>) => (
  <Image style={[{height, width}, style]} {...rest} />
);

const DefaultFallbackComponent = ({
  height,
  width,
  borderRadius,
  style,
  ...rest
}: ImageParams & React.ComponentProps<typeof View>) => (
  <View
    style={[
      {
        height,
        width,
        borderRadius,
        backgroundColor: Slate,
      },
      style,
    ]}
    {...rest}
  />
);

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
