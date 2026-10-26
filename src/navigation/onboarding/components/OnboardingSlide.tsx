import React, {memo} from 'react';
import type {ReactElement} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
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

export interface OnboardingSlideItem {
  title: string;
  text: string;
  subText?: string;
  img: () => ReactElement;
}

interface OnboardingSlideProps {
  item: OnboardingSlideItem;
}

const styles = StyleSheet.create({
  slideContainer: {
    backgroundColor: 'transparent',
    marginTop: 20,
  },
  slideContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
    paddingBottom: 20,
  },
});

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({item}) => {
  const {title, text, subText, img} = item;
  const theme = useTheme();
  const themedText = {color: theme.colors.text};

  return (
    <ScrollView
      style={styles.slideContainer}
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}>
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
    </ScrollView>
  );
};

export default memo(OnboardingSlide);
