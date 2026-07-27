import React, {useCallback, useMemo, memo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {DeviceEventEmitter, Platform, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTheme} from '../../../contexts';
import {useBottomSheetScrollableCreator} from '@gorhom/bottom-sheet';
import {
  FlashList,
  type FlashListProps,
  type ListRenderItemInfo,
} from '@shopify/flash-list';
import {useDispatch, useSelector} from 'react-redux';
import {BaseText, H4, TextAlign} from '../../styled/Text';
import {AppActions} from '../../../store/app';
import {RootState} from '../../../store';
import {
  Black,
  Action,
  SlateDark,
  White,
  Slate,
  LightBlue,
} from '../../../styles/colors';
import haptic from '../../haptic-feedback/haptic';

import {
  setDefaultChainFilterOption,
  setLocalDefaultChainFilterOption,
} from '../../../store/app/app.actions';
import {
  ActiveOpacity,
  HEIGHT,
  Hr,
  NoResultsContainer,
  NoResultsDescription,
  NoResultsImgContainer,
  SearchRoundContainer,
  SearchRoundInput,
} from '../../styled/Containers';
import {WalletSelectMenuHeaderContainer} from '../../../navigation/wallet/screens/GlobalSelect';
import SearchSvg from '../../../../assets/img/search.svg';
import {
  BitpaySupportedCoins,
  SUPPORTED_CURRENCIES_CHAINS,
  SupportedChains,
} from '../../../constants/currencies';
import {useAppSelector} from '../../../utils/hooks';
import {SupportedChainsOptions} from '../../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../../currency-image/CurrencyImage';
import GhostSvg from '../../../../assets/img/ghost-cheeky.svg';
import AllNetworkSvg from '../../../../assets/img/all-networks.svg';
import debounce from 'lodash.debounce';
import {SearchIconContainer} from '../../chain-search/ChainSearch';
import {sleep} from '../../../utils/helper-methods';
import {DeviceEmitterEvents} from '../../../constants/device-emitter-events';
import SheetModal from '../base/sheet/SheetModal';

export const ignoreGlobalListContextList = [
  'sell',
  'swapFrom',
  'swapTo',
  'buy',
  'walletconnect',
  'createNewKey',
  'addUtxoWallet',
  'addEVMWallet',
];
export interface ChainSelectorConfig {
  onBackdropDismiss?: () => void;
  context?: string;
  chainsOptions?: string[];
  customChains?: SupportedChains[];
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  listHeader: {
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    padding: 16,
  },
  networkChainContainer: {
    marginLeft: 16,
    marginRight: 16,
  },
  networkChainContainerSelected: {
    borderWidth: 1,
    borderRadius: 12,
  },
  networkName: {
    fontWeight: '500',
    fontSize: 16,
  },
  networkRowContainer: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: 16,
  },
  imageContainer: {
    marginRight: 3,
  },
  chainSelectorContainer: {
    flex: 1,
  },
});

interface HideableViewProps {
  show: boolean;
}

const HideableView: React.FC<
  HideableViewProps & React.PropsWithChildren<{}>
> = ({show, children}) => (
  <View style={{display: show ? 'flex' : 'none', flex: 1}}>{children}</View>
);

const ListHeader: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.listHeader,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const NetworkChainContainer: React.FC<
  {selected?: boolean} & React.ComponentProps<typeof TouchableOpacity>
> = ({selected, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.networkChainContainer,
        selected
          ? [
              {backgroundColor: theme.dark ? '#2240C440' : LightBlue},
              styles.networkChainContainerSelected,
              {borderColor: Action},
            ]
          : null,
        style,
      ]}
      {...rest}
    />
  );
};

export const NetworkName: React.FC<
  {selected?: boolean} & React.ComponentProps<typeof BaseText>
> = ({selected: _selected, style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.networkName, {color: theme.dark ? White : Black}, style]}
      {...rest}
    />
  );
};

const contentContainerStyle = {paddingBottom: 80};
const searchIconSize = {height: 16, width: 16};
const ghostSvgStyle = {marginTop: 20};
const allNetworkSvgStyle = {width: 20, height: 20};

type ChainSelectorFlashListProps<T> = FlashListProps<T> & {
  estimatedItemSize?: number;
};

type ChainSelectorListItem = string | {title: string};

const isSectionHeader = (
  item: ChainSelectorListItem,
): item is {title: string} => typeof item !== 'string';

export const ChainSelectorFlashList = <T,>(
  props: ChainSelectorFlashListProps<T>,
) => {
  const BottomSheetScrollable = useBottomSheetScrollableCreator();

  return <FlashList {...props} renderScrollComponent={BottomSheetScrollable} />;
};

const ChainSelectorModalContent = () => {
  const dispatch = useDispatch();
  const {t} = useTranslation();
  const theme = useTheme();
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showChainSelectorModal,
  );
  const config = useSelector(
    ({APP}: RootState) => APP.chainSelectorModalConfig,
  );
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as string[]);
  const recentSelectedChainFilterOption = useAppSelector(
    ({APP}) => APP.recentSelectedChainFilterOption,
  );
  const {onBackdropDismiss, context, chainsOptions, customChains} =
    config || {};

  const selectedChainFilterOption = useAppSelector(({APP}) =>
    context && ignoreGlobalListContextList.includes(context)
      ? APP.selectedLocalChainFilterOption
      : APP.selectedChainFilterOption,
  );

  const sectionHeaders = useMemo(
    () => ({
      all: t('All Networks'),
      recentlySelected: t('Recently Selected'),
    }),
    [t],
  );

  const chainList = useMemo(() => {
    // Function to filter and sort chains based on recent selection
    let _SUPPORTED_CURRENCIES_CHAINS =
      chainsOptions && chainsOptions.length > 0
        ? SUPPORTED_CURRENCIES_CHAINS.filter(chain =>
            chainsOptions.includes(chain),
          )
        : SUPPORTED_CURRENCIES_CHAINS;
    let _recentSelectedChainFilterOption =
      chainsOptions && chainsOptions.length > 0
        ? recentSelectedChainFilterOption.filter((chain: string) =>
            chainsOptions.includes(chain),
          )
        : recentSelectedChainFilterOption;

    const getFilteredChains = () => {
      if (_recentSelectedChainFilterOption.length) {
        return _SUPPORTED_CURRENCIES_CHAINS.filter(
          chain => !_recentSelectedChainFilterOption.includes(chain),
        );
      }
      // Exclude currently selected chain and move it to the front if it exists
      const filteredChains = _SUPPORTED_CURRENCIES_CHAINS.filter(
        chain => chain !== selectedChainFilterOption,
      );
      if (selectedChainFilterOption) {
        return [selectedChainFilterOption, ...filteredChains];
      }
      return filteredChains;
    };
    const hasCustomChains = customChains && customChains?.length > 0;
    const allNetworkTitle = hasCustomChains ? undefined : sectionHeaders.all;
    const chains = hasCustomChains ? customChains : getFilteredChains();
    const list = [
      {
        title: sectionHeaders.all,
        data: [allNetworkTitle, ...chains].filter(Boolean),
      },
    ];
    if (_recentSelectedChainFilterOption.length && !hasCustomChains) {
      list.unshift({
        title: sectionHeaders.recentlySelected,
        data: _recentSelectedChainFilterOption,
      });
    }
    const flattenedList = list.reduce(
      (fullList, section) => [
        ...fullList,
        {title: section.title},
        ...section.data,
      ],
      [] as any[],
    );
    return flattenedList as ChainSelectorListItem[];
  }, [
    customChains,
    sectionHeaders.all,
    sectionHeaders.recentlySelected,
    recentSelectedChainFilterOption,
    selectedChainFilterOption,
    chainsOptions,
  ]);

  const handleChainSelect = useCallback(
    async (supportedChain: any) => {
      dispatch(AppActions.dismissChainSelectorModal());
      await sleep(1000);
      dispatch(AppActions.clearChainSelectorModalOptions());
      const option = supportedChain?.chain as SupportedChains | undefined;

      // Check if the context is one of 'sell', 'swapFrom', 'swapTo', 'buy', 'walletconnect'
      if (ignoreGlobalListContextList.includes(context as string)) {
        dispatch(setLocalDefaultChainFilterOption(option));
      } else {
        dispatch(setDefaultChainFilterOption(option));
      }
      if (context === 'accounthistoryview') {
        DeviceEventEmitter.emit(
          DeviceEmitterEvents.WALLET_LOAD_HISTORY,
          option || '',
        );
      }
      setSearchVal('');
    },
    [dispatch, context],
  );

  const renderChainItem = useCallback(
    ({item, index}: {item: string; index: number}) => {
      const supportedChain = SupportedChainsOptions.find(
        ({chain}) => chain === item,
      );
      const badgeLabel = supportedChain?.chainName || item;
      const selected = selectedChainFilterOption === item;
      const isLastItem = index === chainList.length - 1;

      return (
        <>
          <NetworkChainContainer
            activeOpacity={ActiveOpacity}
            selected={selected}
            onPress={() => handleChainSelect(supportedChain)}>
            <View style={styles.networkRowContainer}>
              <View style={styles.imageContainer}>
                {supportedChain?.img ? (
                  <CurrencyImage img={supportedChain?.img} size={32} />
                ) : (
                  <AllNetworkSvg style={allNetworkSvgStyle} />
                )}
              </View>
              <NetworkName selected={selected}>{badgeLabel}</NetworkName>
            </View>
          </NetworkChainContainer>
          {!selected && !isLastItem ? <Hr /> : null}
        </>
      );
    },
    [selectedChainFilterOption, chainList.length, handleChainSelect],
  );

  const updateSearchResults = useMemo(
    () =>
      debounce((text: string) => {
        setSearchVal(text);
        const normalizedText = text.replace(/\s+/g, '').toLowerCase();
        const results = Object.values(BitpaySupportedCoins)
          .map(({name, chain}) => {
            const normalizedCurrencyAbbreviation = name
              .replace(/\s+/g, '')
              .toLowerCase();
            const normalizedCurrencyName = chain
              .replace(/\s+/g, '')
              .toLowerCase();
            return normalizedCurrencyAbbreviation.includes(normalizedText) ||
              normalizedCurrencyName.includes(normalizedText)
              ? chain
              : null;
          })
          .filter((chain): chain is string => chain !== null);
        setSearchResults(results);
      }, 300),
    [],
  );

  const handleBackdropPress = useCallback(async () => {
    dispatch(AppActions.dismissChainSelectorModal());
    await sleep(1000);
    dispatch(AppActions.clearChainSelectorModalOptions());
    setSearchVal('');
    haptic('impactLight');
    if (onBackdropDismiss) {
      onBackdropDismiss();
    }
  }, [dispatch, onBackdropDismiss]);

  const modalHeight = useMemo(() => Math.min(600, HEIGHT - 150), []);
  const modalHeightPercentage = useMemo(
    () => modalHeight / HEIGHT,
    [modalHeight],
  );

  const snapPoints = useMemo(
    () => [`${Math.floor(modalHeightPercentage * 100)}%`],
    [modalHeightPercentage],
  );

  const keyExtractor = useCallback(
    (_item: ChainSelectorListItem, index: number) => index.toString(),
    [],
  );

  const getItemType = useCallback(
    (item: ChainSelectorListItem) =>
      isSectionHeader(item) ? 'sectionHeader' : 'row',
    [],
  );

  const renderItem = useCallback(
    ({item, index}: ListRenderItemInfo<ChainSelectorListItem>) => {
      if (isSectionHeader(item)) {
        return <ListHeader>{item.title}</ListHeader>;
      } else {
        return renderChainItem({item, index});
      }
    },
    [renderChainItem],
  );

  const borderRadius = useMemo(() => (Platform.OS === 'ios' ? 12 : 0), []);

  return (
    <SheetModal
      modalLibrary="bottom-sheet"
      height={Math.floor(modalHeightPercentage * HEIGHT)}
      snapPoints={snapPoints}
      stackBehavior="push"
      isVisible={isVisible}
      borderRadius={borderRadius}
      backdropOpacity={0.4}
      onBackdropPress={handleBackdropPress}>
      <View style={styles.chainSelectorContainer}>
        <WalletSelectMenuHeaderContainer>
          <TextAlign align={'left'}>
            <H4>{t('Select Network')}</H4>
          </TextAlign>
        </WalletSelectMenuHeaderContainer>
        <View style={styles.header}>
          <SearchRoundContainer>
            <SearchIconContainer>
              <SearchSvg {...searchIconSize} />
            </SearchIconContainer>
            <SearchRoundInput
              placeholder={'Search Networks'}
              placeholderTextColor={theme.dark ? Slate : Slate}
              onChangeText={updateSearchResults}
            />
          </SearchRoundContainer>
        </View>
        <HideableView show={!!searchVal}>
          {searchResults.length ? (
            <ChainSelectorFlashList
              contentContainerStyle={contentContainerStyle}
              data={searchResults}
              estimatedItemSize={65}
              renderItem={renderChainItem}
              keyExtractor={keyExtractor}
            />
          ) : (
            <NoResultsContainer>
              <NoResultsImgContainer>
                <GhostSvg style={ghostSvgStyle} />
              </NoResultsImgContainer>
              <NoResultsDescription>
                {t("We couldn't find a match for ")}
                <BaseText style={{fontWeight: 'bold'}}>{searchVal}</BaseText>.
              </NoResultsDescription>
            </NoResultsContainer>
          )}
        </HideableView>

        <HideableView show={!searchVal}>
          <ChainSelectorFlashList
            contentContainerStyle={contentContainerStyle}
            data={chainList}
            renderItem={renderItem}
            estimatedItemSize={65}
            keyExtractor={keyExtractor}
            getItemType={getItemType}
          />
        </HideableView>
      </View>
    </SheetModal>
  );
};

const ChainSelectorModal = memo(() => {
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showChainSelectorModal,
  );

  return isVisible ? <ChainSelectorModalContent /> : null;
});

export default ChainSelectorModal;
