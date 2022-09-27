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
import AddContactIcon from '../../../components/icons/add-contacts/AddContacts';
import {useNavigation} from '@react-navigation/native';
import {getBadgeImg} from '../../../utils/helper-methods';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {BitpaySupportedEthereumTokenOpts} from '../../../constants/tokens';

const MisunderstoodOutputsText = styled(H7)`
  margin-bottom: 5px;
`;

const MultiOptionsContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 10px;
  margin-bottom: 5px;
  padding: 10px;
  flex: 1;
`;

const MultiOptionsText = styled(H7)`
  max-width: 50%;
  margin: 0 5px;
`;

const MultiOptionsMessageContainer = styled.View`
  margin: 5px 0;
`;

const MultiOptionsMessage = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const ContactsIconContainer = styled.TouchableOpacity`
  margin-left: 5px;
`;

const MultipleOutputsTx = ({tx}: {tx: any}) => {
  const {t} = useTranslation();
  let {coin, network, chain} = tx;
  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);
  const {tokenOptions, customTokenOptions} = useAppSelector(
    ({WALLET}) => WALLET.customTokenOptions,
  );
  const tokenOpts = {
    eth: {
      ...BitpaySupportedEthereumTokenOpts,
      ...tokenOptions,
      ...customTokenOptions,
    },
  };
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const [copied, setCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string>();

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
      setCopiedAddress(text);
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
      GetProtocolPrefixAddress(coin, network, outputAddr, chain),
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
    const img = SUPPORTED_CURRENCIES.includes(tx.coin)
      ? CurrencyListIcons[tx.coin]
      : tokenOpts &&
        // @ts-ignore
        tokenOpts[tx.chain] &&
        // @ts-ignore
        tokenOpts[tx.chain][tx.coin]?.logoURI
      ? // @ts-ignore
        (tokenOpts[tx.chain][tx.coin].logoURI as string)
      : '';
    const badgeImg = getBadgeImg(tx.coin, chain);
    const icon = <CurrencyImage img={img} size={18} badgeUri={badgeImg} />;

    return tx.customData?.service === 'debitcard' ? (
      <CardSvg width={18} height={18} />
    ) : icon ? (
      icon
    ) : (
      <DefaultSvg width={18} height={18} />
    );
  };

  const gotoAddContacts = (address: string) => {
    const {network} = tx;
    navigation.navigate('Contacts', {
      screen: 'ContactsAdd',
      params: {
        contact: {
          address,
          network,
        },
      },
    });
  };

  return (
    <>
      <DetailContainer>
        <DetailRow>
          <H7>{t('Sent to')}</H7>

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

                {!tx.outputs[0].contactName ? (
                  <ContactsIconContainer
                    activeOpacity={ActiveOpacity}
                    onPress={() =>
                      gotoAddContacts(
                        tx.outputs[0].addressToShow || tx.outputs[0].address,
                      )
                    }>
                    <AddContactIcon />
                  </ContactsIconContainer>
                ) : null}
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
          <DetailRow>
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

                {copied &&
                (copiedAddress === output.toAddress ||
                  copiedAddress === output.address) ? (
                  <CopiedSvg />
                ) : null}

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

            {!output.contactName ? (
              <ContactsIconContainer
                activeOpacity={ActiveOpacity}
                onPress={() =>
                  gotoAddContacts(output.addressToShow || output.address)
                }>
                <AddContactIcon />
              </ContactsIconContainer>
            ) : null}
          </DetailRow>
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
