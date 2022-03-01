import React, {useState} from 'react';
import {useAppSelector} from '../../../utils/hooks/useAppSelector';
import {GetCoinAndNetwork} from '../../../store/wallet/effects/address/address';
import {GetProtocolPrefixAddress} from '../../../store/wallet/utils/wallet';
import {GetContactName} from '../../../store/wallet/effects/transactions/transactions';
import styled from 'styled-components/native';
import {Column, Hr, Row} from '../../../components/styled/Containers';
import {H7, H6} from '../../../components/styled/Text';
import CardSvg from '../../../../assets/img/wallet/transactions/card.svg';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {TouchableOpacity, View} from 'react-native';
import ArrowDown from '../../../../assets/img/chevron-down.svg';
const DetailContainer = styled.View`
  min-height: 80px;
  margin: 5px 0;
  justify-content: center;
`;

const DetailRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`;

const DetailColumn = styled(Column)`
  align-items: flex-end;
`;

const MultiOptionsContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const MultipleOutputsTx = ({tx}: {tx: any}) => {
  let {coin, network} = tx;
  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);

  tx.outputs.forEach((output: any) => {
    const outputAddr = output.toAddress ? output.toAddress : output.address;
    coin = coin || GetCoinAndNetwork(outputAddr, network)?.coin;

    const addressToShow = GetProtocolPrefixAddress(coin, network, outputAddr);

    output.addressToShow =
      addressToShow == 'false' ? 'Unparsed address' : addressToShow;

    output.contactName = GetContactName(outputAddr, contactList);
  });

  const getDesc = () => {
    return (
      tx.outputs[0].contactName ||
      tx.customData?.toWalletName ||
      (tx.outputs[0].addressToShow
        ? tx.outputs[0].addressToShow
        : tx.outputs[0].address)
    );
  };

  const [showMultiOptions, setShowMultiOptions] = useState(false);

  console.log(tx.outputs);

  return (
    <>
      <DetailContainer>
        <DetailRow>
          <H7>Sending to</H7>

          <DetailColumn>
            {tx.misunderstoodOutputs ? <H6>Multiple recipients</H6> : null}

            {!tx.hasMultiplesOutputs ? (
              <DetailRow>
                {tx.customData?.service == 'debitcard' ? (
                  <CardSvg width={18} height={18} />
                ) : SUPPORTED_CURRENCIES.includes(coin) ? (
                  CurrencyListIcons[coin]({width: 18, height: 18})
                ) : null}

                <H7>{getDesc()}</H7>
              </DetailRow>
            ) : null}

            {tx.hasMultiplesOutputs ? (
              <DetailRow>
                {CurrencyListIcons[coin]({width: 18, height: 18})}

                <H7>Multiple recipients {tx.recipientCount}</H7>

                <TouchableOpacity
                  onPress={() => setShowMultiOptions(!showMultiOptions)}>
                  <ArrowDown />
                </TouchableOpacity>
              </DetailRow>
            ) : null}
          </DetailColumn>
        </DetailRow>
      </DetailContainer>

      {tx.hasMultiplesOutputs &&
        showMultiOptions &&
        tx.outputs.map((output: any, i: number) => (
          <View key={i}>
            <H7>
              {output.contactName ||
                output.addressToShow ||
                output.toAddress ||
                output.address}
            </H7>
            <H7>
              {output.amountStr}{' '}
              {output.alternativeAmountStr ? output.alternativeAmountStr : null}
            </H7>
            {output.message ? <H7>{output.message}</H7> : null}
          </View>
        ))}

      {tx.misunderstoodOutputs ? (
        <H7>
          There are some misunderstood outputs, please view on blockchain.
        </H7>
      ) : null}

      <Hr />
    </>
  );
};
export default MultipleOutputsTx;
