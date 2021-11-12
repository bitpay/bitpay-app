import * as React from 'react';
import {ReactElement, ReactNode} from 'react';
import styled from 'styled-components/native';
import {Black, SlateDark, White} from '../../styles/colors';
import Arrow from '../../../assets/img/forward-arrow.svg';
import Haptic from '../haptic-feedback/haptic';
import {CardContainer, CardGutter} from '../styled/Containers';

interface CardProps {
  children?: ReactNode;
  bodyHeader?: string;
  bodyDesc?: string;
  price?: string;
  pillText?: string;
  onCTAPress: () => void;
  backgroundImg?: () => ReactElement;
}

const CardHeader = styled.View`
  min-height: 30px;
  margin-bottom: ${CardGutter};
`;

const CardBodyHeader = styled.Text`
  font-size: 14px;
  line-height: 21px;
  color: ${SlateDark};
  margin-top: ${CardGutter};
`;

const CardBodyDesc = styled.Text`
  font-weight: 500;
  font-size: 18px;
  line-height: 25px;
  color: ${SlateDark};
  margin-top: ${CardGutter};
`;

const CardPrice = styled.Text`
  font-size: 31px;
  line-height: 46px;
  color: ${Black};
  font-weight: bold;
`;

const CardFooter = styled.View`
  min-height: 30px;
  padding-top: ${CardGutter};
`;

const CardBody = styled.View`
  flex-grow: 1;
`;

const CardPill = styled.View`
  background-color: #cbf3e8;
  align-self: flex-start;
  border-radius: 7px;
  padding: 4px 8px;
`;

const CardPillText = styled.Text`
  font-weight: 500;
  font-size: 14px;
  line-height: 19px;
  color: ${SlateDark};
`;

const FooterArrow = styled.TouchableHighlight`
  width: 30px;
  height: 30px;
  align-self: flex-end;
  border-radius: 50px;
  background-color: ${White};
  align-items: center;
  justify-content: center;
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

const Card = ({
  children,
  bodyHeader,
  price,
  pillText,
  bodyDesc,
  onCTAPress,
  backgroundImg,
}: CardProps) => {
  const _onPress = () => {
    Haptic('impactLight');
    onCTAPress();
  };
  return (
    <CardContainer>
      {backgroundImg && <BackgroundImage>{backgroundImg()}</BackgroundImage>}

      <CardHeader>{children}</CardHeader>

      <CardBody>
        {bodyHeader && <CardBodyHeader>{bodyHeader}</CardBodyHeader>}
        {price && <CardPrice>{price}</CardPrice>}
        {pillText && (
          <CardPill>
            <CardPillText>{pillText}</CardPillText>
          </CardPill>
        )}
        {bodyDesc && <CardBodyDesc>{bodyDesc}</CardBodyDesc>}
      </CardBody>

      <CardFooter>
        <FooterArrow onPress={_onPress} underlayColor="white">
          <Arrow />
        </FooterArrow>
      </CardFooter>
    </CardContainer>
  );
};

export default Card;
