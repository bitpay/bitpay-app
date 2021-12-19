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

const QuickLinkCardContainer = styled.TouchableOpacity<{
  isDark: boolean;
}>`
  justify-content: center;
  align-items: flex-start;
  flex-direction: row;
  width: 202px;
  height: 91px;
  border-radius: 12px;
  background-color: ${({isDark}) => (isDark ? LightBlack : NeutralSlate)};
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

const TitleText = styled(BaseText)<{isDark: boolean}>`
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  line-height: 25px;
  color: ${({isDark}) => (isDark ? White : Action)};
`;
const DescriptionText = styled(BaseText)<{isDark: boolean}>`
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  color: ${({isDark}) => (isDark ? White : SlateDark)};
`;

export default ({item}: {item: QuickLinkProps}) => {
  const {img, title, description, onPress, theme} = item;

  return (
    <QuickLinkCardContainer
      onPress={() => {
        haptic('impactLight');
        onPress();
      }}
      isDark={theme.dark}>
      <TextContainer>
        <TitleText isDark={theme.dark}>{title}</TitleText>
        <DescriptionText
          numberOfLines={2}
          ellipsizeMode={'tail'}
          isDark={theme.dark}>
          {description}
        </DescriptionText>
      </TextContainer>
      <ImgContainer>{img}</ImgContainer>
    </QuickLinkCardContainer>
  );
};
