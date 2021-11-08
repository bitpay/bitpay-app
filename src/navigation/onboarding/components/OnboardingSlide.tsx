import {
  Disclaimer,
  H3,
  Paragraph,
  TextAlign,
} from '../../../components/styled/Text';
import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import {
  ImageContainer,
  SubTextContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';

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

export const OnboardingSlide = ({item}: {item: OnboardingSlide}) => {
  const {title, text, subText, img} = item;

  return (
    <SlideContainer>
      <ImageContainer>{img()}</ImageContainer>
      <TitleContainer>
        <TextAlign align={'center'}>
          <H3>{title}</H3>
        </TextAlign>
      </TitleContainer>
      <TextContainer>
        <TextAlign align={'center'}>
          <Paragraph>{text}</Paragraph>
        </TextAlign>
      </TextContainer>
      {subText && (
        <SubTextContainer>
          <TextAlign align={'center'}>
            <Disclaimer>{subText}</Disclaimer>
          </TextAlign>
        </SubTextContainer>
      )}
    </SlideContainer>
  );
};

export default OnboardingSlide;
