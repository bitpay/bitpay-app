import React, {useState} from 'react';
import {useAppSelector} from '../../../utils/hooks/useAppSelector';
import {GetCoinAndNetwork} from '../../../store/wallet/effects/address/address';
import {GetProtocolPrefixAddress} from '../../../store/wallet/utils/wallet';
import {GetContactName} from '../../../store/wallet/effects/transactions/transactions';
import styled from 'styled-components/native';
import {Hr} from '../../../components/styled/Containers';
import {H7} from '../../../components/styled/Text';
import CardSvg from '../../../../assets/img/wallet/transactions/card.svg';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {View} from 'react-native';
import DefaultSvg from '../../../../assets/img/currencies/default.svg';
import SendToPill from './SendToPill';
import {DetailContainer, DetailRow, DetailColumn} from "../screens/TransactionDetails";

const MisunderstoodOutputsText = styled(H7)`
  margin-bottom: 5px;
`

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

  const getIcon = () => {
    return tx.customData?.service == 'debitcard' ? (
        <CardSvg width={18} height={18} />
    ) : SUPPORTED_CURRENCIES.includes(coin) ? (
        CurrencyListIcons[coin]({width: 18, height: 18})
    ) : <DefaultSvg width={18} height={18}  />
  }

  return (
    <>
      <DetailContainer>
        <DetailRow>
          <H7>Sending to</H7>

          <DetailColumn>
            {tx.misunderstoodOutputs ? <H7>Multiple recipients</H7> : null}

            {!tx.hasMultiplesOutputs ? (
              <DetailRow>
                <SendToPill
                  icon={getIcon()}
                  description={getDesc()}
                />
              </DetailRow>
            ) : null}

            {tx.hasMultiplesOutputs ? (
              <DetailRow>
                <SendToPill
                    icon={getIcon()}
                    description={`${tx.recipientCount} Recipients`}
                    onPress={() => setShowMultiOptions(!showMultiOptions)}
                />
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
        <MisunderstoodOutputsText>
          There are some misunderstood outputs, please view on blockchain.
        </MisunderstoodOutputsText>
      ) : null}

      <Hr />
    </>
  );
};
export default MultipleOutputsTx;
