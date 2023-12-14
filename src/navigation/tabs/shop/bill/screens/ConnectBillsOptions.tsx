import React, {useState} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';
import {BillScreens, BillGroupParamList} from '../BillGroup';
import {Linking, ScrollView, TouchableOpacity} from 'react-native';
import {horizontalPadding} from '../../components/styled/ShopTabComponents';
import Button from '../../../../../components/button/Button';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
  HEIGHT,
} from '../../../../../components/styled/Containers';
import {useFocusEffect} from '@react-navigation/native';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {
  H5,
  OptionDescription,
  TextAlign,
} from '../../../../../components/styled/Text';
import {AddSvg, SearchSvg, SyncSvg} from '../../components/svg/ShopTabSvgs';
import styled, {useTheme} from 'styled-components/native';
import {
  Action,
  Midnight,
  Slate,
  Slate30,
  SlateDark,
  Success25,
} from '../../../../../styles/colors';
import UserInfo from '../../components/UserInfo';
import {BitPayIdEffects} from '../../../../../store/bitpay-id';
import {AppActions} from '../../../../../store/app';
import {APP_NETWORK} from '../../../../../constants/config';

const TitleText = styled(H5)`
  margin-bottom: 14px;
  margin-top: 16px;
`;

const FooterButton = styled(CtaContainerAbsolute)`
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
  padding-bottom: 30px;
`;

const ConnectOptions = styled.View`
  margin-top: 20px;
  width: 100%;
`;

interface OptionProps {
  selected: boolean;
}

const ConnectOption = styled.View<OptionProps>`
  ${({selected, theme}) =>
    selected && theme.dark ? 'background-color: #081125;' : ''};
  border: ${({selected}) => (selected ? 1.5 : 1)}px solid;
  border-radius: 12px;
  border-color: ${({selected, theme}) =>
    selected ? Action : theme.dark ? SlateDark : Slate30};
  flex-direction: row;
  margin-top: 15px;
  padding: 21px;
  padding-left: 17px;
  ${({selected}) =>
    selected
      ? `
      padding: 20.5px;
      padding-left: 16.5px;
  `
      : ''}
  width: 100%;
`;

const DescriptionText = styled(OptionDescription)`
  ${({theme}) => (theme.dark ? `color: ${Slate};` : '')};
`;

const ConnectOptionIcon = styled.View<OptionProps>`
  margin-right: 15px;
  background-color: ${({selected, theme}) =>
    selected ? Action : theme.dark ? Midnight : '#eceffd'};
  border-radius: 11px;
  height: 44px;
  width: 44px;
  align-items: center;
  justify-content: center;
`;

const ConnectOptionTextContainer = styled.View`
  flex-shrink: 1;
  margin-top: -2px;
`;

const ConnectOptionHeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const ConnectOptionHeader = styled(H5)`
  margin-bottom: 5px;
`;

const ConnectOptionLabelContainer = styled.View`
  background-color: ${({theme}) => (theme.dark ? '#0B754A' : Success25)};
  border-radius: 6px;
  padding: 4px 9px 2px;
  margin-top: -8px;
  justify-content: center;
`;

const ConnectOptionLabelText = styled(OptionDescription)`
  color: ${({theme}) => (theme.dark ? Success25 : '#0b754a')};
  font-weight: 400;
`;

const ConnectBillsOptions = ({
  navigation,
}: StackScreenProps<BillGroupParamList, 'ConnectBillsOptions'>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const theme = useTheme();
  const apiToken = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.apiToken[APP_NETWORK],
  );

  const [selectedOption, setSelectedOption] = useState(
    'auto' as 'auto' | 'manual',
  );
  const [continueButtonState, setContinueButtonState] = useState(
    undefined as 'loading' | undefined,
  );
  useFocusEffect(() => {
    dispatch(Analytics.track('Bill Pay — Viewed Connect More Bills'));
  });

  const verifyUserInfo = async () => {
    setContinueButtonState('loading');
    await dispatch(
      BitPayIdEffects.startFetchBasicInfo(apiToken, {
        includeExternalData: true,
      }),
    );
    setContinueButtonState(undefined);
    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title: t('Confirm Your Info'),
        message: '',
        message2: <UserInfo />,
        enableBackdropDismiss: true,
        onBackdropDismiss: () => {},
        actions: [
          {
            text: t('THIS IS CORRECT'),
            action: () => {
              navigation.navigate(BillScreens.CONNECT_BILLS, {
                tokenType: 'auth',
              });
              dispatch(Analytics.track('Bill Pay — Confirmed User Info'));
            },
            primary: true,
          },
          {
            text: t('UPDATE INFO'),
            action: () => {
              Linking.openURL('https://bitpay.com/request-help/wizard');
              dispatch(Analytics.track('Bill Pay — Clicked Update User Info'));
            },
          },
        ],
      }),
    );
    dispatch(Analytics.track('Bill Pay — Clicked Connect My Bills'));
  };

  const searchBills = () => {
    navigation.navigate(BillScreens.CONNECT_BILLS, {
      tokenType: 'link',
    });
    dispatch(Analytics.track('Bill Pay — Clicked Search Bills'));
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          height: HEIGHT - 150,
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
      <FooterButton
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <Button
          state={continueButtonState}
          onPress={() => {
            selectedOption === 'auto' ? verifyUserInfo() : searchBills();
          }}
          buttonStyle={'primary'}>
          {continueButtonState === 'loading' ? t('Loading...') : t('Continue')}
        </Button>
      </FooterButton>
    </>
  );
};

export default ConnectBillsOptions;
