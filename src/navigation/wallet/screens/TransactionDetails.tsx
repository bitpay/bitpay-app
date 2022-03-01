import {
  BaseText,
  H7,
  H6,
  HeaderTitle,
  Link,
} from '../../../components/styled/Text';
import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {useAppDispatch} from '../../../utils/hooks';
import {
  buildTransactionDetails,
  getDetailsTitle,
  IsMoved,
  IsMultisigEthInfo,
  IsReceived,
  IsSent,
  IsShared,
  NotZeroAmountEth,
} from '../../../store/wallet/effects/transactions/transactions';
import styled from 'styled-components/native';
import {
  Column,
  Hr,
  Row,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {
  GetBlockExplorerUrl,
  IsCustomERCToken,
  IsERCToken,
} from '../../../store/wallet/utils/currency';
import moment from 'moment';
import {TouchableOpacity, View} from 'react-native';
import {TransactionIcons} from '../../../constants/TransactionIcons';
import Button from '../../../components/button/Button';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import Clipboard from '@react-native-community/clipboard';
import MultipleOutputsTx from '../components/MultipleOutputsTx';

const TxsDetailsContainer = styled.SafeAreaView`
  flex: 1;
  margin: ${ScreenGutter};
`;

const HeaderContainer = styled.View``;

const Title = styled(BaseText)``;

const SubTitle = styled(BaseText)``;

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

const DetailLinkText = styled(Link)``;

const DetailLink = styled.TouchableOpacity``;

const TimelineIconContainer = styled.View``;

const TimelineDescription = styled.View``;

const TimelineTime = styled.View``;

const RejectedIcon = styled.View``;

const NumberIcon = styled.View``;

const ActionsNumber = styled(BaseText)``;

const MemoTextInput = styled.TextInput``;

const TxsDetailsLabel = ({
  title,
  description,
  type,
  onPressLink,
}: {
  title: string;
  description: string;
  type: string;
  onPressLink?: () => void;
}) => {
  return (
    <>
      <BaseText>{title}</BaseText>
      <BaseText>{description}</BaseText>
      <BaseText>{type}</BaseText>
    </>
  );
};

const TransactionDetails = () => {
  const {
    params: {transaction, wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'TransactionDetails'>>();

  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [txs, setTxs] = useState<any>();
  const title = getDetailsTitle(transaction, wallet);
  let {
    currencyAbbreviation,
    credentials: {network},
  } = wallet;
  currencyAbbreviation = currencyAbbreviation.toLowerCase();
  const isTestnet = network === 'testnet';

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{title}</HeaderTitle>,
    });
  }, [title]);

  console.log(wallet);

  const init = async () => {
    try {
      const _transaction = await dispatch(
        buildTransactionDetails({transaction, wallet}),
      );
      setTxs(_transaction);
      console.log('---------------->');
      console.log(_transaction);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const lowAmount = useCallback(() => {}, []);

  const speedUp = () => {};

  const getFormattedDate = (time: number) => {
    return moment(time).format('MM/DD/YYYY hh:mm a');
  };

  const copyText = (text: string) => {
    Clipboard.setString(text);
  };

  const goToBlockchain = () => {
    let url = GetBlockExplorerUrl(currencyAbbreviation, network);
    switch (currencyAbbreviation) {
      case 'doge':
        url =
          network === 'livenet'
            ? `https://${url}dogecoin/transaction/${txs.txid}`
            : `https://${url}tx/DOGETEST/${txs.txid}`;
        break;
      default:
        url = `https://${url}tx/${txs.txid}`;
    }

    dispatch(openUrlWithInAppBrowser(url));
  };

  return (
    <TxsDetailsContainer>
      {txs ? (
        <>
          <HeaderContainer>
            {NotZeroAmountEth(txs.amount, currencyAbbreviation) ? (
              <Title>{txs.amountStr}</Title>
            ) : null}

            {!IsCustomERCToken(currencyAbbreviation) ? (
              <SubTitle>
                {!txs.fiatRateStr
                  ? '...'
                  : isTestnet
                  ? 'Test Only - No Value'
                  : txs.fiatRateStr}
              </SubTitle>
            ) : null}

            {!NotZeroAmountEth(txs.amount, currencyAbbreviation) ? (
              <SubTitle>Interaction with contract</SubTitle>
            ) : null}
          </HeaderContainer>

          {(currencyAbbreviation === 'eth' ||
            IsERCToken(currencyAbbreviation)) &&
          txs.error ? (
            <TxsDetailsLabel
              type={'error'}
              title={'Waning!'}
              description={`Error encountered during contract execution (${txs.error})`}
            />
          ) : null}

          {currencyAbbreviation === 'btc' &&
          IsReceived(txs.action) &&
          txs.lowAmount ? (
            <TxsDetailsLabel
              type={'warning'}
              title={'Amount Too Low To Spend'}
              description={
                'This transaction amount is too small compared to current Bitcoin network fees. Spending these funds will need a Bitcoin network fee cost comparable to the funds itself.'
              }
              onPressLink={lowAmount}
            />
          ) : null}

          {currencyAbbreviation === 'btc' &&
          txs.isRBF &&
          (IsSent(txs.action) || IsMoved(txs.action)) ? (
            <TxsDetailsLabel
              type={'info'}
              title={'RBF transaction'}
              description={
                'This transaction can be accelerated using a higher fee.'
              }
              onPressLink={speedUp}
            />
          ) : null}

          <SubTitle>DETAILS</SubTitle>

          {txs.feeStr && !IsReceived(txs.action) ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>Miner fee</H7>
                  <DetailColumn>
                    <H6>{txs.feeStr}</H6>
                    {!isTestnet ? (
                      <H7>
                        {txs.feeFiatStr}{' '}
                        {txs.feeRateStr
                          ? txs.feeRateStr + ' of total amount'
                          : null}
                      </H7>
                    ) : null}
                    {isTestnet ? <H7>Test Only - No Value</H7> : null}
                  </DetailColumn>

                  {IsReceived(txs.action) && txs.lowFee ? (
                    <TxsDetailsLabel
                      type={'error'}
                      title={'Low Fee'}
                      description={
                        'This transaction could take a long time to confirm or could be dropped due to the low fees set by the sender.'
                      }
                    />
                  ) : null}
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          {/*  TODO: multiple outputs*/}
          {IsSent(txs.action) ? <MultipleOutputsTx tx={txs} /> : null}

          {txs.creatorName && IsShared(wallet) ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>Created by</H7>

                  <H6>{txs.creatorName}</H6>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          <DetailContainer>
            <DetailRow>
              <H7>Date</H7>
              <H6>
                {getFormattedDate((txs.ts || txs.createdOn || txs.time) * 1000)}
              </H6>
            </DetailRow>
          </DetailContainer>

          <Hr />

          {txs.nonce ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>Nonce</H7>
                  <H6>{txs.nonce}</H6>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          <DetailContainer>
            <DetailRow>
              <H7>Confirmations</H7>
              <DetailColumn>
                {!txs.confirmations ? <H6>Unconfirmed</H6> : null}
                {txs.feeRate ? <H7>Fee rate: {txs.feeRate}</H7> : null}
                {!!txs.confirmations && !txs.safeConfirmed ? (
                  <H6>{txs.conformations}</H6>
                ) : null}
                {txs.safeConfirmed ? <H6>{txs.safeConfirmed}</H6> : null}
              </DetailColumn>
            </DetailRow>
            {!txs.confirmations ? (
              <DetailLink>
                <DetailLinkText>
                  Why is my transaction unconfirmed?
                </DetailLinkText>
              </DetailLink>
            ) : null}
          </DetailContainer>

          <Hr />

          <DetailContainer>
            <H7>MEMO</H7>

            <MemoTextInput
              numberOfLines={3}
              placeholder={'Enter a transaction memo'}
              value={txs.detailsMemo}
            />
          </DetailContainer>

          <DetailContainer>
            <DetailRow>
              <H7>Transaction ID</H7>

              <TouchableOpacity onPress={() => copyText(txs.txid)}>
                <H7 numberOfLines={1} ellipsizeMode={'tail'}>
                  {txs.txid}
                </H7>
              </TouchableOpacity>
            </DetailRow>
          </DetailContainer>

          {/*  TODO: Notify unconfirmed transaction*/}

          {!IsMultisigEthInfo(wallet) && txs.actionsList?.length ? (
            <DetailContainer>
              <H7>Timeline</H7>

              {txs.actionsList.map((a: any, index: number) => {
                return (
                  <View key={index}>
                    <TimelineIconContainer>
                      {a.type === 'rejected' ? (
                        <RejectedIcon>!</RejectedIcon>
                      ) : null}
                      {a.type === 'broadcasted'
                        ? TransactionIcons.broadcast
                        : null}
                      {a.type !== 'broadcasted' && a.type !== 'rejected' ? (
                        <NumberIcon>
                          <ActionsNumber>
                            {txs.actionsList.length - index}
                          </ActionsNumber>
                        </NumberIcon>
                      ) : null}
                    </TimelineIconContainer>
                    <TimelineDescription>
                      <DetailRow>
                        <H7>{a.description}</H7>
                        <H7>{a.by}</H7>
                      </DetailRow>
                    </TimelineDescription>
                    <TimelineTime>
                      <H7>{getFormattedDate(a.time * 1000)}</H7>
                    </TimelineTime>
                  </View>
                );
              })}
            </DetailContainer>
          ) : null}

          <Button buttonStyle={'secondary'} onPress={goToBlockchain}>
            View On Blockchain
          </Button>
        </>
      ) : null}
    </TxsDetailsContainer>
  );
};

export default TransactionDetails;
