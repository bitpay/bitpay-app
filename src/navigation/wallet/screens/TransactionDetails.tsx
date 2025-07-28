import {
  BaseText,
  H7,
  H6,
  HeaderTitle,
  Link,
  H2,
  H4,
} from '../../../components/styled/Text';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {
  buildTransactionDetails,
  EditTxNote,
  getDetailsTitle,
  IsMoved,
  IsMultisigEthInfo,
  IsReceived,
  IsSent,
  IsShared,
  TxForPaymentFeeEVM,
  TxActions,
} from '../../../store/wallet/effects/transactions/transactions';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  Hr,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {
  GetBlockExplorerUrl,
  IsCustomERCToken,
} from '../../../store/wallet/utils/currency';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {TransactionIcons} from '../../../constants/TransactionIcons';
import Button from '../../../components/button/Button';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import Clipboard from '@react-native-clipboard/clipboard';
import MultipleOutputsTx from '../components/MultipleOutputsTx';
import {URL} from '../../../constants';
import {
  Black,
  Caution,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Banner from '../../../components/banner/Banner';
import Info from '../../../components/icons/info/Info';
import TransactionDetailSkeleton from '../components/TransactionDetailSkeleton';
import {getContactObj, sleep} from '../../../utils/helper-methods';
import {GetAmFormatDate} from '../../../store/wallet/utils/time';
import {
  createProposalAndBuildTxDetails,
  getTx,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {FormatAmount} from '../../../store/wallet/effects/amount/amount';
import {
  Recipient,
  TransactionDetailsBuilt,
  TransactionOptionsContext,
} from '../../../store/wallet/wallet.models';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {useTranslation} from 'react-i18next';
import {TxDescription} from './send/confirm/TxDescription';
import {SUPPORTED_VM_TOKENS} from '../../../constants/currencies';
import {DetailColumn, DetailContainer, DetailRow} from './send/confirm/Shared';
import {LogActions} from '../../../store/log';
import {RootState} from '../../../store';
import {getDecodedTransactionsByHash} from '../../../store/moralis/moralis.effects';
import {
  LabelTip,
  LabelTipText,
} from '../../tabs/settings/external-services/styled/ExternalServicesDetails';

const TxsDetailsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const SubTitle = styled(BaseText)`
  font-size: 14px;
  font-weight: 300;
`;

const VerticalSpace = styled.View`
  margin: 10px 0;
`;

const TransactionIdText = styled(H7)`
  max-width: 150px;
`;

const TimelineContainer = styled.View`
  padding: 15px 0;
`;

const TimelineItem = styled.View`
  padding: 10px 0;
`;

const TimelineDescription = styled.View`
  margin: 0 10px;
`;

const TimelineBorderLeft = styled.View<{isFirst: boolean; isLast: boolean}>`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  position: absolute;
  top: ${({isFirst}) => (isFirst ? '45px' : 0)};
  bottom: ${({isLast}) => (isLast ? '15px' : 0)};
  left: 18px;
  width: 1px;
  z-index: -1;
`;
const TimelineTime = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const IconBackground = styled.View`
  height: 35px;
  width: 35px;
  border-radius: 50px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const NumberIcon = styled(IconBackground)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
`;

const DetailLink = styled(Link)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
`;

const CopyImgContainer = styled.View`
  justify-content: center;
  margin-right: 5px;
`;

const CopyTransactionId = styled(TouchableOpacity)`
  flex-direction: row;
`;

const TimelineList = ({actions}: {actions: TxActions[]}) => {
  return (
    <>
      {actions.map(
        (
          {type, time, description, by}: TxActions,
          index: number,
          {length}: {length: number},
        ) => {
          return (
            <DetailRow key={index}>
              <TimelineBorderLeft
                isFirst={index === 0}
                isLast={index === length - 1}
              />
              <TimelineItem>
                <DetailRow>
                  {type === 'rejected' ? (
                    <IconBackground>
                      <Info size={35} bgColor={Caution} />
                    </IconBackground>
                  ) : null}

                  {type === 'broadcasted' ? (
                    <IconBackground>
                      {TransactionIcons.broadcast}
                    </IconBackground>
                  ) : null}

                  {type !== 'broadcasted' && type !== 'rejected' ? (
                    <NumberIcon>
                      <H7>{length - index}</H7>
                    </NumberIcon>
                  ) : null}

                  <TimelineDescription>
                    <H7>{description}</H7>
                    {by ? <H7>{by}</H7> : null}
                  </TimelineDescription>
                </DetailRow>
              </TimelineItem>

              <TimelineTime>{GetAmFormatDate(time * 1000)}</TimelineTime>
            </DetailRow>
          );
        },
      )}
    </>
  );
};

const TransactionDetails = () => {
  const logger = useLogger();
  const {
    params: {transaction, wallet, onTxDescriptionChange},
  } = useRoute<RouteProp<WalletGroupParamList, 'TransactionDetails'>>();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const contacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [txs, setTxs] = useState<TransactionDetailsBuilt>();
  const [txDescription, setTxDescription] = useState<string>();
  const [isForFee, setIsForFee] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [failStatus, setFailStatus] = useState<{
    showFailStatus: boolean;
    failStatusMsg: string | undefined;
  }>({
    showFailStatus: false,
    failStatusMsg: undefined,
  });
  const title = getDetailsTitle(transaction, wallet);
  let {
    currencyAbbreviation,
    network,
    chain,
    tokenAddress,
    credentials: {walletId},
  } = wallet;
  currencyAbbreviation = currencyAbbreviation.toLowerCase();
  const isTestnet = network === 'testnet';

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{title}</HeaderTitle>,
    });
  }, [navigation, title]);

  const init = async () => {
    try {
      const _transaction = await dispatch(
        buildTransactionDetails({
          transaction,
          wallet,
          defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
        }),
      );

      if (
        _transaction.customData?.service === 'thorswap' &&
        !!_transaction.confirmations &&
        _transaction.confirmations > 0
      ) {
        try {
          if (_transaction.txid && chain) {
            logger.debug(
              'Trying to getDecodedTransactionsByHash with: ' +
                JSON.stringify({
                  chain: chain,
                  transactionHash: _transaction.txid,
                }),
            );
            const decodedTxDetails: any = await dispatch(
              getDecodedTransactionsByHash({
                chain: chain,
                transactionHash: _transaction.txid,
              }),
            );

            if (decodedTxDetails?.logs && decodedTxDetails.logs.length === 0) {
              const description = t(
                'The internal transaction failed, probably due to an error in the execution of the contract.',
              );
              setFailStatus({
                showFailStatus: true,
                failStatusMsg: `${
                  decodedTxDetails.to_address_label
                    ? decodedTxDetails.to_address_label + ': '
                    : ''
                }${description}`,
              });
            }
          }
        } catch (err: any) {
          const error =
            err?.message && typeof err.message === 'string'
              ? err.message
              : JSON.stringify(err);
          logger.debug(
            'Error trying to getDecodedTransactionsByHash. Continue anyways. Error: ' +
              error,
          );
        }
      }

      setTxs(_transaction);
      setTxDescription(_transaction.txDescription);
      setIsForFee(
        transaction.action !== 'received' &&
          TxForPaymentFeeEVM(
            wallet.currencyAbbreviation,
            transaction.coin,
            transaction.chain,
            transaction.amount,
          ),
      );
      await sleep(500);
      setIsLoading(false);
    } catch (err) {
      await sleep(500);
      setIsLoading(false);
      const e = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error('[TransactionDetails] ', e));
    }
  };

  useEffect(() => {
    init();
  }, []);

  const speedup = async () => {
    try {
      const txp = await getTx(wallet, transaction.proposalId); // only way to get actual inputs and ouputs
      const toAddress = transaction.outputs[0].address;

      const contact = getContactObj(
        contacts,
        toAddress,
        currencyAbbreviation,
        network,
        chain,
      );

      const recipient = contact
        ? {...contact, ...{type: 'contact'}}
        : {
            address: toAddress,
          };

      let recipientList: Recipient[] | undefined;
      if (transaction.hasMultiplesOutputs) {
        recipientList = [];
        txp.outputs.forEach((output: any) => {
          recipientList!.push({
            address: output.toAddress,
            amount: Number(
              dispatch(
                FormatAmount(
                  currencyAbbreviation,
                  chain,
                  tokenAddress,
                  output.amount,
                  true,
                ),
              ),
            ),
          });
        });
      }
      const tx = {
        wallet,
        walletId,
        context: 'fromReplaceByFee' as TransactionOptionsContext,
        amount: Number(
          dispatch(
            FormatAmount(
              currencyAbbreviation,
              chain,
              tokenAddress,
              transaction.amount,
              true,
            ),
          ),
        ),
        toAddress,
        currencyAbbreviation,
        network,
        inputs: txp.inputs,
        recipientList,
        feeLevel: 'priority',
        recipient,
        message: txp.message,
      };

      const {txDetails, txp: newTxp} = await dispatch(
        createProposalAndBuildTxDetails(tx),
      );

      navigation.navigate('Confirm', {
        wallet,
        recipient,
        recipientList,
        txp: newTxp,
        txDetails,
        amount: tx.amount,
        speedup: true,
      });
    } catch (err: any) {
      const [errorMessageConfig] = await Promise.all([
        dispatch(handleCreateTxProposalError(err)),
        sleep(400),
      ]);
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: false,
        }),
      );
    }
  };

  const [copied, setCopied] = useState(false);

  const copyText = (text: string) => {
    if (!copied) {
      Clipboard.setString(text);
      setCopied(true);
    }
  };

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [copied]);

  const goToBlockchain = () => {
    let url = GetBlockExplorerUrl(network, chain);
    switch (currencyAbbreviation) {
      case 'doge':
        url =
          network === 'livenet'
            ? `https://${url}dogecoin/transaction/${txs?.txid}`
            : `https://${url}tx/DOGETEST/${txs?.txid}`;
        break;
      default:
        url = `https://${url}tx/${txs?.txid}`;
    }

    dispatch(openUrlWithInAppBrowser(url));
  };

  const saveTxDescription = async (newTxDescription: string) => {
    if (!txs?.txid) {
      dispatch(LogActions.error('[EditTxNote] There is no txid present'));
      return;
    }

    try {
      await EditTxNote(wallet, {txid: txs.txid, body: newTxDescription});
      transaction.note = {
        body: newTxDescription,
      };
      transaction.uiDescription = newTxDescription;
      setTxDescription(newTxDescription);
      onTxDescriptionChange();
    } catch (err) {
      const e = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error('[EditTxNote] ', e));
    }
  };

  return (
    <TxsDetailsContainer>
      {isLoading ? (
        <TransactionDetailSkeleton />
      ) : txs ? (
        <ScrollView
          keyboardShouldPersistTaps={'handled'}
          extraScrollHeight={80}>
          <>
            {!isForFee ? <H2 medium={true}>{txs.amountStr}</H2> : null}

            {!IsCustomERCToken(tokenAddress, chain) && !isForFee ? (
              <SubTitle>
                {!txs.fiatRateStr
                  ? '...'
                  : isTestnet
                  ? t('Test Only - No Value')
                  : txs.fiatRateStr}
              </SubTitle>
            ) : null}

            {isForFee ? <H4>{t('Interaction with contract')}</H4> : null}
          </>

          {/* --------- Info ----------------*/}
          {SUPPORTED_VM_TOKENS.includes(chain) && txs.error ? (
            <Banner
              type={'error'}
              title={t('Warning!')}
              description={t('Error encountered during contract execution ()', {
                error: txs.error,
              })}
            />
          ) : null}

          {currencyAbbreviation === 'btc' &&
          (IsReceived(txs.action) || IsMoved(txs.action)) &&
          txs.lowAmount ? (
            <Banner
              type={'warning'}
              title={t('Amount Too Low To Spend')}
              description={t(
                'This transaction amount is too small compared to current Bitcoin network fees.',
              )}
              link={{
                text: t('Learn More'),
                onPress: () => {
                  dispatch(openUrlWithInAppBrowser(URL.HELP_LOW_AMOUNT));
                },
              }}
            />
          ) : null}

          {currencyAbbreviation === 'btc' &&
          (!txs.customData?.service ||
            !['changelly', 'thorswap'].includes(txs.customData.service)) && // It is not advisable to accelerate transactions that involve Swap operations.
          (IsSent(txs.action) || IsMoved(txs.action)) &&
          (!txs.confirmations || txs.confirmations === 0) ? (
            <Banner
              type={'info'}
              title={t('RBF transaction')}
              description={t(
                'This transaction can be accelerated using a higher fee.',
              )}
              link={{
                text: t('Speed Up'),
                onPress: speedup,
              }}
            />
          ) : null}

          {IsReceived(txs.action) && txs.lowFee ? (
            <Banner
              type={'error'}
              title={t('Low Fee')}
              description={t(
                'This transaction may take time to confirm or be dropped due to the low fee set by the sender.',
              )}
            />
          ) : null}
          {/* ------------------------------------------- */}

          <DetailContainer>
            <H6>{t('DETAILS')}</H6>
          </DetailContainer>
          <Hr />

          {txs.feeStr && !IsReceived(txs.action) ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>{t('Miner fee')}</H7>
                  <DetailColumn>
                    <H6>{txs.feeStr}</H6>
                    {!isTestnet ? (
                      <H7>
                        {txs.feeFiatStr}{' '}
                        {txs.feeRateStr
                          ? '(' +
                            txs.feeRateStr +
                            ' ' +
                            t('of total amount') +
                            ')'
                          : null}
                      </H7>
                    ) : (
                      <SubTitle>{t('Test Only - No Value')}</SubTitle>
                    )}
                    {txs.feeRate ? (
                      <SubTitle>{t('Fee rate: ') + txs.feeRate}</SubTitle>
                    ) : null}
                  </DetailColumn>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          {IsSent(txs.action) ? (
            <MultipleOutputsTx tx={txs} tokenAddress={wallet.tokenAddress} />
          ) : null}

          {txs.creatorName && IsShared(wallet) ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>{t('Created by')}</H7>

                  <H7>{txs.creatorName}</H7>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          {txs.ts || txs.createdOn || txs.time ? (
            <DetailContainer>
              <DetailRow>
                <H7>{t('Date')}</H7>
                <H7>
                  {GetAmFormatDate(
                    (txs.ts || txs.createdOn || txs.time)! * 1000,
                  )}
                </H7>
              </DetailRow>
            </DetailContainer>
          ) : null}

          <Hr />

          {txs.nonce ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>{t('Nonce')}</H7>
                  <H7>{txs.nonce}</H7>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          <DetailContainer>
            <DetailRow>
              <H7>{t('Confirmations')}</H7>
              <DetailColumn>
                {!txs.confirmations ? (
                  <TouchableOpacity
                    activeOpacity={ActiveOpacity}
                    onPress={() => {
                      dispatch(
                        openUrlWithInAppBrowser(URL.HELP_TXS_UNCONFIRMED),
                      );
                    }}>
                    <DetailLink>{t('Unconfirmed')}?</DetailLink>
                  </TouchableOpacity>
                ) : null}
                {!!txs.confirmations && !txs.safeConfirmed ? (
                  <H7>{txs.confirmations}</H7>
                ) : null}
                {txs.safeConfirmed ? <H7>{txs.safeConfirmed}</H7> : null}
              </DetailColumn>
            </DetailRow>
          </DetailContainer>

          <Hr />

          {!!txs.confirmations && failStatus.showFailStatus ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>{t('Status')}</H7>
                  <DetailColumn>
                    <H7 style={{color: Caution}}>{'Fail'}</H7>
                  </DetailColumn>
                </DetailRow>

                <LabelTip type="warn" style={{marginTop: 20}}>
                  <LabelTipText>{failStatus.failStatusMsg}</LabelTipText>
                </LabelTip>
              </DetailContainer>

              <Hr />
            </>
          ) : null}

          <DetailContainer>
            <DetailRow>
              <H7>{t('Transaction ID')}</H7>

              <CopyTransactionId onPress={() => copyText(txs.txid!)}>
                <CopyImgContainer>
                  {copied ? <CopiedSvg width={17} /> : null}
                </CopyImgContainer>
                <TransactionIdText numberOfLines={1} ellipsizeMode={'tail'}>
                  {txs.txid}
                </TransactionIdText>
              </CopyTransactionId>
            </DetailRow>
          </DetailContainer>

          <Hr />

          {/*  TODO: Add Notify unconfirmed transaction  row */}

          {!IsMultisigEthInfo(wallet) && txs.actionsList?.length ? (
            <>
              <TimelineContainer>
                <H7>{t('Timeline')}</H7>

                <TimelineList actions={txs.actionsList} />
              </TimelineContainer>

              <Hr />
            </>
          ) : null}

          <VerticalSpace>
            <TxDescription
              txDescription={txDescription || ''}
              onChange={text => saveTxDescription(text)}
            />
          </VerticalSpace>

          <VerticalSpace>
            <Button buttonStyle={'secondary'} onPress={goToBlockchain}>
              {t('View On Blockchain')}
            </Button>
          </VerticalSpace>
        </ScrollView>
      ) : null}
    </TxsDetailsContainer>
  );
};

export default TransactionDetails;
