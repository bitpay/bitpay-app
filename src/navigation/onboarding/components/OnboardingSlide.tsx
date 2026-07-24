import React, {ReactElement} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {
  ImageContainer,
  SubTextContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import {
  Disclaimer,
  H3,
  Paragraph,
  TextAlign,
} from '../../../components/styled/Text';

interface OnboardingSlide {
  title: string;
  text: string;
  subText?: string;
  img: () => ReactElement;
}

interface OnboardingSlideProps {
  item: OnboardingSlide;
}

const styles = StyleSheet.create({
  slideContainer: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
});

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({item}) => {
  const {title, text, subText, img} = item;
  const theme = useTheme();
  const themedText = {color: theme.colors.text};

  return (
    <View style={styles.slideContainer}>
      <ImageContainer justifyContent="flex-end">{img()}</ImageContainer>
      <TitleContainer>
        <TextAlign align={'center'} style={themedText}>
          <H3>{title}</H3>
        </TextAlign>
      </TitleContainer>
      <TextContainer>
        <TextAlign align={'center'} style={themedText}>
          <Paragraph>{text}</Paragraph>
        </TextAlign>
      </TextContainer>
      {subText && (
        <SubTextContainer>
          <TextAlign align={'center'} style={themedText}>
            <Disclaimer>{subText}</Disclaimer>
          </TextAlign>
        </SubTextContainer>
      )}
    </View>
  );
};

export default OnboardingSlide;
