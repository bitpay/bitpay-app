import React from 'react';
import * as Svg from 'react-native-svg';
import styled from 'styled-components/native';
import ArrowRight from '../../../assets/img/arrow-right.svg';
import {White} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import Haptic from '../haptic-feedback/haptic';
import {ScreenGutter} from '../styled/Containers';
import {OFFER_HEIGHT, OFFER_WIDTH} from './offer';
import {OfferProps} from './OfferSlides';

const OfferCardContainer = styled.View`
  justify-content: flex-start;
  align-items: flex-start;
  flex-direction: column;
  width: 260px;
  height: 182px;
  left: ${ScreenGutter};
`;

const OfferBackgroundContainer = styled.View`
  border-radius: 12px;
  overflow: hidden;
  position: absolute;
`;

const OfferTitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 25px;
  text-transform: uppercase;
  line-height: 37px;
  letter-spacing: 1px;
  color: white;
  padding-left: 16px;
  padding-top: 88px;
  width: 194px;
`;

const DescriptionContainer = styled.View`
  justify-content: flex-start;
  align-items: stretch;
  flex-direction: row;
  height: 38px;
`;

const DescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: normal;
  font-size: 14px;
  line-height: 19px;
  color: white;
  margin-left: 16px;
  width: 165px;
`;

const ArrowContainer = styled.View`
  width: 36px;
  height: 36px;
  background: #f3f4f5;
  margin-left: 26px;
  border-radius: 18px;
  justify-content: center;
  align-items: center;
`;

const FooterArrow = styled.TouchableHighlight`
  width: 30px;
  height: 30px;
  align-self: center;
  border-radius: 50px;
  background-color: ${White};
  align-items: center;
  justify-content: center;
`;

export const OfferBackgroundOverlay = () => {
  return (
    <Svg.Svg
      height={OFFER_HEIGHT}
      width={OFFER_WIDTH}
      viewBox="0 0 260 182"
      style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}>
      <Svg.Defs>
        <Svg.LinearGradient id="offer-gradient" x1={0} y1={0} x2={0} y2={1}>
          <Svg.Stop offset="0%" stopColor="#000" stopOpacity={0} />
          <Svg.Stop offset="100%" stopColor="#000" stopOpacity={0.8} />
        </Svg.LinearGradient>
      </Svg.Defs>
      <Svg.Rect
        id="gradient-rect"
        width={OFFER_WIDTH}
        height={OFFER_HEIGHT}
        fill="url(#offer-gradient)"
      />
    </Svg.Svg>
  );
};

export default ({item}: {item: OfferProps}) => {
  const {img, title, description, onPress} = item;
  const _onPress = () => {
    Haptic('impactLight');
    onPress();
  };

  return (
    <OfferCardContainer>
      <OfferBackgroundContainer>
        {img}
        <OfferBackgroundOverlay />
      </OfferBackgroundContainer>
      <OfferTitleText>{title}</OfferTitleText>
      <DescriptionContainer>
        <DescriptionText>{description}</DescriptionText>
        <ArrowContainer>
          <FooterArrow onPress={_onPress} underlayColor="white">
            <ArrowRight />
          </FooterArrow>
        </ArrowContainer>
      </DescriptionContainer>
    </OfferCardContainer>
  );
};
