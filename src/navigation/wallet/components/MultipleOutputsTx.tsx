import React, {useEffect, useState} from 'react';
import {useAppSelector} from '../../../utils/hooks/useAppSelector';
import {GetCoinAndNetwork} from '../../../store/wallet/effects/address/address';
import {GetProtocolPrefixAddress} from '../../../store/wallet/utils/wallet';
import {GetContactName} from '../../../store/wallet/effects/transactions/transactions';
import styled from 'styled-components/native';
import {ActiveOpacity, Hr} from '../../../components/styled/Containers';
import {H7} from '../../../components/styled/Text';
import CardSvg from '../../../../assets/img/wallet/transactions/card.svg';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import DefaultSvg from '../../../../assets/img/currencies/default.svg';
import SendToPill from './SendToPill';
import {
  DetailContainer,
  DetailRow,
  DetailColumn,
} from '../screens/TransactionDetails';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import Clipboard from '@react-native-community/clipboard';
import {useAppDispatch} from '../../../utils/hooks';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {useTranslation} from 'react-i18next';

const MisunderstoodOutputsText = styled(H7)`
  margin-bottom: 5px;
`;

const MultiOptionsContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 10px;
  margin-bottom: 5px;
  padding: 10px;
`;

const MultiOptionsText = styled(H7)`
  width: 55%;
  margin: 0 5px;
`;

const MultiOptionsMessageContainer = styled.View`
  margin: 5px 0;
`;

const MultiOptionsMessage = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const MultipleOutputsTx = ({tx}: {tx: any}) => {
  const {t} = useTranslation();
  let {coin, network} = tx;
  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);
  const dispatch = useAppDispatch();

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [copied]);

  const copyText = (text: string) => {
    if (!copied && !!text) {
      Clipboard.setString(text);
      setCopied(true);
    }
  };

  tx.outputs.forEach((output: any) => {
    const outputAddr = output.toAddress ? output.toAddress : output.address;
    if (!coin || !network) {
      const coinAndNetwork = GetCoinAndNetwork(outputAddr, network);
      coin = coin || coinAndNetwork?.coin;
      network = network || coinAndNetwork?.network;
    }

    const addressToShow = dispatch(
      GetProtocolPrefixAddress(coin, network, outputAddr),
    );

    output.addressToShow =
      addressToShow === 'false' ? t('Unparsed address') : addressToShow;

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
    return tx.customData?.service === 'debitcard' ? (
      <CardSvg width={18} height={18} />
    ) : SUPPORTED_CURRENCIES.includes(coin) ? (
      CurrencyListIcons[coin]({width: 18, height: 18})
    ) : (
      <DefaultSvg width={18} height={18} />
    );
  };

  return (
    <>
      <DetailContainer>
        <DetailRow>
          <H7>{t('Sending to')}</H7>

          <DetailColumn>
            {tx.misunderstoodOutputs ? (
              <H7>{t('Multiple recipients')}</H7>
            ) : null}

            {!tx.hasMultiplesOutputs ? (
              <DetailRow>
                {copied ? (
                  <SendToPill
                    icon={<CopiedSvg width={18} />}
                    description={getDesc()}
                  />
                ) : (
                  <SendToPill
                    icon={getIcon()}
                    description={getDesc()}
                    onPress={() =>
                      copyText(
                        tx.outputs[0].addressToShow
                          ? tx.outputs[0].addressToShow
                          : tx.outputs[0].address,
                      )
                    }
                  />
                )}
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
          <MultiOptionsContainer
            key={i}
            activeOpacity={ActiveOpacity}
            onPress={() => copyText(output.toAddress || output.address)}>
            <DetailRow>
              {getIcon()}
              <MultiOptionsText numberOfLines={1} ellipsizeMode={'tail'}>
                {output.contactName ||
                  output.addressToShow ||
                  output.toAddress ||
                  output.address}
              </MultiOptionsText>
              <DetailColumn>
                <H7 medium={true}>{output.amountStr}</H7>
                {output.alternativeAmountStr ? (
                  <H7>{output.alternativeAmountStr}</H7>
                ) : null}
              </DetailColumn>
            </DetailRow>

            {output.message ? (
              <MultiOptionsMessageContainer>
                <MultiOptionsMessage numberOfLines={2} ellipsizeMode={'tail'}>
                  {output.message}
                </MultiOptionsMessage>
              </MultiOptionsMessageContainer>
            ) : null}
          </MultiOptionsContainer>
        ))}

      {tx.misunderstoodOutputs ? (
        <MisunderstoodOutputsText>
          {t(
            'There are some misunderstood outputs, please view on blockchain.',
          )}
        </MisunderstoodOutputsText>
      ) : null}

      <Hr />
    </>
  );
};
export default MultipleOutputsTx;
