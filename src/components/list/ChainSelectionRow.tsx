import React, {memo} from 'react';
import styled from 'styled-components/native';
import {Slate30, SlateDark} from '../../styles/colors';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {ScreenGutter} from '../styled/Containers';
import {H7} from '../styled/Text';
import {CurrencyOpts} from '../../constants/currencies';
import {TouchableOpacity} from 'react-native-gesture-handler';

const ChainSelectionRowContainer = styled.View`
  border: 1px solid ${({theme}) => (theme.dark ? SlateDark : Slate30)};
  border-radius: 12px;
  flex-direction: column;
  margin: 0 ${ScreenGutter} ${ScreenGutter};
  padding: 16px;
`;

const FlexRow = styled(TouchableOpacity)`
  flex-direction: row;
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

interface ChainSelectionRowProps {
  chainObj: CurrencyOpts;
  onToggle: (currencyAbbreviation: string, chain: string) => any;
}

export const ChainSelectionRow: React.FC<ChainSelectionRowProps> = memo(
  props => {
    const {onToggle, chainObj} = props;
    const {coin: currencyAbbreviation, chain, img, name} = chainObj;

    return (
      <ChainSelectionRowContainer accessibilityLabel="currency-selection-container">
        <FlexRow
          accessibilityLabel="chain-selection-row"
          onPress={() => onToggle(currencyAbbreviation, chain)}>
          <CurrencyColumn>
            <CurrencyImage img={img!} />
          </CurrencyColumn>

          <CurrencyTitleColumn style={{flexGrow: 1}}>
            <CurrencyTitle>{name}</CurrencyTitle>
          </CurrencyTitleColumn>
        </FlexRow>
      </ChainSelectionRowContainer>
    );
  },
);
