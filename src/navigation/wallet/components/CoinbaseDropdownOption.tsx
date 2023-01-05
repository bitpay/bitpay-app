import React from 'react';
import {ActiveOpacity, Row} from '../../../components/styled/Containers';
import {H3} from '../../../components/styled/Text';
import CoinbaseSvg from '../../../../assets/img/logos/coinbase.svg';
import {formatFiatAmountObj} from '../../../utils/helper-methods';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {useAppSelector} from '../../../utils/hooks';
import {Balance, KeyName, OptionContainer} from './KeyDropdownOption';
import {
  BalanceCode,
  BalanceCodeContainer,
} from '../../tabs/home/components/Wallet';

interface Props {
  onPress: () => void;
}
const CoinbaseDropdownOption = ({onPress}: Props) => {
  const balance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hideTotalBalance = useAppSelector(
    ({COINBASE}) => COINBASE.hideTotalBalance,
  );

  const {amount, code} = formatFiatAmountObj(
    balance,
    defaultAltCurrency.isoCode,
  );

  return (
    <OptionContainer activeOpacity={ActiveOpacity} onPress={onPress}>
      <Row style={{alignItems: 'center', justifyContent: 'center'}}>
        <Row style={{alignItems: 'center', justifyContent: 'flex-start'}}>
          <CoinbaseSvg style={{marginRight: 4}} width="25" />
          <KeyName>Coinbase</KeyName>
        </Row>
        {!hideTotalBalance ? (
          <>
            <Row style={{alignItems: 'center', justifyContent: 'flex-end'}}>
              <Balance>
                {amount}
                {code ? (
                  <BalanceCodeContainer>
                    <BalanceCode>{code}</BalanceCode>
                  </BalanceCodeContainer>
                ) : null}
              </Balance>
              <AngleRight style={{marginLeft: 10}} />
            </Row>
          </>
        ) : (
          <H3>****</H3>
        )}
      </Row>
    </OptionContainer>
  );
};

export default CoinbaseDropdownOption;
