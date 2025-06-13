import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Linking, ScrollView} from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import styled from 'styled-components/native';
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

const TabScreenContainer = styled(ScreenContainer)`
  justify-content: center;
  align-items: center;
  flex-grow: 1;
`;

const TabScreenErrorBody = styled.View`
  align-items: center;
  align-self: center;
  padding: ${ScreenGutter};
  gap: 15px;
`;

const ErrorBox = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Slate10)};
  border-radius: 8px;
  padding: 25px;
  max-height: 315px;
  max-width: ${WIDTH - 40}px;
  margin-top: 20px;
  overflow: hidden;
`;

const StackTrace = styled(Paragraph)`
  font-size: 12px;
  line-height: 18px;
`;

const StackTraceContainer = styled.View`
  flex-shrink: 1;
`;

const ErrorMessageContainer = styled.View`
  padding: 20px;
  border: 1px solid ${({theme}) => (theme.dark ? '#353535' : Grey)};
  border-radius: 6px;
  margin-bottom: 10px;
`;

const TabScreenErrorFallback: React.FC<TabsScreenErrorFallbackProps> = ({
  error,
  stackTrace,
  options,
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
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
        <TabScreenContainer>
          <TabScreenErrorBody>
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
            <ErrorBox>
              <ErrorMessageContainer>
                <Paragraph>{error?.message || ''}</Paragraph>
              </ErrorMessageContainer>
              <StackTraceContainer>
                <StackTrace>{error?.stack || stackTrace || ''}</StackTrace>
              </StackTraceContainer>
            </ErrorBox>
          </TabScreenErrorBody>
        </TabScreenContainer>
      </ScrollView>
    </TabContainer>
  );
};

type TabScreenProps =
  | CardHomeScreenProps
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
          setError(err);
          setStackTrace(stack);
        }}>
        <TabScreen {...props} />
      </ErrorBoundary>
    );
  };
};
