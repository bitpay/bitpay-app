import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {BaseText, H7, HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
  Hr,
  ScreenGutter,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {Share, View} from 'react-native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../../WalletGroup';
import {SlateDark, White} from '../../../../styles/colors';
import Clipboard from '@react-native-clipboard/clipboard';
import Button, {ButtonState} from '../../../../components/button/Button';
import {FormatAmountStr} from '../../../../store/wallet/effects/amount/amount';
import {sleep} from '../../../../utils/helper-methods';
import {APP_NAME} from '../../../../constants/config';
import {useAppDispatch} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import haptic from '../../../../components/haptic-feedback/haptic';
import CopiedSvg from '../../../../../assets/img/copied-success.svg';
import {LogActions} from '../../../../store/log';
import {FlashList} from '@shopify/flash-list';
import {TouchableOpacity} from 'react-native-gesture-handler';

export type AllAddressesParamList = {
  walletName: string;
  usedAddresses?: any[];
  unusedAddresses?: any[];
  currencyAbbreviation: string;
  chain: string;
  tokenAddress: string | undefined;
};

const AddressesContainer = styled.SafeAreaView`
  flex: 1;
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter};
`;

const Title = styled(BaseText)`
  font-weight: bold;
  font-size: 18px;
  padding: 20px 0px 0px 15px;
  color: ${({theme}) => theme.colors.text};
`;

const SubText = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const CopyRow = styled(TouchableOpacity)`
  flex-direction: row;
`;

const CopyImgContainerRight = styled.View`
  justify-content: center;
`;

const AllAddresses = () => {
  const {t} = useTranslation();
  const {
    params: {
      walletName,
      currencyAbbreviation,
      usedAddresses,
      unusedAddresses,
      chain,
      tokenAddress,
    },
  } = useRoute<RouteProp<WalletGroupParamList, 'AllAddresses'>>();

  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const combinedAddresses = [
    ...(usedAddresses?.length
      ? [
          {type: 'sectionHeader', title: t('Addresses with balance')},
          ...usedAddresses,
        ]
      : []),
    ...(unusedAddresses?.length
      ? [
          {type: 'sectionHeader', title: t('Unused addresses')},
          ...unusedAddresses,
        ]
      : []),
  ];

  const [buttonState, setButtonState] = useState<ButtonState>();
  const [copiedAddress, setCopiedAddress] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setCopiedAddress(''), 3000);
    return () => clearTimeout(timer);
  }, [copiedAddress]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('All Addresses')}</HeaderTitle>,
    });
  });

  const copyText = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
    setCopiedAddress(text);
  };

  const sendAddresses = async () => {
    try {
      setButtonState('loading');
      const allAddresses =
        unusedAddresses?.concat(usedAddresses) || usedAddresses || [];

      const appName = APP_NAME;

      let body: string = t(
        ' Wallet "" Addresses\nOnly Main Addresses are shown.\n\n\n\'',
        {
          appName,
          walletName,
        },
      );

      body += allAddresses
        .map(({address, path, uiTime}) => {
          return `*  ${address} xpub ${path.substring(1)} ${uiTime || ''}`;
        })
        .join('\n');

      const subject = appName + ' Addresses';
      await Share.share({title: subject, message: body});
      setButtonState('success');
      await sleep(200);
      setButtonState(undefined);
    } catch (err) {
      const e = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error('[SendAddresses] ', e));
      setButtonState('failed');
      await sleep(500);
      setButtonState(undefined);
    }
  };

  const renderItem = useCallback(
    ({item}: {item: any}) => {
      if (item.title) {
        return <Title>{item.title}</Title>;
      } else if (item.amount) {
        const {address, amount} = item;
        return (
          <View>
            <VerticalPadding
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'space-between',
                flexDirection: 'row',
              }}>
              <CopyRow
                style={{justifyContent: 'center'}}
                activeOpacity={ActiveOpacity}
                onPress={() => copyText(address)}>
                <SettingTitle
                  numberOfLines={1}
                  ellipsizeMode={'middle'}
                  style={{maxWidth: 180}}>
                  {address}
                </SettingTitle>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedAddress === address ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopyRow>
              <H7>
                {dispatch(
                  FormatAmountStr(
                    currencyAbbreviation,
                    chain,
                    tokenAddress,
                    amount,
                  ),
                )}
              </H7>
            </VerticalPadding>
            <Hr />
          </View>
        );
      } else {
        const {address, path, uiTime} = item;
        return (
          <View>
            <VerticalPadding>
              <CopyRow
                activeOpacity={ActiveOpacity}
                onPress={() => copyText(address)}>
                <SettingTitle
                  numberOfLines={1}
                  ellipsizeMode={'middle'}
                  style={{width: '90%'}}>
                  {address}
                </SettingTitle>
                <CopyImgContainerRight style={{width: '10%'}}>
                  {copiedAddress === address ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopyRow>
              <SubText>
                {path} {uiTime}
              </SubText>
            </VerticalPadding>
            <Hr />
          </View>
        );
      }
    },
    [copiedAddress],
  );

  return (
    <AddressesContainer>
      {combinedAddresses.length > 0 ? (
        <FlashList
          data={combinedAddresses}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          estimatedItemSize={90}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{paddingBottom: 150}}
        />
      ) : (
        <VerticalPadding>
          <Title>{t('No addresses available')}</Title>
        </VerticalPadding>
      )}

      <CtaContainerAbsolute
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <Button onPress={sendAddresses} state={buttonState}>
          {t('Export Addresses')}
        </Button>
      </CtaContainerAbsolute>
    </AddressesContainer>
  );
};

export default AllAddresses;
