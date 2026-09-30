import React, {useLayoutEffect} from 'react';
import {
  SafeAreaView,
  View,
  ViewProps,
  Text,
  TextProps,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../../contexts';
import {useNavigation} from '@react-navigation/native';
import Button from '../../../components/button/Button';
import {BaseText} from '../../../components/styled/Text';
import {Slate30, SlateDark, White} from '../../../styles/colors';
import CoinbaseBitPayIcon from '../../../../assets/img/coinbase/bc.svg';

import Coinbase from '../../../api/coinbase/index';
import {AppEffects} from '../../../store/app';
import {useAppDispatch} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../store/analytics/analytics.effects';

const signupUrl: string = 'https://www.coinbase.com/signup';

const styles = StyleSheet.create({
  coinbaseContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  coinbaseHeaderContainer: {
    textAlign: 'center',
    marginBottom: 40,
    marginTop: -50,
  },
  buttonContainer: {
    marginTop: 20,
  },
  noConnectedContainer: {
    paddingHorizontal: 15,
  },
  noConnectedIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 30,
    marginRight: 0,
    marginBottom: 8,
    marginLeft: 0,
  },
  subTitle: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
});

const CoinbaseContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.coinbaseContainer, style]} {...rest} />
);

const CoinbaseHeaderContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.coinbaseHeaderContainer, style]} {...rest} />
);

const ButtonContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.buttonContainer, style]} {...rest} />
);

const NoConnectedContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.noConnectedContainer, style]} {...rest} />
);

const NoConnectedIcon = ({style, ...rest}: ViewProps) => (
  <View style={[styles.noConnectedIcon, style]} {...rest} />
);

const Title = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[styles.title, {color: theme.dark ? White : SlateDark}, style]}
      {...rest}
    />
  );
});

const SubTitle = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.subTitle,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});

const CoinbaseIntro = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const onPressButton = async (context: 'signin' | 'signup') => {
    let url;
    if (context === 'signin') {
      url = Coinbase.getOAuthUrl();
    } else {
      url = signupUrl;
    }
    dispatch(
      Analytics.track('Clicked Coinbase Intro', {
        context,
      }),
    );
    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
    });
  }, [navigation]);

  return (
    <CoinbaseContainer>
      <NoConnectedContainer>
        <CoinbaseHeaderContainer>
          <NoConnectedIcon>
            <CoinbaseBitPayIcon width={160} height={120} />
          </NoConnectedIcon>
          <Title>{t('Connect to Coinbase')}</Title>
          <SubTitle>
            {t(
              'Manage your Coinbase accounts, check balances, deposit and withdraw funds between wallets.',
            )}
          </SubTitle>
        </CoinbaseHeaderContainer>
        <ButtonContainer>
          <Button
            children={t('Connect')}
            onPress={() => onPressButton('signin')}
          />
        </ButtonContainer>
        <ButtonContainer>
          <Button
            children={t('Sign Up for Coinbase')}
            buttonStyle={'secondary'}
            onPress={() => onPressButton('signup')}
          />
        </ButtonContainer>
      </NoConnectedContainer>
    </CoinbaseContainer>
  );
};

export default CoinbaseIntro;
