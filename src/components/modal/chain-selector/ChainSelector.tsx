import React, {useCallback, useMemo, memo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {DeviceEventEmitter, Platform} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTheme} from '@react-navigation/native';
import {BottomSheetFlashList as FlashList} from '@gorhom/bottom-sheet';
import styled, {css} from 'styled-components/native';
import {useDispatch, useSelector} from 'react-redux';
import {BaseText, H4, TextAlign} from '../../styled/Text';
import {AppActions} from '../../../store/app';
import {RootState} from '../../../store';
import {Black, Action, SlateDark, White, Slate} from '../../../styles/colors';
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

const Header = styled.View`
  padding: 10px 16px;
`;

interface HideableViewProps {
  show: boolean;
}

const HideableView = styled.View<HideableViewProps>`
  display: ${({show}) => (show ? 'flex' : 'none')};
  flex: 1;
`;

const ListHeader = styled(BaseText)`
  font-weight: 500;
  font-size: 14px;
  line-height: 20px;
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
  padding: 16px;
`;

const NetworkChainContainer = styled(TouchableOpacity)<{selected?: boolean}>`
  margin-left: 16px;
  margin-right: 16px;
  ${({selected}) =>
    selected &&
    css`
      background: ${({theme: {dark}}) => (dark ? '#2240C440' : '#ECEFFD')};
      border-color: ${({theme: {dark}}) => (dark ? Action : Action)};
      border-width: 1px;
      border-radius: 12px;
    `};
`;

export const NetworkName = styled(BaseText)<{selected?: boolean}>`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-weight: 500;
  font-size: 16px;
`;

const NetworkRowContainer = styled.View`
  flex-direction: row;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 16px;
`;

const ImageContainer = styled.View`
  margin-right: 3px;
`;

const ChainSelectorContainer = styled.View`
  flex: 1;
`;

const ChainSelectorModal = () => {
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
            onPress={async () => {
              dispatch(AppActions.dismissChainSelectorModal());
              await sleep(1000);
              dispatch(AppActions.clearChainSelectorModalOptions());
              const option = supportedChain?.chain as
                | SupportedChains
                | undefined;

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
            }}>
            <NetworkRowContainer>
              <ImageContainer>
                {supportedChain?.img ? (
                  <CurrencyImage img={supportedChain?.img} size={32} />
                ) : (
                  <AllNetworkSvg style={{width: 20, height: 20}} />
                )}
              </ImageContainer>
              <NetworkName selected={selected}>{badgeLabel}</NetworkName>
            </NetworkRowContainer>
          </NetworkChainContainer>
          {!selected && !isLastItem ? <Hr /> : null}
        </>
      );
    },
    [dispatch, context, customChains, selectedChainFilterOption],
  );

  const sectionHeaders = {
    all: t('All Networks'),
    recentlySelected: t('Recently Selected'),
  };

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
        ? recentSelectedChainFilterOption.filter(chain =>
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
    return flattenedList;
  }, [
    customChains,
    sectionHeaders.all,
    sectionHeaders.recentlySelected,
    recentSelectedChainFilterOption,
    selectedChainFilterOption,
    context,
    chainsOptions,
  ]);

  const updateSearchResults = debounce((text: string) => {
    setSearchVal(text);
    const normalizedText = text.replace(/\s+/g, '').toLowerCase();
    const results = Object.values(BitpaySupportedCoins)
      .map(({name, chain}) => {
        const normalizedCurrencyAbbreviation = name
          .replace(/\s+/g, '')
          .toLowerCase();
        const normalizedCurrencyName = chain.replace(/\s+/g, '').toLowerCase();
        return normalizedCurrencyAbbreviation.includes(normalizedText) ||
          normalizedCurrencyName.includes(normalizedText)
          ? chain
          : null;
      })
      .filter((chain): chain is string => chain !== null);
    setSearchResults(results);
  }, 300);
  const modalHeight = Math.min(600, HEIGHT - 150);
  const modalHeightPercentage = modalHeight / HEIGHT;
  return (
    <SheetModal
      modalLibrary="bottom-sheet"
      height={Math.floor(modalHeightPercentage * HEIGHT)}
      snapPoints={[`${Math.floor(modalHeightPercentage * 100)}%`]}
      stackBehavior="push"
      isVisible={isVisible}
      borderRadius={Platform.OS === 'ios' ? 12 : 0}
      backdropOpacity={0.4}
      onBackdropPress={async () => {
        dispatch(AppActions.dismissChainSelectorModal());
        await sleep(1000);
        dispatch(AppActions.clearChainSelectorModalOptions());
        setSearchVal('');
        haptic('impactLight');
        if (onBackdropDismiss) {
          onBackdropDismiss();
        }
      }}>
      <ChainSelectorContainer>
        <WalletSelectMenuHeaderContainer>
          <TextAlign align={'left'}>
            <H4>{t('Select Network')}</H4>
          </TextAlign>
        </WalletSelectMenuHeaderContainer>
        <Header>
          <SearchRoundContainer>
            <SearchIconContainer>
              <SearchSvg height={16} width={16} />
            </SearchIconContainer>
            <SearchRoundInput
              placeholder={'Search Networks'}
              placeholderTextColor={theme.dark ? Slate : Slate}
              onChangeText={(text: string) => {
                updateSearchResults(text);
              }}
            />
          </SearchRoundContainer>
        </Header>
        <HideableView show={!!searchVal}>
          {searchResults.length ? (
            <FlashList
              contentContainerStyle={{paddingBottom: 80}}
              data={searchResults}
              estimatedItemSize={65}
              // @ts-ignore
              renderItem={renderChainItem}
              keyExtractor={(item, index) => index.toString()}
            />
          ) : (
            <NoResultsContainer>
              <NoResultsImgContainer>
                <GhostSvg style={{marginTop: 20}} />
              </NoResultsImgContainer>
              <NoResultsDescription>
                {t("We couldn't find a match for ")}
                <BaseText style={{fontWeight: 'bold'}}>{searchVal}</BaseText>.
              </NoResultsDescription>
            </NoResultsContainer>
          )}
        </HideableView>

        <HideableView show={!searchVal}>
          <FlashList
            contentContainerStyle={{paddingBottom: 80}}
            data={chainList}
            renderItem={({item, index}) => {
              if (item.title) {
                return <ListHeader>{item.title}</ListHeader>;
              } else {
                return renderChainItem({item, index});
              }
            }}
            estimatedItemSize={65}
            keyExtractor={(item, index) => index.toString()}
            getItemType={item => (item.title ? 'sectionHeader' : 'row')}
          />
        </HideableView>
      </ChainSelectorContainer>
    </SheetModal>
  );
};

export default memo(ChainSelectorModal);
