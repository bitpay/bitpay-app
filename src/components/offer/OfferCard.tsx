import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';
import {OfferProps} from './OfferSlides';
import ArrowRight from '../../../assets/img/arrow-right.svg';
import {White} from '../../styles/colors';
import Haptic from '../haptic-feedback/haptic';
import {ScreenGutter} from '../styled/Containers';

const OfferCardContainer = styled.View`
  justify-content: flex-start;
  align-items: flex-start;
  flex-direction: column;
  width: 260px;
  height: 182px;
  left: ${ScreenGutter};
`;

const ImgBackground = styled.View`
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

export default ({item}: {item: OfferProps}) => {
  const {img, title, description, onPress} = item;
  const _onPress = () => {
    Haptic('impactLight');
    onPress();
  };

  return (
    <OfferCardContainer>
      <ImgBackground>{img}</ImgBackground>
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
