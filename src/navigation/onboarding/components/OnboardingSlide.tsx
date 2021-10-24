import {Disclaimer, H3, Paragraph} from '../../../components/styled/text/Text';
import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import {
  ImageContainer,
  SubTextContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/containers/Containers';

interface OnboardingSlide {
  title: string;
  text: string;
  subText?: string;
  img: () => ReactElement;
}

const SlideContainer = styled.View`
  background: white;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
`;

export default ({item}: {item: OnboardingSlide}) => {
  const {title, text, subText, img} = item;

  return (
    <SlideContainer>
      <ImageContainer>{img()}</ImageContainer>
      <TitleContainer>
        <H3>{title}</H3>
      </TitleContainer>
      <TextContainer>
        <Paragraph>{text}</Paragraph>
      </TextContainer>
      {subText && (
        <SubTextContainer>
          <Disclaimer>{subText}</Disclaimer>
        </SubTextContainer>
      )}
    </SlideContainer>
  );
};
