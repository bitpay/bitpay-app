import React, {useEffect, useState, useMemo} from 'react';
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
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import Clipboard from '@react-native-clipboard/clipboard';
import {useAppDispatch} from '../../../utils/hooks';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {useTranslation} from 'react-i18next';
import AddContactIcon from '../../../components/icons/add-contacts/AddContacts';
import {useNavigation} from '@react-navigation/native';
import {
  addTokenChainSuffix,
  findContact,
  formatCryptoAddress,
  getBadgeImg,
  getCurrencyAbbreviation,
} from '../../../utils/helper-methods';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import ContactIcon from '../../tabs/contacts/components/ContactIcon';
import {
  DetailColumn,
  DetailContainer,
  DetailRow,
  SendToPillContainer,
} from '../screens/send/confirm/Shared';
import {RootState} from '../../../store';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {View} from 'react-native';
import {useTokenContext} from '../../../contexts';

const MisunderstoodOutputsText = styled(H7)`
  margin-bottom: 5px;
`;

const MultiOptionsContainer = styled(View)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 10px;
  margin-bottom: 5px;
  padding: 10px;
  flex: 1;
`;

const MultiOptionsText = styled(H7)`
  margin: 0 5px;
  width: 50%;
`;

const MultiOptionsMessageContainer = styled.View`
  margin: 5px 0;
`;

const MultiOptionsMessage = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const ContactsIconContainer = styled(TouchableOpacity)`
  margin-left: 5px;
`;

const RecipientsContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

const DetailsContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const MultipleOutputsTx = ({
  tx,
  tokenAddress,
}: {
  tx: any;
  tokenAddress: string | undefined;
}) => {
  const {t} = useTranslation();
  let {coin, network, chain} = tx;
  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);

  const {tokenOptionsByAddress: _tokenOptionsByAddress} = useTokenContext();

  const tokenOptionsByAddress = useAppSelector(({WALLET}: RootState) => {
    return {
      ...BitpaySupportedTokenOptsByAddress,
      ..._tokenOptionsByAddress,
      ...WALLET.customTokenOptionsByAddress,
    };
  });
  const foundToken =
    tokenAddress &&
    tokenOptionsByAddress[
      // `addTokenChainSuffix` already lowercases non-SVM chains and must
      // preserve case-sensitive SVM mint addresses.
      addTokenChainSuffix(tokenAddress.trim(), chain)
    ];

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

  const txOutputs = useMemo(() => {
    if (!tx?.outputs?.length) return [];

    let derivedCoin = coin;
    let derivedNetwork = network;

    return tx.outputs.map((output: any) => {
      const outputAddr = output.toAddress ?? output.address;

      if (!derivedCoin || !derivedNetwork) {
        const cn = GetCoinAndNetwork(outputAddr, derivedNetwork, chain);
        derivedCoin ||= cn?.coin;
        derivedNetwork ||= cn?.network;
      }

      const addressToShow = dispatch(
        GetProtocolPrefixAddress(
          derivedCoin,
          derivedNetwork,
          outputAddr,
          chain,
        ),
      );

      return {
        ...output,
        addressToShow:
          addressToShow === 'false' ? t('Unparsed address') : addressToShow,
        contactName: GetContactName(outputAddr, tokenAddress, contactList),
      };
    });
  }, [
    tx?.outputs,
    contactList,
    tokenAddress,
    chain,
    coin,
    network,
    dispatch,
    t,
  ]);

  const getDesc = () => {
    return (
      txOutputs[0].contactName ||
      tx.customData?.recipientEmail ||
      tx.customData?.toWalletName ||
      (txOutputs[0].addressToShow
        ? formatCryptoAddress(
            txOutputs[0].toAddress || txOutputs[0].addressToShow,
          )
        : formatCryptoAddress(txOutputs[0].address))
    );
  };

  const [showMultiOptions, setShowMultiOptions] = useState(true);

  const getIcon = (address: string) => {
    const existsContact = findContact(contactList, address);

    const coin = getCurrencyAbbreviation(tx.coin, tx.chain);
    const img = CurrencyListIcons[coin]
      ? CurrencyListIcons[coin]
      : foundToken &&
        // @ts-ignore
        foundToken?.logoURI
      ? // @ts-ignore
        (foundToken.logoURI as string)
      : '';
    const badgeImg = getBadgeImg(coin, chain);
    const icon = tx.customData?.recipientEmail ? (
      <ContactIcon
        name={tx.customData?.recipientEmail}
        coin={coin}
        chain={chain}
        address={address}
        size={18}
      />
    ) : existsContact ? (
      <ContactIcon
        name={getDesc()}
        coin={coin}
        chain={chain}
        address={address}
        size={18}
      />
    ) : (
      <CurrencyImage img={img} size={18} badgeUri={badgeImg} />
    );

    return tx.customData?.service === 'debitcard' ? (
      <CardSvg width={18} height={18} />
    ) : icon ? (
      icon
    ) : (
      <DefaultSvg width={18} height={18} />
    );
  };

  const gotoAddContacts = ({
    address,
    email,
  }: {
    address: string;
    email?: string;
  }) => {
    const {network, coin, chain} = tx;
    navigation.navigate('ContactsAdd', {
      contact: {
        address,
        email,
        network,
        coin,
        chain,
        tokenAddress: tokenAddress?.toLowerCase(),
      },
    });
  };

  return (
    <>
      <DetailContainer>
        <DetailRow>
          {['sent', 'moved'].includes(tx.action) ? (
            <H7>{t('Sent to')}</H7>
          ) : (
            <H7>{t('Sending to')}</H7>
          )}

          <DetailColumn>
            {tx.misunderstoodOutputs ? (
              <H7>{t('Multiple recipients')}</H7>
            ) : null}

            {!tx.hasMultiplesOutputs ? (
              <DetailRow>
                <SendToPillContainer>
                  {copied ? (
                    <SendToPill
                      icon={<CopiedSvg width={18} />}
                      description={getDesc()}
                    />
                  ) : (
                    <SendToPill
                      icon={getIcon(
                        txOutputs[0].addressToShow
                          ? txOutputs[0].addressToShow
                          : txOutputs[0].address,
                      )}
                      description={getDesc()}
                      onPress={() =>
                        copyText(
                          tx.customData?.recipientEmail ||
                            (txOutputs[0].addressToShow
                              ? txOutputs[0].addressToShow
                              : txOutputs[0].address),
                        )
                      }
                    />
                  )}
                </SendToPillContainer>

                {!txOutputs[0].contactName ? (
                  <ContactsIconContainer
                    activeOpacity={ActiveOpacity}
                    onPress={() =>
                      gotoAddContacts({
                        address:
                          txOutputs[0].addressToShow || txOutputs[0].address,
                        email: tx.customData?.recipientEmail,
                      })
                    }>
                    <AddContactIcon />
                  </ContactsIconContainer>
                ) : null}
              </DetailRow>
            ) : null}

            {tx.hasMultiplesOutputs ? (
              <DetailRow>
                <SendToPillContainer>
                  <SendToPill
                    icon={getIcon(
                      txOutputs[0].addressToShow ||
                        txOutputs[0].address ||
                        txOutputs[0].toAddress,
                    )}
                    description={`${tx.recipientCount} Recipients`}
                    onPress={() => setShowMultiOptions(!showMultiOptions)}
                    dropDown={true}
                  />
                </SendToPillContainer>
              </DetailRow>
            ) : null}
          </DetailColumn>
        </DetailRow>
      </DetailContainer>

      {tx.hasMultiplesOutputs && showMultiOptions
        ? txOutputs.map((output: any, i: number) => (
            <RecipientsContainer key={i}>
              <MultiOptionsContainer>
                <DetailsContainer>
                  {getIcon(
                    output.toAddress || output.address || output.addressToShow,
                  )}
                  <MultiOptionsText numberOfLines={1} ellipsizeMode={'middle'}>
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
                </DetailsContainer>

                {output.message ? (
                  <MultiOptionsMessageContainer>
                    <MultiOptionsMessage
                      numberOfLines={2}
                      ellipsizeMode={'tail'}>
                      {output.message}
                    </MultiOptionsMessage>
                  </MultiOptionsMessageContainer>
                ) : null}
              </MultiOptionsContainer>

              {!output.contactName ? (
                <ContactsIconContainer
                  activeOpacity={ActiveOpacity}
                  onPress={() =>
                    gotoAddContacts({
                      address: output.addressToShow || output.address,
                    })
                  }>
                  <AddContactIcon />
                </ContactsIconContainer>
              ) : null}
            </RecipientsContainer>
          ))
        : null}

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
