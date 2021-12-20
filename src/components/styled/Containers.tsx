import styled, {css} from 'styled-components/native';
import {Dimensions} from 'react-native';
import {NeutralSlate} from '../../styles/colors';

export const {height: HEIGHT, width: WIDTH} = Dimensions.get('window');

export const ScreenGutter = '15px';

// Nav
export const HeaderRightContainer = styled.View`
  height: 50px;
  margin-right: 10px;
`;

export const PngImage = styled.Image`
  height: ${HEIGHT * 0.3}px;
  width: ${HEIGHT * 0.3}px;
`;

export const ImageContainer = styled.View`
  margin: 10px 0;
  height: 200px;
  display: flex;
  justify-content: center;
`;

export const HeaderTitleContainer = styled.View`
  margin-top: 10px;
  padding: 10px;
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
  padding: 10px;
  align-self: stretch;
  flex-direction: column;
  margin-top: 30px;
`;

export const CtaContainerAbsolute = styled.View<{background?: boolean}>`
  padding: 15px;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  ${({background}) =>
    background &&
    css`
      background: white;
    `};
`;

export const Hr = styled.View`
  border-bottom-color: #ebecee;
  border-bottom-width: 1px;
`;

// LIST
export const ListContainer = styled.View`
  flex: 1;
`;

export const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  margin: 10px 0;
  padding: 0 10px 0 10px;
`;

export const RowDetailsContainer = styled.View`
  flex: 1;
  flex-direction: column;
  margin-left: 12px;
  justify-content: center;
`;

export const CurrencyImageContainer = styled.View`
  height: 50px;
  width: 50px;
  display: flex;
  justify-content: center;
  align-self: center;
  border-radius: 8px;
`;

// Card
export const CardGutter = '15px';

interface CardContainerProps {
  minHeight?: string;
  width?: string;
  backgroundColor?: string;
}
export const CardContainer = styled.View<CardContainerProps>`
  width: ${({width}: CardContainerProps) => width || '215px'};
  min-height: ${({minHeight}: CardContainerProps) => minHeight || '250px'};
  background: ${({backgroundColor}: CardContainerProps) =>
    backgroundColor || NeutralSlate};
  border-radius: 21px;
`;
