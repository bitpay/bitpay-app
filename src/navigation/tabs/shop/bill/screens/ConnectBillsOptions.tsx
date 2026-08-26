import React, {useEffect, useState} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';
import {BillScreens, BillGroupParamList} from '../BillGroup';
import {Linking, ScrollView, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  ScreenContainer,
  horizontalPadding,
} from '../../components/styled/ShopTabComponents';
import Button from '../../../../../components/button/Button';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import FooterButtonContainer from '../../../../../components/footer/FooterButtonContainer';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {
  H5,
  OptionDescription,
  TextAlign,
} from '../../../../../components/styled/Text';
import {AddSvg, SearchSvg, SyncSvg} from '../../components/svg/ShopTabSvgs';
import {useTheme} from '../../../../../contexts';
import {
  Action,
  LightBlue,
  Midnight,
  Slate,
  Slate30,
  SlateDark,
  Success25,
} from '../../../../../styles/colors';
import UserInfo from '../../components/UserInfo';
import {BitPayIdEffects} from '../../../../../store/bitpay-id';
import {AppActions} from '../../../../../store/app';

const styles = StyleSheet.create({
  titleText: {
    marginBottom: 14,
    marginTop: 16,
  },
  connectOptions: {
    marginTop: 20,
    width: '100%',
  },
  connectOption: {
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 15,
    width: '100%',
  },
  connectOptionIcon: {
    marginRight: 15,
    borderRadius: 11,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectOptionTextContainer: {
    flexShrink: 1,
    marginTop: -2,
  },
  connectOptionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectOptionHeader: {
    marginBottom: 5,
  },
  connectOptionLabelContainer: {
    borderRadius: 6,
    paddingTop: 4,
    paddingHorizontal: 9,
    paddingBottom: 2,
    marginTop: -8,
    justifyContent: 'center',
  },
  connectOptionLabelText: {
    fontWeight: '400',
  },
});

const TitleText = ({style, ...rest}: React.ComponentProps<typeof H5>) => (
  <H5 style={[styles.titleText, style]} {...rest} />
);

const ConnectOptions = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.connectOptions, style]} {...rest} />
);

interface OptionProps {
  selected: boolean;
}

const ConnectOption = ({
  selected,
  style,
  ...rest
}: OptionProps & React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  const padding = selected ? 20.5 : 21;
  const paddingLeft = selected ? 16.5 : 17;
  return (
    <View
      style={[
        styles.connectOption,
        selected && theme.dark ? {backgroundColor: '#081125'} : null,
        {
          borderWidth: selected ? 1.5 : 1,
          borderColor: selected ? Action : theme.dark ? SlateDark : Slate30,
        },
        {
          padding,
          paddingLeft,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const DescriptionText = ({
  style,
  ...rest
}: React.ComponentProps<typeof OptionDescription>) => {
  const theme = useTheme();
  return (
    <OptionDescription
      style={[theme.dark ? {color: Slate} : null, style]}
      {...rest}
    />
  );
};

const ConnectOptionIcon = ({
  selected,
  style,
  ...rest
}: OptionProps & React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.connectOptionIcon,
        {
          backgroundColor: selected
            ? Action
            : theme.dark
            ? Midnight
            : LightBlue,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const ConnectOptionTextContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.connectOptionTextContainer, style]} {...rest} />
);

const ConnectOptionHeaderContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.connectOptionHeaderContainer, style]} {...rest} />
);

const ConnectOptionHeader = ({
  style,
  ...rest
}: React.ComponentProps<typeof H5>) => (
  <H5 style={[styles.connectOptionHeader, style]} {...rest} />
);

const ConnectOptionLabelContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.connectOptionLabelContainer,
        {backgroundColor: theme.dark ? '#0B754A' : Success25},
        style,
      ]}
      {...rest}
    />
  );
};

const ConnectOptionLabelText = ({
  style,
  ...rest
}: React.ComponentProps<typeof OptionDescription>) => {
  const theme = useTheme();
  return (
    <OptionDescription
      style={[
        styles.connectOptionLabelText,
        {color: theme.dark ? Success25 : '#0b754a'},
        style,
      ]}
      {...rest}
    />
  );
};

const ConnectBillsOptions = ({
  navigation,
}: StackScreenProps<BillGroupParamList, 'ConnectBillsOptions'>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const theme = useTheme();
  const apiToken = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.apiToken[APP.network],
  );

  const [selectedOption, setSelectedOption] = useState(
    'auto' as 'auto' | 'manual',
  );
  const [continueButtonState, setContinueButtonState] = useState(
    undefined as 'loading' | undefined,
  );
  useEffect(() => {
    dispatch(Analytics.track('Bill Pay - Viewed Connect More Bills'));
  }, [dispatch]);

  const verifyUserInfo = async () => {
    setContinueButtonState('loading');
    await dispatch(
      BitPayIdEffects.startFetchBasicInfo(apiToken, {
        includeExternalData: true,
      }),
    ).catch(() => {});
    setContinueButtonState(undefined);
    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title: t('Confirm Your Info'),
        message: '',
        message2: <UserInfo />,
        modalLibrary: 'bottom-sheet',
        enableBackdropDismiss: true,
        onBackdropDismiss: () => {},
        actions: [
          {
            text: t('THIS IS CORRECT'),
            action: () => {
              navigation.navigate(BillScreens.CONNECT_BILLS, {
                tokenType: 'auth',
              });
              dispatch(Analytics.track('Bill Pay - Confirmed User Info'));
            },
            primary: true,
          },
          {
            text: t('UPDATE INFO'),
            action: () => {
              Linking.openURL('https://bitpay.com/request-help/wizard');
              dispatch(Analytics.track('Bill Pay - Clicked Update User Info'));
            },
          },
        ],
      }),
    );
    dispatch(Analytics.track('Bill Pay - Clicked Connect My Bills'));
  };

  const searchBills = () => {
    navigation.navigate(BillScreens.CONNECT_BILLS, {
      tokenType: 'link',
    });
    dispatch(Analytics.track('Bill Pay - Clicked Search Bills'));
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          alignItems: 'center',
        }}>
        <AddSvg theme={theme} />
        <TitleText>Connect More Bills</TitleText>
        <TextAlign align="center">
          <DescriptionText>
            Let us check to see what bills you have or add bills manually in a
            few simple steps.
          </DescriptionText>
        </TextAlign>
        <ConnectOptions>
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() => setSelectedOption('auto')}>
            <ConnectOption selected={selectedOption === 'auto'}>
              <ConnectOptionIcon selected={selectedOption === 'auto'}>
                <SyncSvg active={selectedOption === 'auto'} theme={theme} />
              </ConnectOptionIcon>
              <ConnectOptionTextContainer>
                <ConnectOptionHeaderContainer>
                  <ConnectOptionHeader>Auto Connect Bills</ConnectOptionHeader>
                  <ConnectOptionLabelContainer>
                    <ConnectOptionLabelText>Fastest</ConnectOptionLabelText>
                  </ConnectOptionLabelContainer>
                </ConnectOptionHeaderContainer>

                <DescriptionText>
                  Automatically search for your outstanding liabilities. Bills
                  like mortgages, car loans, credit card bills, personal loans &
                  more.
                </DescriptionText>
              </ConnectOptionTextContainer>
            </ConnectOption>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() => setSelectedOption('manual')}>
            <ConnectOption selected={selectedOption === 'manual'}>
              <ConnectOptionIcon selected={selectedOption === 'manual'}>
                <SearchSvg theme={theme} active={selectedOption === 'manual'} />
              </ConnectOptionIcon>
              <ConnectOptionTextContainer>
                <ConnectOptionHeader>Search Bills</ConnectOptionHeader>
                <DescriptionText>
                  Search through thousands of billers to find and connect your
                  bill.
                </DescriptionText>
              </ConnectOptionTextContainer>
            </ConnectOption>
          </TouchableOpacity>
        </ConnectOptions>
      </ScrollView>
      <FooterButtonContainer>
        <Button
          state={continueButtonState}
          onPress={() => {
            selectedOption === 'auto' ? verifyUserInfo() : searchBills();
          }}
          buttonStyle={'primary'}>
          {continueButtonState === 'loading' ? t('Loading...') : t('Continue')}
        </Button>
      </FooterButtonContainer>
    </ScreenContainer>
  );
};

export default ConnectBillsOptions;
