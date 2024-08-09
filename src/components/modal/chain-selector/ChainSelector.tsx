import React, {useCallback, useMemo, useState} from 'react';
import SheetModal from '../base/sheet/SheetModal';
import {BaseText, H4, TextAlign} from '../../styled/Text';
import styled, {css} from 'styled-components/native';
import {useDispatch, useSelector} from 'react-redux';
import {AppActions} from '../../../store/app';
import {RootState} from '../../../store';
import {
  Black,
  Action,
  SlateDark,
  White,
  Slate,
  LightBlack,
} from '../../../styles/colors';
import haptic from '../../haptic-feedback/haptic';
import {FlatList, Platform, SectionList, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {
  setDefaultChainFilterOption,
  setLocalDefaultChainFilterOption,
  setSelectedNetworkForDeposit,
} from '../../../store/app/app.actions';
import {
  ActiveOpacity,
  Hr,
  NoResultsContainer,
  NoResultsDescription,
  NoResultsImgContainer,
  SearchRoundContainer,
  SearchRoundInput,
} from '../../styled/Containers';
import {WalletSelectMenuHeaderContainer} from '../../../navigation/wallet/screens/GlobalSelect';
import {useTranslation} from 'react-i18next';
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

export const ignoreGlobalListContextList = [
  'sell',
  'swapFrom',
  'swapTo',
  'buy',
  'walletconnect',
  'createNewKey',
  'addWallet',
];
export interface ChainSelectorConfig {
  onBackdropDismiss?: () => void;
  context?: string;
  customChains?: SupportedChains[];
  selectingNetworkForDeposit?: boolean;
}

const Header = styled.View`
  padding: 10px 16px;
`;

interface HideableViewProps {
  show: boolean;
}

const HideableView = styled.View<HideableViewProps>`
  display: ${({show}) => (show ? 'flex' : 'none')};
`;

const ListHeader = styled(BaseText)`
  font-weight: 500;
  font-size: 14px;
  line-height: 20px;
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
  padding: 8px 16px;
`;

const NetworkChainContainer = styled.TouchableOpacity<{selected?: boolean}>`
  margin-left: 16px;
  margin-right: 16px;
  ${({selected}) =>
    selected &&
    css`
      background: ${({theme: {dark}}) => (dark ? '#2240C440' : '#ECEFFD')};
      border-color: ${({theme: {dark}}) => (dark ? '#2240C4' : Action)};
      border-width: 1px;
      border-radius: 12px;
    `};
`;

const NetworkName = styled(BaseText)<{selected?: boolean}>`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-weight: 500;
  font-size: 16px;
`;

const NetworkChainLabelContainer = styled.View<{selected?: boolean}>`
  align-items: center;
  justify-content: center;
`;

const NetworkChainLabel = styled(BaseText)<{selected?: boolean}>`
  color: ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
  font-size: 12px;
  line-height: 22px;
  font-weight: 400;
`;

const RowContainer = styled.View`
  flex-direction: row;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 16px;
`;

const ImageContainer = styled.View`
  margin-right: 3px;
`;

const KeyBoardAvoidingViewWrapper = styled.KeyboardAvoidingView`
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
`;

const ChainSelector = ({onModalHide}: {onModalHide?: () => void}) => {
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
  const {onBackdropDismiss, context, customChains, selectingNetworkForDeposit} =
    config || {};

  const selectedChainFilterOption = useAppSelector(({APP}) =>
    context && ignoreGlobalListContextList.includes(context)
      ? APP.selectedLocalChainFilterOption
      : APP.selectedChainFilterOption,
  );

  const renderChainItem = useCallback(
    ({item, index, section}: {item: string; index: number; section: any}) => {
      const supportedChain = SupportedChainsOptions.find(
        ({chain}) => chain === item,
      );
      const badgeLabel = supportedChain?.chainName || item;
      const selected = selectedChainFilterOption === item;
      let isLastItem = false;
      if (section?.data?.length) {
        isLastItem = index === section.data.length - 1;
      }
      return (
        <>
          <NetworkChainContainer
            activeOpacity={ActiveOpacity}
            selected={selected}
            onPress={() => {
              dispatch(AppActions.dismissChainSelectorModal());
              const option = supportedChain?.chain as
                | SupportedChains
                | undefined;

              // Check if the context is one of 'sell', 'swapFrom', 'swapTo', 'buy', 'walletconnect'
              if (selectingNetworkForDeposit) {
                dispatch(setSelectedNetworkForDeposit(option));
              } else if (
                ignoreGlobalListContextList.includes(context as string)
              ) {
                dispatch(setLocalDefaultChainFilterOption(option));
              } else {
                dispatch(setDefaultChainFilterOption(option));
              }
              setSearchVal('');
            }}
            key={index.toString()}>
            <RowContainer>
              <ImageContainer>
                {supportedChain?.img ? (
                  <CurrencyImage img={supportedChain?.img} size={32} />
                ) : (
                  <AllNetworkSvg style={{width: 20, height: 20}} />
                )}
              </ImageContainer>
              <NetworkName selected={selected}>{badgeLabel}</NetworkName>
            </RowContainer>
          </NetworkChainContainer>
          {!selected && !isLastItem ? <Hr /> : null}
        </>
      );
    },
    [dispatch, context, customChains, selectedChainFilterOption],
  );

  const chainList = useMemo(() => {
    // Function to filter and sort chains based on recent selection
    const getFilteredChains = () => {
      if (recentSelectedChainFilterOption.length) {
        return SUPPORTED_CURRENCIES_CHAINS.filter(
          chain => !recentSelectedChainFilterOption.includes(chain),
        );
      }
      // Exclude currently selected chain and move it to the front if it exists
      const filteredChains = SUPPORTED_CURRENCIES_CHAINS.filter(
        chain => chain !== selectedChainFilterOption,
      );
      if (selectedChainFilterOption) {
        return [selectedChainFilterOption, ...filteredChains];
      }
      return filteredChains;
    };
    const hasCustomChains = customChains && customChains?.length > 0;
    const allNetworkTitle = hasCustomChains ? undefined : t('All Networks');
    const chains = hasCustomChains ? customChains : getFilteredChains();
    const list = [
      {
        title: t('All Networks'),
        data: [allNetworkTitle, ...chains].filter(Boolean),
      },
    ];
    if (recentSelectedChainFilterOption.length && !hasCustomChains) {
      list.unshift({
        title: t('Recently Selected'),
        data: recentSelectedChainFilterOption,
      });
    }
    return list;
  }, [
    selectedChainFilterOption,
    customChains,
    context,
    recentSelectedChainFilterOption,
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

  return (
    <SheetModal
      isVisible={isVisible}
      onModalHide={onModalHide}
      onBackdropPress={() => {
        setSearchVal('');
        dispatch(AppActions.dismissChainSelectorModal());
        haptic('impactLight');
        if (onBackdropDismiss) {
          onBackdropDismiss();
        }
      }}>
      <KeyBoardAvoidingViewWrapper
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{maxHeight: '75%'}}>
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
              <FlatList
                contentContainerStyle={{paddingBottom: 50}}
                data={searchResults}
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
            <SectionList
              contentContainerStyle={{paddingBottom: 50}}
              sections={chainList}
              renderItem={renderChainItem}
              keyExtractor={(item, index) => index.toString()}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({section: {title}}) => (
                <ListHeader>{title}</ListHeader>
              )}
              renderSectionFooter={() => <View style={{marginBottom: 30}} />}
            />
          </HideableView>
        </View>
      </KeyBoardAvoidingViewWrapper>
    </SheetModal>
  );
};

export default ChainSelector;
