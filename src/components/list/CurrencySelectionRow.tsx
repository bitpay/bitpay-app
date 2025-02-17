import React, {memo, ReactElement, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {ImageRequireSource, View} from 'react-native';
import styled from 'styled-components/native';
import {IS_ANDROID} from '../../constants';
import {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';
import {CurrencySelectionMode} from '../../navigation/wallet/screens/CurrencySelection';
import {
  LightBlack,
  LuckySevens,
  Slate10,
  Slate30,
  SlateDark,
} from '../../styles/colors';
import {
  formatCurrencyAbbreviation,
  getBadgeImg,
} from '../../utils/helper-methods';
import Checkbox from '../checkbox/Checkbox';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import haptic from '../haptic-feedback/haptic';
import NestedArrowIcon from '../nested-arrow/NestedArrow';
import {ScreenGutter} from '../styled/Containers';
import {BaseText, H6, H7} from '../styled/Text';
import {TouchableOpacity} from 'react-native-gesture-handler';

export type CurrencySelectionItem = Pick<
  SupportedCurrencyOption,
  | 'id'
  | 'currencyAbbreviation'
  | 'currencyName'
  | 'img'
  | 'isToken'
  | 'badgeUri'
> & {
  chain: string;
  chainName?: string;
  tokenAddress?: string;
  imgSrc?: ImageRequireSource | undefined;
  selected?: boolean;
  disabled?: boolean;
};

export type CurrencySelectionRowProps = {
  currency: CurrencySelectionItem;
  tokens?: CurrencySelectionItem[];
  filterSelected?: boolean;
  description?: string;
  hideCheckbox?: boolean;
  disableCheckbox?: boolean;
  selectionMode?: CurrencySelectionMode;
  onToggle?: (
    currencyAbbreviation: string,
    chain: string,
    tokenAddress?: string,
  ) => void;
  onViewAllTokensPressed?: (
    currency: CurrencySelectionItem,
    tokens: CurrencySelectionItem[],
  ) => any;
};

export const CurrencySelectionRowContainer = styled.View`
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 12px;
  flex-direction: column;
  margin: 0 ${ScreenGutter} ${ScreenGutter};
  padding: 16px;
`;

const FlexRow = styled(TouchableOpacity)`
  flex-direction: row;
`;

const ChainDescription = styled(H7)`
  color: ${({theme}) => (theme.dark ? Slate10 : LightBlack)};
`;

const CurrencyColumn = styled.View`
  justify-content: center;
  margin-right: 8px;
`;

const CurrencyTitleColumn = styled(CurrencyColumn)`
  flex: 1 1 auto;
`;

const CurrencyTitle = styled(H7).attrs(() => ({
  medium: true,
}))`
  margin: 0;
  padding: 0;
`;

const CurrencySubTitle = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? LuckySevens : SlateDark)};
  font-size: 12px;
`;

export const TokensHeading = styled(H7).attrs(() => ({
  medium: true,
}))`
  color: ${({theme}) => (theme.dark ? Slate10 : LuckySevens)};
  font-weight: 500;
  margin: 16px 0;
`;

const TokensFooter = styled.View`
  align-items: center;
`;

const ViewAllLink = styled(H6)`
  color: ${({theme}) => theme.colors.link};
  text-align: center;
`;

interface FeeCurrencySelectionRowProps {
  currency: CurrencySelectionItem;
  hideCheckbox?: boolean;
  disableCheckbox?: boolean;
  selectionMode?: CurrencySelectionMode;
  onToggle?: (currencyAbbreviation: string, chain: string) => any;
}

export const FeeCurrencySelectionRow: React.FC<FeeCurrencySelectionRowProps> =
  memo(props => {
    const {onToggle, currency, hideCheckbox, selectionMode, disableCheckbox} =
      props;
    const {
      currencyAbbreviation,
      currencyName,
      img,
      imgSrc,
      badgeUri,
      selected,
      disabled,
      chain,
    } = currency;

    return (
      <FlexRow
        accessibilityLabel="chain-selection-row"
        onPress={() =>
          !disabled && !disableCheckbox
            ? onToggle?.(currencyAbbreviation, chain)
            : null
        }>
        <CurrencyColumn>
          <CurrencyImage img={img} imgSrc={imgSrc} badgeUri={badgeUri} />
        </CurrencyColumn>

        <CurrencyTitleColumn style={{flexGrow: 1}}>
          <CurrencyTitle>{currencyName}</CurrencyTitle>

          <CurrencySubTitle>
            {formatCurrencyAbbreviation(currencyAbbreviation)}
          </CurrencySubTitle>
        </CurrencyTitleColumn>

        {!hideCheckbox && !disableCheckbox && (
          <CurrencyColumn accessibilityLabel="chain-selection-row-checkbox">
            <Checkbox
              checked={!!selected}
              radio={selectionMode === 'single'}
              disabled={!!disabled}
              onPress={() => onToggle?.(currencyAbbreviation, chain)}
            />
          </CurrencyColumn>
        )}
      </FlexRow>
    );
  });

interface TokenSelectionRowProps {
  token: CurrencySelectionItem;
  hideCheckbox?: boolean;
  selectionMode?: CurrencySelectionMode;
  onToggle?: (
    currencyAbbreviation: string,
    chain: string,
    tokenAddress: string,
  ) => any;
  hideArrow?: boolean;
  badgeUri?: string | ((props?: any) => ReactElement);
}

export const TokenSelectionRow: React.FC<TokenSelectionRowProps> = memo(
  props => {
    const {
      token,
      hideCheckbox,
      selectionMode,
      onToggle,
      hideArrow,
      badgeUri: _badgeUri,
    } = props;
    const badgeUri =
      _badgeUri || getBadgeImg(token.currencyAbbreviation, token.chain);
    const _currencyAbbreviation = formatCurrencyAbbreviation(
      token.currencyAbbreviation,
    );

    return (
      <FlexRow
        accessibilityLabel="token-selection-row"
        style={{marginBottom: 24}}
        onPress={() =>
          onToggle?.(
            token.currencyAbbreviation,
            token.chain,
            token.tokenAddress!,
          )
        }>
        {!hideArrow ? (
          <CurrencyColumn style={{marginRight: 16}}>
            <NestedArrowIcon />
          </CurrencyColumn>
        ) : null}

        <CurrencyColumn>
          <CurrencyImage
            img={token.img}
            imgSrc={token.imgSrc}
            badgeUri={badgeUri}
          />
        </CurrencyColumn>

        <CurrencyTitleColumn style={{flexGrow: 1}}>
          <CurrencyTitle>{token.currencyName}</CurrencyTitle>

          <CurrencySubTitle style={{flexShrink: 1, flexGrow: 1}}>
            {_currencyAbbreviation}
          </CurrencySubTitle>
        </CurrencyTitleColumn>

        {!hideCheckbox ? (
          <CurrencyColumn accessibilityLabel="token-selection-row-checkbox">
            <Checkbox
              checked={!!token.selected}
              radio={selectionMode === 'single'}
              disabled={!!token.disabled}
              onPress={() =>
                onToggle?.(
                  token.currencyAbbreviation,
                  token.chain,
                  token.tokenAddress!,
                )
              }
            />
          </CurrencyColumn>
        ) : null}
      </FlexRow>
    );
  },
);

export const DescriptionRow: React.FC = ({children}) => {
  return (
    <View style={{marginTop: 16}}>
      <ChainDescription>{children}</ChainDescription>
    </View>
  );
};

const CurrencySelectionRow: React.FC<CurrencySelectionRowProps> = ({
  currency,
  description,
  tokens,
  filterSelected,
  hideCheckbox,
  disableCheckbox,
  selectionMode,
  onToggle,
  onViewAllTokensPressed,
}) => {
  const {t} = useTranslation();
  const {currencyName, chainName} = currency;
  const onPress = useCallback(
    (
      currencyAbbreviation: string,
      chain: string,
      tokenAddress?: string,
    ): void => {
      haptic(IS_ANDROID ? 'keyboardPress' : 'impactLight');
      onToggle?.(currencyAbbreviation, chain, tokenAddress);
    },
    [onToggle],
  );

  return (
    <CurrencySelectionRowContainer accessibilityLabel="currency-selection-container">
      <FeeCurrencySelectionRow
        currency={currency}
        onToggle={() => onPress(currency.currencyAbbreviation, currency.chain)}
        hideCheckbox={hideCheckbox}
        selectionMode={selectionMode}
        disableCheckbox={disableCheckbox}
      />

      {description ? <DescriptionRow>{description}</DescriptionRow> : null}

      {tokens?.length ? (
        <>
          {!filterSelected ? (
            <TokensHeading>
              {t('Popular {{currency}} Tokens', {
                currency: chainName ? chainName : currencyName,
              })}
            </TokensHeading>
          ) : (
            <TokensHeading>
              {t('{{currency}} Tokens', {
                currency: chainName ? chainName : currencyName,
              })}
            </TokensHeading>
          )}

          {tokens.map(token => (
            <TokenSelectionRow
              key={token.id}
              token={token}
              onToggle={() => {
                onPress(
                  token.currencyAbbreviation,
                  token.chain,
                  token.tokenAddress,
                );
              }}
              hideCheckbox={hideCheckbox}
              selectionMode={selectionMode}
            />
          ))}

          {!filterSelected ? (
            <TokensFooter>
              <ViewAllLink
                accessibilityLabel="view-all-tokens-button"
                onPress={() => {
                  onViewAllTokensPressed?.(currency, tokens);
                }}>
                {t('View all {{currency}} tokens', {currency: t(chainName)})}
              </ViewAllLink>
            </TokensFooter>
          ) : null}
        </>
      ) : null}
    </CurrencySelectionRowContainer>
  );
};

export default memo(CurrencySelectionRow);
