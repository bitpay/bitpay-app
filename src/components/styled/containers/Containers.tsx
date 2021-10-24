import styled from 'styled-components/native';
import {Dimensions} from 'react-native';
const WIDTH = Dimensions.get('window').width;

export const ImageContainer = styled.View`
  margin: 10px 0;
  height: 200px;
  display: flex;
  justify-content: center;
`;

export const TitleContainer = styled.View`
  width: ${WIDTH * 0.75}px;
`;

export const TextContainer = styled.View`
  margin-top: 10px;
  padding: 10px;
  width: ${WIDTH * 0.9}px;
`;

export const SubTextContainer = styled.View`
  width: ${WIDTH * 0.8}px;
  margin-top: 10px;
`;

export const CtaContainer = styled.View`
  flex: 1;
  padding: 10px;
  align-self: stretch;
  flex-direction: column;
  margin-top: 30px;
`;

export const CtaContainerAbsolute = styled.View`
  padding: 10px;
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
`;
