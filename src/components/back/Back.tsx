import React from 'react';
import {Platform} from 'react-native';
import {Circle, Color, G, Path, Svg} from 'react-native-svg';
import styled, {css, useTheme} from 'styled-components/native';
import {LightBlack, NeutralSlate, White} from '../../styles/colors';

interface BackSvgProps {
  color: Color | null | undefined;
  background: Color | undefined;
  opacity: number | undefined;
}

interface Props {
  color?: Color | undefined;
  background?: Color | undefined;
  opacity?: number | undefined;
}

const BackSvg: React.FC<BackSvgProps> = ({color, background, opacity}) => {
  const fill = color || '#434D5A';
  const backgroundFill = background;
  const circleOpacity = opacity || 0.100000001;
  return (
    <Svg
      title="Button/Back"
      width="40px"
      height="40px"
      viewBox="0 0 41 41"
      style={{marginBottom: 5}}>
      <G
        id="Symbols"
        stroke="none"
        stroke-width="1"
        fill="none"
        fillRule="evenodd">
        <G
          id="Header/Step"
          transform="translate(-18.000000, -25.000000)"
          fill={fill}>
          <G id="Group" transform="translate(13.000000, 20.000000)">
            <G id="Close" transform="translate(5.000000, 5.000000)">
              <Circle
                id="Oval"
                opacity={circleOpacity}
                cx="20.5"
                cy="20.5"
                r="20.5"
                fill={backgroundFill}
              />
              <G id="Group" transform="translate(8.000000, 9.000000)">
                <G
                  id="Combined-Shape"
                  transform="translate(3.000000, 5.000000)">
                  <Path d="M7.29289322,0.292893219 L8.70710678,1.70710678 L4.41478644,5.99989322 L18,6 L18,8 L4.41478644,7.99989322 L8.70710678,12.2928932 L7.29289322,13.7071068 L0.585786438,7 L7.29289322,0.292893219 Z" />
                </G>
              </G>
            </G>
          </G>
        </G>
      </G>
    </Svg>
  );
};

const BackContainer = styled.View<{
  platform: string;
  stackNavigation?: boolean;
}>`
  ${({platform, stackNavigation}) =>
    stackNavigation
      ? css`
          padding-left: 15px;
        `
      : platform === 'android' &&
        css`
          margin-left: -11px;
          transform: scale(1.1);
        `}
`;

const Back = ({
  color,
  background,
  opacity,
  stackNavigation,
}: Props & {stackNavigation?: boolean}) => {
  const theme = useTheme();
  const themedColor = theme.dark ? White : null;
  const themedBackground = theme.dark ? LightBlack : NeutralSlate;

  return (
    <BackContainer platform={Platform.OS} stackNavigation={stackNavigation}>
      <BackSvg
        color={color || themedColor}
        background={background || themedBackground}
        opacity={opacity}
      />
    </BackContainer>
  );
};

export default Back;
