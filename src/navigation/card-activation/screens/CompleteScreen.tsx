import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {ScreenGutter} from '../../../components/styled/Containers';
import {H4, Paragraph} from '../../../components/styled/Text';
import {navigationRef} from '../../../Root';
import OnTheMoonSvg from '../assets/on-the-moon.svg';
import {CardActivationStackParamList} from '../CardActivationStack';

export type CompleteScreenParamList = undefined;

const ContentContainer = styled.View`
  margin-left: ${ScreenGutter};
  margin-right: ${ScreenGutter};
`;

const HeroImageContainer = styled.View`
  align-items: center;
  margin-bottom: 16px;
`;

const HeroImageWrapper = styled.View`
  height: 420px;
  width: 648px;
`;

const Heading = styled(H4)`
  margin-bottom: 16px;
  text-align: center;
`;

const Description = styled(Paragraph)`
  margin-bottom: 20px;
`;

const CompleteScreen: React.FC<
  NativeStackScreenProps<CardActivationStackParamList, 'Complete'>
> = () => {
  const {t} = useTranslation();
  const onViewCardPress = () => {
    navigationRef.navigate('Tabs', {
      screen: 'Card',
      params: {
        screen: 'Home',
      },
    });
  };

  return (
    <SafeAreaView>
      <HeroImageContainer>
        <HeroImageWrapper>
          <OnTheMoonSvg />
        </HeroImageWrapper>
      </HeroImageContainer>

      <ContentContainer>
        <Heading>{t('Your card is now activated!')}</Heading>

        <Description>
          {t(
            'You can now use your card at over 40 million locations in 210 countries and territories.',
          )}
        </Description>

        <Button onPress={onViewCardPress}>{t('View My Card')}</Button>
      </ContentContainer>
    </SafeAreaView>
  );
};

export default CompleteScreen;
