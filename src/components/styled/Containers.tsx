import styled from 'styled-components/native';
import {Dimensions} from 'react-native';
const WIDTH = Dimensions.get('window').width;

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

export const Hr = styled.View`
  border-bottom-color: #ebebeb;
  border-bottom-width: 1px;
  margin: 20px 0;
`;

// LIST
export const ListContainer = styled.View`
  flex: 1;
  width: 100%;
`;

export const RowContainer = styled.View`
  flex: 1;
  flex-direction: row;
  padding: 10px;
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
}
export const CardContainer = styled.View<CardContainerProps>`
  width: ${({width}: CardContainerProps) => width || '215px'};
  min-height: ${({minHeight}: CardContainerProps) => minHeight || '250px'};
  background: #f5f7f8;
  border-radius: 21px;
`;
