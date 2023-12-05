import React from 'react';
import {Platform} from 'react-native';
import {Circle, Color, G, Svg, Rect} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';
import {LightBlack, NeutralSlate, White} from '../../styles/colors';

interface AddSvgProps {
  color: Color | null | undefined;
  background: Color | undefined;
  opacity: number | undefined;
}

interface Props {
  color?: Color | undefined;
  background?: Color | undefined;
  opacity?: number | undefined;
}

const AddSvg: React.FC<AddSvgProps> = ({color, background, opacity}) => {
  const fill = color || '#434D5A';
  const backgroundFill = background;
  const circleOpacity = opacity || 0.100000001;
  return (
    <Svg
      title="Button/Add"
      width="41px"
      height="41px"
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
              <G transform="translate(0.5, 0.5)">
                <Rect
                  x="12"
                  y="21"
                  width="2"
                  height="16"
                  rx="1"
                  transform="rotate(-90 12 21)"
                  fill={fill}
                />
                <Rect
                  x="21"
                  y="28"
                  width="2"
                  height="16"
                  rx="1"
                  transform="rotate(-180 21 28)"
                  fill={fill}
                />
              </G>
            </G>
          </G>
        </G>
      </G>
    </Svg>
  );
};

const AddContainer = styled.View<{platform: string}>``;

const Add = ({color, background, opacity}: Props) => {
  const theme = useTheme();
  const themedColor = theme.dark ? White : null;
  const themedBackground = theme.dark ? LightBlack : NeutralSlate;

  return (
    <AddContainer platform={Platform.OS}>
      <AddSvg
        color={color || themedColor}
        background={background || themedBackground}
        opacity={opacity}
      />
    </AddContainer>
  );
};

export default Add;
