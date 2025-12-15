import {CardContainer, CardGutter} from '../styled/Containers';
import styled from 'styled-components/native';
import * as React from 'react';
import {ReactElement, ReactNode} from 'react';
import {StyleProp, ViewStyle} from 'react-native';

const CardHeader = styled.View`
  min-height: 30px;
  padding: ${CardGutter};
`;

const CardBody = styled.View`
  flex-grow: 1;
  padding: 0 ${CardGutter};
`;

const CardFooter = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  min-height: 30px;
  padding: ${CardGutter};
  width: 100%;
`;

const BackgroundImage = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: auto;
  width: auto;
  border-radius: 27px;
  overflow: hidden;
`;

export interface CardProps {
  header?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  backgroundImg?: () => ReactElement;
  style?: StyleProp<ViewStyle>;
}

const Card = ({header, body, footer, backgroundImg, style}: CardProps) => {
  return (
    <CardContainer style={(style as object) || {}}>
      {backgroundImg && <BackgroundImage>{backgroundImg()}</BackgroundImage>}
      {header && <CardHeader>{header}</CardHeader>}
      {body && <CardBody>{body}</CardBody>}
      {footer && <CardFooter>{footer}</CardFooter>}
    </CardContainer>
  );
};

export default Card;
