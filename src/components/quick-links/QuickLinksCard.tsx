import React from 'react';
import styled from 'styled-components/native';
import {Action, SlateDark} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import {QuickLinkProps} from './QuickLinksSlides';

const QuickLinkCardContainer = styled.TouchableOpacity`
  justify-content: center;
  align-items: flex-start;
  flex-direction: row;
  width: 202px;
  height: 91px;
  border-radius: 12px;
  background-color: #f5f7f8;
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
  color: ${Action};
`;
const DescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  color: ${SlateDark};
`;

export default ({item}: {item: QuickLinkProps}) => {
  const {img, title, description, onPress} = item;

  return (
    <QuickLinkCardContainer onPress={() => onPress()}>
      <TextContainer>
        <TitleText>{title}</TitleText>
        <DescriptionText>{description}</DescriptionText>
      </TextContainer>
      <ImgContainer>{img()}</ImgContainer>
    </QuickLinkCardContainer>
  );
};
