import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {BaseText, H7, HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTheme} from '../../../../contexts';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
  Hr,
  ScreenGutter,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {shareNative} from '../../../../utils/share';
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
import {FlashList} from '@shopify/flash-list';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {logManager} from '../../../../managers/LogManager';

export type AllAddressesParamList = {
  walletName: string;
  usedAddresses?: any[];
  unusedAddresses?: any[];
  currencyAbbreviation: string;
  chain: string;
  tokenAddress: string | undefined;
};

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  addressesContainer: {
    flex: 1,
  },
  verticalPadding: {
    padding: gutter,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    paddingTop: 20,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 15,
  },
  copyRow: {
    flexDirection: 'row',
  },
  copyImgContainerRight: {
    justifyContent: 'center',
  },
});

const AddressesContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.addressesContainer, style]} {...rest} />
);

const VerticalPadding: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.verticalPadding, style]} {...rest} />;

const Title: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.title, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const SubText: React.FC<React.ComponentProps<typeof H7>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <H7 style={[{color: theme.dark ? White : SlateDark}, style]} {...rest} />
  );
};

const CopyRow: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.copyRow, style]} {...rest} />;

const CopyImgContainerRight: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.copyImgContainerRight, style]} {...rest} />;

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

  const combinedAddresses = useMemo(
    () => [
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
    ],
    [t, unusedAddresses, usedAddresses],
  );

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
  }, [navigation, t]);

  const copyText = useCallback((text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
    setCopiedAddress(text);
  }, []);

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
      await dispatch(shareNative({title: subject, message: body}));
      setButtonState('success');
      await sleep(200);
      setButtonState(undefined);
    } catch (err) {
      const e = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error('[SendAddresses] ', e);
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
    [
      chain,
      copiedAddress,
      copyText,
      currencyAbbreviation,
      dispatch,
      tokenAddress,
    ],
  );

  return (
    <AddressesContainer>
      {combinedAddresses.length > 0 ? (
        <FlashList
          data={combinedAddresses}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
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
