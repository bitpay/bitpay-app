import { useTheme } from '@react-navigation/native';
import React from 'react';
import { Platform } from 'react-native';
import { Circle, Color, G, Path, Svg } from 'react-native-svg';
import styled, { css } from 'styled-components/native';

interface Props {
  platform: string;
}

interface BackSvgProps {
  color: Color | null | undefined;
}

const BackSvg: React.FC<BackSvgProps> = ({ color }) => {
  const fill = color || '#434D5A';

  return (
    <Svg title="Button/Back" width="41px" height="41px" viewBox="0 0 41 41" style={{marginBottom: 5}}>
      <G id="Symbols" stroke="none" stroke-width="1" fill="none" fillRule="evenodd">
        <G id="Header/Step" transform="translate(-18.000000, -25.000000)" fill={fill}>
          <G id="Group" transform="translate(13.000000, 20.000000)">
            <G id="Close" transform="translate(5.000000, 5.000000)">
              <Circle id="Oval" opacity="0.100000001" cx="20.5" cy="20.5" r="20.5"></Circle>
              <G id="Group" transform="translate(8.000000, 9.000000)">
                <G id="Combined-Shape" transform="translate(3.000000, 5.000000)">
                  <Path d="M7.29289322,0.292893219 L8.70710678,1.70710678 L4.41478644,5.99989322 L18,6 L18,8 L4.41478644,7.99989322 L8.70710678,12.2928932 L7.29289322,13.7071068 L0.585786438,7 L7.29289322,0.292893219 Z"></Path>
                </G>
              </G>
            </G>
          </G>
        </G>
      </G>
    </Svg>
  );
};

const BackContainer = styled.View`
  padding-top: 10px;
  transform: scale(1.1);
  ${({ platform }: Props) =>
    platform === 'ios' &&
    css`
      padding-left: 15px;
    `}
`;

const Back = () => {
  const theme = useTheme();
  const backColor = theme.dark ? '#fff' : null;

  return (
    <BackContainer platform={Platform.OS}>
      <BackSvg color={backColor} />
    </BackContainer>
  );
};

export default Back;
