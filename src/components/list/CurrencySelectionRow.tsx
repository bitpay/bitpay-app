import React, {memo} from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import styled from 'styled-components/native';
import {IS_ANDROID} from '../../constants';
import {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';
import Checkbox from '../checkbox/Checkbox';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import haptic from '../haptic-feedback/haptic';
import {
  ActiveOpacity,
  CurrencyColumn,
  CurrencyImageContainer,
  RowContainer,
} from '../styled/Containers';
import {H5, ListItemSubText} from '../styled/Text';

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

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
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
  const {id, currencyAbbreviation, currencyName, img, selected, disabled} =
    currency;
  const onPress = (currency: CurrencySelectionItem): void => {
    const {id, currencyAbbreviation, currencyName, isToken} = currency;
    haptic(IS_ANDROID ? 'keyboardPress' : 'impactLight');
    onToggle?.({
      id,
      currencyAbbreviation,
      currencyName,
      isToken,
    });
  };

  return (
    <RowContainer
      activeOpacity={ActiveOpacity}
      onPress={() => onPress(currency)}>
      <CurrencyImageContainer>
        <CurrencyImage img={img} />
      </CurrencyImageContainer>

      <CurrencyColumn>
        <H5>{currencyName}</H5>

        <ListItemSubText>{currencyAbbreviation}</ListItemSubText>

        {description ? <ListItemSubText>{description}</ListItemSubText> : null}

        {tokens?.length ? (
          <>
            {tokens.slice(0, 3).map(token => (
              <View key={id + ':' + token.id} style={{flexDirection: 'row'}}>
                <ListItemSubText style={{flexShrink: 1, flexGrow: 1}}>
                  {token.currencyAbbreviation}
                </ListItemSubText>
                <Checkbox
                  checked={!!token.selected}
                  disabled={false}
                  onPress={() => onPress(token)}
                />
              </View>
            ))}
            <ListItemSubText
              onPress={() => {
                onViewAllTokensPressed?.(currency, tokens);
              }}>
              {t('SeeAllArgTokens', {currency: t(currencyName)})}
            </ListItemSubText>
          </>
        ) : null}
      </CurrencyColumn>

      {!hideCheckbox && (
        <CheckBoxContainer>
          <Checkbox
            checked={!!selected}
            disabled={disabled}
            onPress={() => onPress(currency)}
          />
        </CheckBoxContainer>
      )}
    </RowContainer>
  );
};

export default memo(CurrencySelectionRow);
