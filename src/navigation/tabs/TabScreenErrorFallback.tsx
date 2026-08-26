import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Linking, ScrollView, StyleSheet, View} from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import * as Sentry from '@sentry/react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTheme} from '../../contexts';
import {
  ScreenContainer,
  ScreenGutter,
  WIDTH,
} from '../../components/styled/Containers';
import TabContainer from './TabContainer';
import {ShopScreens, ShopStackParamList} from './shop/ShopStack';
import {BillGroupParamList, BillScreens} from './shop/bill/BillGroup';
import {
  SettingsGroupParamList,
  SettingsScreens,
} from './settings/SettingsGroup';
import {CardHomeScreenProps} from '../card/screens/CardHome';
import type {HomeScreenProps} from './home/HomeRoot';
import {HeaderContainer, HeaderLeftContainer} from './home/components/Styled';
import {H3, Link, Paragraph, TextAlign} from '../../components/styled/Text';
import WarningSvg from '../../../assets/img/warning.svg';
import Icons from '../wallet/components/WalletIcons';
import {Grey, LightBlack, Slate10} from '../../styles/colors';

interface TabsScreenErrorFallbackOptions {
  includeHeader?: boolean;
}
interface TabsScreenErrorFallbackProps {
  error?: Error;
  stackTrace?: string;
  options?: TabsScreenErrorFallbackOptions;
}

const styles = StyleSheet.create({
  tabScreenContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  tabScreenErrorBody: {
    alignItems: 'center',
    alignSelf: 'center',
    padding: parseInt(ScreenGutter, 10),
    gap: 15,
  },
  errorBox: {
    borderRadius: 8,
    padding: 25,
    maxHeight: 315,
    maxWidth: WIDTH - 40,
    marginTop: 20,
    overflow: 'hidden',
  },
  stackTrace: {
    fontSize: 12,
    lineHeight: 18,
  },
  stackTraceContainer: {
    flexShrink: 1,
  },
  errorMessageContainer: {
    padding: 20,
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 10,
  },
});

const TabScreenErrorFallback: React.FC<TabsScreenErrorFallbackProps> = ({
  error,
  stackTrace,
  options,
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const theme = useTheme();
  return (
    <TabContainer>
      {options?.includeHeader ? (
        <HeaderContainer>
          <HeaderLeftContainer>
            <TouchableOpacity
              onPress={() => navigation.navigate('SettingsHome')}>
              <Icons.HomeSettings />
            </TouchableOpacity>
          </HeaderLeftContainer>
        </HeaderContainer>
      ) : null}
      <ScrollView contentContainerStyle={{flex: 1}}>
        <ScreenContainer style={styles.tabScreenContainer}>
          <View style={styles.tabScreenErrorBody}>
            <WarningSvg height={50} width={50} />
            <H3>Something Went Wrong</H3>
            <TextAlign align={'center'}>
              <Paragraph>
                We are unable to load this tab. If this error persists, please{' '}
                <Link
                  onPress={() =>
                    Linking.openURL('https://bitpay.com/request-help/wizard')
                  }>
                  {t('contact BitPay Support')}
                </Link>
                , and provide the error message below.
              </Paragraph>
            </TextAlign>
            <View
              style={[
                styles.errorBox,
                {backgroundColor: theme.dark ? LightBlack : Slate10},
              ]}>
              <View
                style={[
                  styles.errorMessageContainer,
                  {borderColor: theme.dark ? '#353535' : Grey},
                ]}>
                <Paragraph>{error?.message || ''}</Paragraph>
              </View>
              <View style={styles.stackTraceContainer}>
                <Paragraph style={styles.stackTrace}>
                  {error?.stack || stackTrace || ''}
                </Paragraph>
              </View>
            </View>
          </View>
        </ScreenContainer>
      </ScrollView>
    </TabContainer>
  );
};

type TabScreenProps =
  | CardHomeScreenProps
  | HomeScreenProps
  | NativeStackScreenProps<BillGroupParamList, BillScreens.BILLS_HOME>
  | NativeStackScreenProps<ShopStackParamList, ShopScreens.HOME>
  | NativeStackScreenProps<
      SettingsGroupParamList,
      SettingsScreens.SETTINGS_HOME
    >;

export const withErrorFallback = <T extends TabScreenProps>(
  TabScreen: React.FC<T>,
  options: TabsScreenErrorFallbackOptions = {},
) => {
  return function TabScreenWithFallback(props: T) {
    const [error, setError] = useState<Error>();
    const [stackTrace, setStackTrace] = useState<string>();
    const fallbackComponent = () => (
      <TabScreenErrorFallback
        error={error}
        stackTrace={stackTrace}
        options={options}
      />
    );
    return (
      <ErrorBoundary
        FallbackComponent={fallbackComponent}
        onError={(err, stack) => {
          Sentry.captureException(err, {
            level: 'error',
            tags: {
              errorBoundary: 'tab-screen',
              screen: TabScreen.displayName || TabScreen.name || 'unknown',
            },
            extra: {componentStack: stack},
          });
          setError(err);
          setStackTrace(stack);
        }}>
        <TabScreen {...props} />
      </ErrorBoundary>
    );
  };
};
