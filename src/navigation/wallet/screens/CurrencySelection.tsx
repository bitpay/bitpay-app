import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CtaContainer,
  HeaderRightContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import CurrencySelectionRow, {
  CurrencySelectionItem,
  CurrencySelectionRowProps,
} from '../../../components/list/CurrencySelectionRow';
import Button from '../../../components/button/Button';
import {
  FlatList,
  ListRenderItem,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import {useTheme} from '../../../contexts';
import {useNavigation} from '@react-navigation/native';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  OtherSupportedCurrencyOptions,
  SupportedCoinsOptions,
  SupportedCurrencyOption,
  SupportedCurrencyOptions,
  SupportedUtxoCurrencyOptions,
} from '../../../constants/SupportedCurrencyOptions';
import {WalletGroupParamList} from '../WalletGroup';
import {
  setHomeCarouselConfig,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {useOngoingProcess} from '../../../contexts';
import {logManager} from '../../../managers/LogManager';
import {startCreateKey} from '../../../store/wallet/effects';
import {SlateDark, White} from '../../../styles/colors';
import {IsUtxoChain} from '../../../store/wallet/utils/currency';

type CurrencySelectionScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  'CurrencySelection'
>;

type CurrencySelectionContextWithoutKey = 'onboarding' | 'createNewKey';
type CurrencySelectionContextWithKey =
  | 'addWalletMultisig'
  | 'addTSSWalletMultisig'
  | 'addUtxoWallet';

export type CurrencySelectionParamList =
  | {
      context: CurrencySelectionContextWithoutKey;
      key?: undefined;
    }
  | {
      context: CurrencySelectionContextWithKey;
      key: Key;
    };

type CurrencySelectionListItem = CurrencySelectionRowProps & {
  isHeader?: boolean;
  headerTitle?: string;
};

interface SelectedCurrencies {
  chain: string;
  currencyAbbreviation: string;
  isToken: boolean;
}

export interface ContextHandler {
  headerTitle?: string;
  ctaTitle?: string;
  onCtaPress?: () => void;
  selectedCurrencies: SelectedCurrencies[];
}

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  currencySelectionContainer: {
    flex: 1,
  },
  listContainer: {
    flexShrink: 1,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 16,
    paddingHorizontal: gutter,
  },
});

export const CurrencySelectionContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.currencySelectionContainer, style]} {...rest} />
);

const ListContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.listContainer, style]} {...rest} />;

const SectionHeader: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.sectionHeader,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const SupportedMultisigCurrencyOptions: SupportedCurrencyOption[] =
  SupportedCurrencyOptions.filter(currency => currency.hasMultisig);

const SupportedTSSCurrencyOptions: SupportedCurrencyOption[] =
  SupportedCoinsOptions;

const keyExtractor = (item: CurrencySelectionListItem, index: number) =>
  item.isHeader
    ? `header-${item.headerTitle}`
    : item.currency?.id || `item-${index}`;

const CurrencySelection = ({route}: CurrencySelectionScreenProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const {context, key} = route.params;
  const dispatch = useAppDispatch();

  const [allListItems, setAllListItems] = useState<CurrencySelectionListItem[]>(
    [],
  );
  const allListItemsRef = useRef(allListItems);
  allListItemsRef.current = allListItems;

  useEffect(() => {
    switch (context) {
      case 'addUtxoWallet': {
        const utxoItems: CurrencySelectionListItem[] = [];

        utxoItems.push({
          isHeader: true,
          headerTitle: t('Wallets'),
          currency: {} as CurrencySelectionItem,
        });

        SupportedUtxoCurrencyOptions.forEach(currency => {
          utxoItems.push({
            currency: {
              ...currency,
              imgSrc: undefined,
              selected: false,
              disabled: false,
              chain: currency.currencyAbbreviation.toLowerCase(),
            } as CurrencySelectionItem,
          });
        });

        utxoItems.push({
          isHeader: true,
          headerTitle: t('Accounts'),
          currency: {} as CurrencySelectionItem,
        });

        OtherSupportedCurrencyOptions.forEach(currency => {
          utxoItems.push({
            currency: {
              ...currency,
              imgSrc: undefined,
              selected: false,
              disabled: false,
              chain: currency.currencyAbbreviation.toLowerCase(),
            } as CurrencySelectionItem,
          });
        });

        setAllListItems(utxoItems);
        return;
      }
      case 'addWalletMultisig':
        const multisigItems = SupportedMultisigCurrencyOptions.map(currency => {
          const item: CurrencySelectionListItem = {
            currency: {
              ...currency,
              imgSrc: undefined,
              selected: false,
              disabled: false,
            } as CurrencySelectionItem,
          };
          return item;
        });
        setAllListItems(multisigItems);
        return;

      case 'addTSSWalletMultisig':
        const walletCurrencies = SupportedTSSCurrencyOptions.filter(currency =>
          IsUtxoChain(currency.currencyAbbreviation.toLowerCase()),
        );
        const accountCurrencies = SupportedTSSCurrencyOptions.filter(
          currency =>
            !IsUtxoChain(currency.currencyAbbreviation.toLowerCase()) &&
            currency.currencyAbbreviation.toLowerCase() !== 'sol', // TODO: need to add EDDSA support to bitcore-tss
        );

        const tssItems: CurrencySelectionListItem[] = [];

        tssItems.push({
          isHeader: true,
          headerTitle: t('Wallets'),
          currency: {} as CurrencySelectionItem,
        });

        walletCurrencies.forEach(currency => {
          tssItems.push({
            currency: {
              ...currency,
              imgSrc: undefined,
              selected: false,
              disabled: false,
            } as CurrencySelectionItem,
          });
        });

        tssItems.push({
          isHeader: true,
          headerTitle: t('Accounts'),
          currency: {} as CurrencySelectionItem,
        });

        accountCurrencies.forEach(currency => {
          tssItems.push({
            currency: {
              ...currency,
              imgSrc: undefined,
              selected: false,
              disabled: false,
            } as CurrencySelectionItem,
          });
        });

        setAllListItems(tssItems);
        return;

      default:
        setAllListItems([]);
    }
  }, [context, t]);

  const showErrorModal = (e: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Something went wrong'),
        message: e,
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('OK'),
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const selectedCurrencies = useMemo(() => {
    return allListItems.reduce<SelectedCurrencies[]>((accum, item) => {
      if (!item.isHeader && item.currency.selected) {
        accum.push({
          chain: item.currency.chain.toLowerCase(),
          currencyAbbreviation:
            item.currency.currencyAbbreviation.toLowerCase(),
          isToken: false,
        });
      }
      return accum;
    }, []);
  }, [allListItems]);

  const contextHandler = (): ContextHandler => {
    switch (context) {
      case 'onboarding':
      case 'createNewKey': {
        return {
          ctaTitle:
            selectedCurrencies?.length > 1
              ? t('AddArgWallets', {walletsLength: selectedCurrencies?.length})
              : t('Add Wallet'),
          onCtaPress: async () => {
            try {
              showOngoingProcess('CREATING_KEY');
              const createdKey = await dispatch(
                startCreateKey(selectedCurrencies),
              );
              dispatch(setHomeCarouselConfig({id: createdKey.id, show: true}));
              navigation.navigate('BackupKey', {context, key: createdKey});
              dispatch(
                Analytics.track('Created Key', {
                  context,
                  coins: selectedCurrencies,
                }),
              );
              hideOngoingProcess();
            } catch (err: any) {
              const errstring =
                err instanceof Error ? err.message : JSON.stringify(err);
              logManager.error(`Error creating key: ${errstring}`);
              hideOngoingProcess();
              await sleep(500);
              showErrorModal(errstring);
            }
          },
          selectedCurrencies,
        };
      }
      case 'addUtxoWallet': {
        return {
          headerTitle: t('Select Currency'),
          selectedCurrencies,
        };
      }
      case 'addWalletMultisig': {
        return {
          headerTitle: t('Select Currency'),
          selectedCurrencies,
        };
      }

      case 'addTSSWalletMultisig': {
        return {
          headerTitle: t('Select Currency'),
          selectedCurrencies,
        };
      }
    }
  };

  const {onCtaPress, ctaTitle, headerTitle} = contextHandler() || {};

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>{headerTitle || t('Select Currencies')}</HeaderTitle>
      ),
      headerTitleAlign: 'center',
      headerRight: () =>
        context === 'onboarding' && (
          <HeaderRightContainer>
            <Button
              testID="skip-button"
              accessibilityLabel="Skip"
              buttonType={'pill'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('TermsOfUse', {context: 'TOUOnly'});
              }}>
              {t('Skip')}
            </Button>
          </HeaderRightContainer>
        ),
    });
  }, [navigation, t, context, headerTitle]);

  const onToggle = (currencyAbbreviation: string, chain?: string) => {
    if (context === 'addWalletMultisig') {
      navigation.navigate('CreateMultisig', {
        currency: currencyAbbreviation.toLowerCase(),
        key,
        context,
      });
      return;
    }

    if (context === 'addTSSWalletMultisig') {
      navigation.navigate('CreateMultisig', {
        currency: currencyAbbreviation.toLowerCase(),
        chain: chain?.toLowerCase()!,
        key,
        context,
      });
      return;
    }

    if (context === 'addUtxoWallet') {
      navigation.navigate('AddWallet', {
        key,
        currencyAbbreviation: currencyAbbreviation.toLowerCase(),
        currencyName: allListItems.find(
          item => item.currency.currencyAbbreviation === currencyAbbreviation,
        )?.currency.currencyName,
      });
      return;
    }

    setAllListItems(previous =>
      previous.map(item => {
        if (item.isHeader) {
          return item;
        }

        const isCurrencyMatch =
          item.currency.currencyAbbreviation === currencyAbbreviation &&
          item.currency.chain === chain;

        if (isCurrencyMatch) {
          item.currency = {
            ...item.currency,
            selected: !item.currency.selected,
          };
        } else if (item.currency.selected) {
          item.currency = {
            ...item.currency,
            selected: false,
          };
        }

        return item;
      }),
    );
  };

  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  const memoizedOnToggle = useCallback(
    (currencyAbbreviation: string, chain?: string) => {
      onToggleRef.current(currencyAbbreviation, chain);
    },
    [],
  );

  const isMultisigContext =
    context === 'addWalletMultisig' || context === 'addTSSWalletMultisig';

  const renderItem: ListRenderItem<CurrencySelectionListItem> = useCallback(
    ({item}) => {
      if (item.isHeader) {
        return <SectionHeader>{item.headerTitle}</SectionHeader>;
      }

      return (
        <CurrencySelectionRow
          key={item.currency.id}
          currency={item.currency}
          onToggle={memoizedOnToggle}
          disableCheckbox={!!key?.hardwareSource}
        />
      );
    },
    [memoizedOnToggle, key?.hardwareSource, isMultisigContext],
  );

  return (
    <CurrencySelectionContainer testID="currency-selection-container">
      {allListItems.length > 0 ? (
        <ListContainer>
          <FlatList<CurrencySelectionListItem>
            contentContainerStyle={{marginTop: isMultisigContext ? 10 : 20}}
            data={allListItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        </ListContainer>
      ) : null}

      {onCtaPress && selectedCurrencies.length > 0 ? (
        <CtaContainer
          style={{
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
            marginTop: 16,
          }}>
          <Button
            testID="on-cta-press-button"
            accessibilityLabel="Add wallet"
            onPress={onCtaPress}
            buttonStyle={'primary'}>
            {ctaTitle || t('Continue')}
          </Button>
        </CtaContainer>
      ) : null}
    </CurrencySelectionContainer>
  );
};

export default CurrencySelection;
