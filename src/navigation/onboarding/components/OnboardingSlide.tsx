import {Disclaimer, H3, Paragraph} from '../../../components/styled/text/Text';
import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import {Dimensions} from 'react-native';

const WIDTH = Dimensions.get('window').width;

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
  padding: 10px;
`;

const ImageContainer = styled.View`
  margin-top: 10px;
  height: 200px;
  display: flex;
  justify-content: center;
`;

const TitleContainer = styled.View`
  width: ${WIDTH * 0.75}px;
`;

const TextContainer = styled.View`
  padding: 10px;
`;

const SubTextContainer = styled.View`
  width: ${WIDTH * 0.8}px;
  margin-top: 10px;
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
