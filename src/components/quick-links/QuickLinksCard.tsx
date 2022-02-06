import React from 'react';
import styled from 'styled-components/native';
import {
  Action,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../styles/colors';
import haptic from '../haptic-feedback/haptic';
import {BaseText} from '../styled/Text';
import {QuickLinkProps} from './QuickLinksSlides';
import {ActiveOpacity} from '../styled/Containers';

const QuickLinkCardContainer = styled.TouchableOpacity`
  justify-content: center;
  align-items: flex-start;
  flex-direction: row;
  width: 202px;
  height: 91px;
  border-radius: 12px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  overflow: hidden;
`;

const ImgContainer = styled.View`
  padding-left: 3px;
  top: -8px;
  right: -9px;
  width: 75px;
  height: 78px;
`;

const TextContainer = styled.View`
  padding-top: 19px;
  padding-bottom: 19px;
  padding-left: 16px;
  width: 118px;
`;

const TitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  line-height: 25px;
  color: ${({theme: {dark}}) => (dark ? White : Action)};
`;
const DescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

export default ({item}: {item: QuickLinkProps}) => {
  const {img, title, description, onPress} = item;

  return (
    <QuickLinkCardContainer
      activeOpacity={ActiveOpacity}
      onPress={() => {
        haptic('impactLight');
        onPress();
      }}>
      <TextContainer>
        <TitleText>{title}</TitleText>
        <DescriptionText numberOfLines={2} ellipsizeMode={'tail'}>
          {description}
        </DescriptionText>
      </TextContainer>
      <ImgContainer>{img}</ImgContainer>
    </QuickLinkCardContainer>
  );
};
