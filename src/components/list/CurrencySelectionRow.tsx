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
import {getBadgeImg} from '../../utils/helper-methods';
import Checkbox from '../checkbox/Checkbox';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import haptic from '../haptic-feedback/haptic';
import NestedArrowIcon from '../nested-arrow/NestedArrow';
import {ScreenGutter} from '../styled/Containers';
import {BaseText, H6, H7} from '../styled/Text';

export type CurrencySelectionItem = Pick<
  SupportedCurrencyOption,
  'id' | 'currencyAbbreviation' | 'currencyName' | 'img' | 'isToken'
> & {
  chain: string;
  imgSrc?: ImageRequireSource | undefined;
  selected?: boolean;
  disabled?: boolean;
};

export type CurrencySelectionRowProps = {
  currency: CurrencySelectionItem;
  tokens?: CurrencySelectionItem[];
  description?: string;
  hideCheckbox?: boolean;
  selectionMode?: CurrencySelectionMode;
  onToggle?: (currencyAbbreviation: string, chain: string) => void;
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

const FlexRow = styled.TouchableOpacity`
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

interface ChainSelectionRowProps {
  currency: CurrencySelectionItem;
  hideCheckbox?: boolean;
  selectionMode?: CurrencySelectionMode;
  onToggle?: (id: string) => any;
}

export const ChainSelectionRow: React.VFC<ChainSelectionRowProps> = memo(
  props => {
    const {onToggle, currency, hideCheckbox, selectionMode} = props;
    const {
      currencyAbbreviation,
      currencyName,
      img,
      imgSrc,
      selected,
      disabled,
    } = currency;

    return (
      <FlexRow onPress={() => onToggle?.(currencyAbbreviation)}>
        <CurrencyColumn>
          <CurrencyImage img={img} imgSrc={imgSrc} />
        </CurrencyColumn>

        <CurrencyTitleColumn style={{flexGrow: 1}}>
          <CurrencyTitle>{currencyName}</CurrencyTitle>

          <CurrencySubTitle>
            {currencyAbbreviation.toUpperCase()}
          </CurrencySubTitle>
        </CurrencyTitleColumn>

        {!hideCheckbox && (
          <CurrencyColumn>
            <Checkbox
              checked={!!selected}
              radio={selectionMode === 'single'}
              disabled={!!disabled}
              onPress={() => onToggle?.(currencyAbbreviation)}
            />
          </CurrencyColumn>
        )}
      </FlexRow>
    );
  },
);

interface TokenSelectionRowProps {
  token: CurrencySelectionItem;
  hideCheckbox?: boolean;
  selectionMode?: CurrencySelectionMode;
  onToggle?: (currencyAbbreviation: string, chain: string) => any;
  hideArrow?: boolean;
  badgeUri?: string | ((props?: any) => ReactElement);
}

export const TokenSelectionRow: React.VFC<TokenSelectionRowProps> = memo(
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

    return (
      <FlexRow
        style={{marginBottom: 24}}
        onPress={() => onToggle?.(token.currencyAbbreviation, token.chain)}>
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
            {token.currencyAbbreviation.toUpperCase()}
          </CurrencySubTitle>
        </CurrencyTitleColumn>

        {!hideCheckbox ? (
          <CurrencyColumn>
            <Checkbox
              checked={!!token.selected}
              radio={selectionMode === 'single'}
              disabled={!!token.disabled}
              onPress={() =>
                onToggle?.(token.currencyAbbreviation, token.chain)
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

const CurrencySelectionRow: React.VFC<CurrencySelectionRowProps> = ({
  currency,
  description,
  tokens,
  hideCheckbox,
  selectionMode,
  onToggle,
  onViewAllTokensPressed,
}) => {
  const {t} = useTranslation();
  const {currencyName} = currency;
  const onPress = useCallback(
    (currencyAbbreviation: string, chain: string): void => {
      haptic(IS_ANDROID ? 'keyboardPress' : 'impactLight');
      onToggle?.(currencyAbbreviation, chain);
    },
    [onToggle],
  );

  return (
    <CurrencySelectionRowContainer>
      <ChainSelectionRow
        currency={currency}
        onToggle={() => onPress(currency.currencyAbbreviation, currency.chain)}
        hideCheckbox={hideCheckbox}
        selectionMode={selectionMode}
      />

      {description ? <DescriptionRow>{description}</DescriptionRow> : null}

      {tokens?.length ? (
        <>
          <TokensHeading>
            {t('PopularArgTokens', {currency: t(currencyName)})}
          </TokensHeading>

          {tokens.map(token => (
            <TokenSelectionRow
              key={token.id}
              token={token}
              onToggle={() => {
                onPress(token.currencyAbbreviation, token.chain);
              }}
              hideCheckbox={hideCheckbox}
              selectionMode={selectionMode}
            />
          ))}

          <TokensFooter>
            <ViewAllLink
              onPress={() => {
                onViewAllTokensPressed?.(currency, tokens);
              }}>
              {t('ViewAllArgTokens', {currency: t(currencyName)})}
            </ViewAllLink>
          </TokensFooter>
        </>
      ) : null}
    </CurrencySelectionRowContainer>
  );
};

export default memo(CurrencySelectionRow);
