import React, {memo} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import ArrowDownRightIcon from '../../../assets/img/arrow-down-right.svg';
import {IS_ANDROID} from '../../constants';
import {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';
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
import {ScreenGutter} from '../styled/Containers';
import {BaseText, H6, H7} from '../styled/Text';

export type CurrencySelectionItem = Pick<
  SupportedCurrencyOption,
  'id' | 'currencyAbbreviation' | 'currencyName' | 'img' | 'isToken'
> & {
  selected?: boolean;
  disabled?: boolean;
};

export interface CurrencySelectionToggleProps {
  id: string;
  currencyAbbreviation: string;
  currencyName: string;
  isToken?: boolean;
}

export type CurrencySelectionRowProps = {
  currency: CurrencySelectionItem;
  tokens?: CurrencySelectionItem[];
  description?: string;
  hideCheckbox?: boolean;
  onToggle?: (props: CurrencySelectionToggleProps) => void;
  onViewAllTokensPressed?: (
    currency: CurrencySelectionItem,
    tokens: CurrencySelectionItem[],
  ) => any;
};

const CurrencySelectionRowContainer = styled.View`
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 12px;
  flex-direction: column;
  margin: 0 ${ScreenGutter} ${ScreenGutter};
  padding: 16px;
`;

const ChainSelectionRow = styled.View`
  flex-direction: row;
`;

const TokenSelectionRow = styled.View`
  flex-direction: row;
  margin-bottom: 24px;
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

const TokensHeading = styled(H7).attrs(() => ({
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

const CurrencySelectionRow: React.VFC<CurrencySelectionRowProps> = ({
  currency,
  description,
  tokens,
  hideCheckbox,
  onToggle,
  onViewAllTokensPressed,
}) => {
  const {t} = useTranslation();
  const {currencyAbbreviation, currencyName, img, selected, disabled} =
    currency;
  const onPress = (item: CurrencySelectionItem): void => {
    haptic(IS_ANDROID ? 'keyboardPress' : 'impactLight');
    onToggle?.({
      id: item.id,
      currencyAbbreviation: item.currencyAbbreviation,
      currencyName: item.currencyName,
      isToken: item.isToken,
    });
  };

  return (
    <CurrencySelectionRowContainer>
      <ChainSelectionRow>
        <CurrencyColumn>
          <CurrencyImage img={img} />
        </CurrencyColumn>

        <CurrencyTitleColumn style={{flexGrow: 1}}>
          <CurrencyTitle>{currencyName}</CurrencyTitle>

          <CurrencySubTitle>{currencyAbbreviation}</CurrencySubTitle>
        </CurrencyTitleColumn>

        {!hideCheckbox && (
          <CurrencyColumn>
            <Checkbox
              checked={!!selected}
              disabled={disabled}
              onPress={() => onPress(currency)}
            />
          </CurrencyColumn>
        )}
      </ChainSelectionRow>

      {description ? (
        <ChainSelectionRow style={{marginTop: 16}}>
          <ChainDescription>{description}</ChainDescription>
        </ChainSelectionRow>
      ) : null}

      {tokens?.length ? (
        <>
          <TokensHeading>
            {t('PopularArgTokens', {currency: t(currencyName)})}
          </TokensHeading>

          {tokens.slice(0, 3).map(token => (
            <TokenSelectionRow key={token.id}>
              <CurrencyColumn style={{marginRight: 16}}>
                <ArrowDownRightIcon />
              </CurrencyColumn>

              <CurrencyColumn>
                <CurrencyImage img={token.img} />
              </CurrencyColumn>

              <CurrencyTitleColumn style={{flexGrow: 1}}>
                <CurrencyTitle>{token.currencyName}</CurrencyTitle>

                <CurrencySubTitle style={{flexShrink: 1, flexGrow: 1}}>
                  {token.currencyAbbreviation}
                </CurrencySubTitle>
              </CurrencyTitleColumn>

              <CurrencyColumn>
                <Checkbox
                  checked={!!token.selected}
                  disabled={false}
                  onPress={() => onPress(token)}
                />
              </CurrencyColumn>
            </TokenSelectionRow>
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
