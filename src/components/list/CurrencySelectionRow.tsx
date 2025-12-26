import React, {memo, useCallback} from 'react';
import {ImageRequireSource} from 'react-native';
import styled from 'styled-components/native';
import {IS_ANDROID} from '../../constants';
import {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';
import {CurrencySelectionMode} from '../../navigation/wallet/screens/CurrencySelection';
import {LightBlack, LuckySevens, Slate30, SlateDark} from '../../styles/colors';
import {formatCurrencyAbbreviation} from '../../utils/helper-methods';
import Checkbox from '../checkbox/Checkbox';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import haptic from '../haptic-feedback/haptic';
import {ScreenGutter} from '../styled/Containers';
import {BaseText, H7} from '../styled/Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import ChevronRightSvg from '../../../assets/img/angle-right.svg';

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
  imgSrc?: ImageRequireSource | undefined;
  selected?: boolean;
  disabled?: boolean;
};

export type CurrencySelectionRowProps = {
  currency: CurrencySelectionItem;
  hideCheckbox?: boolean;
  hideChevron?: boolean;
  disableCheckbox?: boolean;
  selectionMode?: CurrencySelectionMode;
  onToggle?: (currencyAbbreviation: string, chain: string) => void;
};

const RowContainer = styled(TouchableOpacity)`
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 12px;
  flex-direction: row;
  align-items: center;
  margin: 0 ${ScreenGutter} ${ScreenGutter};
  padding: 16px;
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

const ChevronContainer = styled.View`
  justify-content: center;
  align-items: center;
`;

const CurrencySelectionRow: React.FC<CurrencySelectionRowProps> = ({
  currency,
  onToggle,
}) => {
  const {
    currencyAbbreviation,
    currencyName,
    img,
    imgSrc,
    badgeUri,
    disabled,
    chain,
  } = currency;

  const onPress = useCallback((): void => {
    if (disabled) {
      return;
    }
    haptic(IS_ANDROID ? 'keyboardPress' : 'impactLight');
    onToggle?.(currencyAbbreviation, chain);
  }, [currencyAbbreviation, chain, disabled, onToggle]);

  return (
    <RowContainer
      style={{borderWidth: 0, marginBottom: 0}}
      accessibilityLabel="currency-selection-row"
      onPress={onPress}>
      <CurrencyColumn>
        <CurrencyImage img={img} imgSrc={imgSrc} badgeUri={badgeUri} />
      </CurrencyColumn>

      <CurrencyTitleColumn>
        <CurrencyTitle>{currencyName}</CurrencyTitle>
        <CurrencySubTitle>
          {formatCurrencyAbbreviation(currencyAbbreviation)}
        </CurrencySubTitle>
      </CurrencyTitleColumn>

      <ChevronContainer>
        <ChevronRightSvg height={16} width={16} />
      </ChevronContainer>
    </RowContainer>
  );
};

export default memo(CurrencySelectionRow);
