import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import styled, {useTheme} from 'styled-components/native';
import FeatureCard from '../../../components/feature-card/FeatureCard';
import {IntroStackParamList} from '../IntroStack';

const lightImage = require('../../../../assets/img/intro/light/whats-new.png');
const darkImage = require('../../../../assets/img/intro/dark/whats-new.png');

const IntroStartContainer = styled.View`
  flex: 1;
`;

type IntroStartScreenProps = NativeStackScreenProps<
  IntroStackParamList,
  'Start'
>;

const Start: React.VFC<IntroStartScreenProps> = ({navigation}) => {
  const {t} = useTranslation();
  const theme = useTheme();

  const onNext = () => {
    navigation.navigate('WhatsNew');
  };

  return (
    <IntroStartContainer>
      <FeatureCard
        image={theme.dark ? darkImage : lightImage}
        descriptionTitle={t('Explore the new BitPay App')}
        descriptionText={t(
          'Your home tab is now your launchpad. View all your keys and check out new offerings from BitPay.',
        )}
        ctaText={t('Check it out')}
        cta={onNext}
      />
    </IntroStartContainer>
  );
};

export default Start;
