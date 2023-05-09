import React from 'react';
import {Image, ImageSourcePropType} from 'react-native';
import {LinearGradient} from 'rnx-gradient/src';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import Button from '../button/Button';
import {BaseText, H5, Link} from '../styled/Text';

const FeatureImage = styled(Image)`
  height: 100%;
  width: 100%;
  transform: scale(0.8);
`;

const BottomDescriptionContainer = styled.View`
  background: ${({theme}) => theme.colors.background};
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10%;
`;

const DescriptionTitle = styled(H5)`
  text-align: center;
`;

const DescriptionText = styled(BaseText)`
  color: ${({theme}) => theme.colors.text};
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 25px;
  letter-spacing: 0;
  text-align: center;
  margin-top: 20px;
`;

const LinkText = styled(Link)`
  font-weight: 500;
  font-size: 16px;
`;

const CtaContainer = styled.View`
  margin-top: 20px;
`;

interface Props {
  image: ImageSourcePropType;
  descriptionTitle: string;
  descriptionText: string;
  ctaText: string;
  cta: () => void;
}

const FeatureCardContainer = styled(LinearGradient).attrs(({theme}) => ({
  colors: theme.dark ? ['#606060', '#26272A'] : ['#FFFFFF', '#EBEDF8'],
  start: {x: 0, y: 0},
  end: {x: 0, y: 0},
  useAngle: true,
  angle: 225,
}))`
  flex: 1;
`;

const FeatureCard = ({
  image,
  descriptionTitle,
  descriptionText,
  ctaText,
  cta,
}: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <FeatureCardContainer>
      <FeatureImage
        resizeMode={'contain'}
        style={{marginTop: insets.top}}
        source={image}
      />
      <BottomDescriptionContainer>
        <DescriptionTitle bold>{descriptionTitle}</DescriptionTitle>
        <DescriptionText>{descriptionText}</DescriptionText>
        <CtaContainer>
          <Button buttonType={'link'} onPress={cta}>
            <LinkText>{ctaText}</LinkText>
          </Button>
        </CtaContainer>
      </BottomDescriptionContainer>
    </FeatureCardContainer>
  );
};

export default FeatureCard;
