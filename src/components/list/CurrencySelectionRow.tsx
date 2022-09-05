import React, {memo, useCallback} from 'react';
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
  onToggle?: (id: string) => void;
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
      <FlexRow onPress={() => onToggle?.(currency.id)}>
        <CurrencyColumn>
          <CurrencyImage img={img} imgSrc={imgSrc} />
        </CurrencyColumn>

        <CurrencyTitleColumn style={{flexGrow: 1}}>
          <CurrencyTitle>{currencyName}</CurrencyTitle>

          <CurrencySubTitle>{currencyAbbreviation}</CurrencySubTitle>
        </CurrencyTitleColumn>

        {!hideCheckbox && (
          <CurrencyColumn>
            <Checkbox
              checked={!!selected}
              radio={selectionMode === 'single'}
              disabled={!!disabled}
              onPress={() => onToggle?.(currency.id)}
            />
          </CurrencyColumn>
        )}
      </FlexRow>
    );
  },
);

interface TokenSelectionRowProps {
  chainImg?: CurrencySelectionItem['img'];
  token: CurrencySelectionItem;
  hideCheckbox?: boolean;
  selectionMode?: CurrencySelectionMode;
  onToggle?: (id: string) => any;
}

export const TokenSelectionRow: React.VFC<TokenSelectionRowProps> = memo(
  props => {
    const {chainImg, token, hideCheckbox, selectionMode, onToggle} = props;

    return (
      <FlexRow style={{marginBottom: 24}} onPress={() => onToggle?.(token.id)}>
        <CurrencyColumn style={{marginRight: 16}}>
          <NestedArrowIcon />
        </CurrencyColumn>

        <CurrencyColumn>
          <CurrencyImage
            img={token.img}
            imgSrc={token.imgSrc}
            badgeUri={chainImg}
          />
        </CurrencyColumn>

        <CurrencyTitleColumn style={{flexGrow: 1}}>
          <CurrencyTitle>{token.currencyName}</CurrencyTitle>

          <CurrencySubTitle style={{flexShrink: 1, flexGrow: 1}}>
            {token.currencyAbbreviation}
          </CurrencySubTitle>
        </CurrencyTitleColumn>

        {!hideCheckbox ? (
          <CurrencyColumn>
            <Checkbox
              checked={!!token.selected}
              radio={selectionMode === 'single'}
              disabled={!!token.disabled}
              onPress={() => onToggle?.(token.id)}
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
    (id: string): void => {
      haptic(IS_ANDROID ? 'keyboardPress' : 'impactLight');
      onToggle?.(id);
    },
    [onToggle],
  );

  return (
    <CurrencySelectionRowContainer>
      <ChainSelectionRow
        currency={currency}
        onToggle={onPress}
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
              chainImg={currency.img}
              token={token}
              onToggle={onPress}
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
