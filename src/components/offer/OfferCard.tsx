import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';
import {OfferProps} from './OfferSlides';
import ArrowRight from '../../../assets/img/arrow-right.svg';

const OfferCardContainer = styled.View`
  justify-content: flex-start;
  align-items: flex-start;
  flex-direction: column;
  width: 260px;
  height: 182px;
  border-radius: 12px;
`;

const ImgBackground = styled.View`
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
  border-radius: 50;
  justify-content: center;
  align-items: center;
`;

export default ({item}: {item: OfferProps}) => {
  const {img, title, description} = item;

  return (
    <OfferCardContainer>
      <ImgBackground>{img()}</ImgBackground>
      <OfferTitleText>{title}</OfferTitleText>
      <DescriptionContainer>
        <DescriptionText>{description}</DescriptionText>
        <ArrowContainer>
          <ArrowRight />
        </ArrowContainer>
      </DescriptionContainer>
    </OfferCardContainer>
  );
};
