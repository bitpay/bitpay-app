import React, {useState, useEffect} from 'react';
import styled from 'styled-components/native';
import {ethers} from 'ethers';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {
  Key,
  TransactionProposal,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
} from '../../../utils/helper-methods';
import {Image, ScrollView, TouchableOpacity} from 'react-native';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import _ from 'lodash';
import cloneDeep from 'lodash.clonedeep';
import {Black, White} from '../../../styles/colors';
import {H4, TextAlign, SubText} from '../../../components/styled/Text';
import {useTheme} from '@react-navigation/native';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {useTranslation} from 'react-i18next';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {GetPrecision} from '../../../store/wallet/utils/currency';
import {FormatAmountStr} from '../../../store/wallet/effects/amount/amount';
import {
  createTxProposal,
  publishAndSign,
} from '../../../store/wallet/effects/send/send';
import {BWCErrorMessage} from '../../../constants/BWCError';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import {WrongPasswordError} from '../../wallet/components/ErrorMessages';
import {RootState} from '../../../store';
import {
  CoinIconContainer,
  ItemDivisor,
  RowData,
  RowDataContainer,
  RowLabel,
  SelectedOptionCol,
  SelectedOptionContainer,
  SelectedOptionText,
} from '../swap-crypto/styled/SwapCryptoCheckout.styled';
import SwapCheckoutSkeleton from '../swap-crypto/screens/SwapCheckoutSkeleton';
import {
  ContractAddressText,
  ContractHeaderContainer,
  ContractLink,
  LinkContainer,
  viewOnBlockchain,
} from '../../wallet/components/SendingToERC20Warning';
import LinkIcon from '../../../components/icons/link-icon/LinkIcon';
import {getSpenderApprovalWhitelist} from '../../../store/external-services/external-services.effects';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  LabelTip,
  LabelTipText,
} from '../../tabs/settings/external-services/styled/ExternalServicesDetails';
import {
  ThorswapProvider,
  ThorswapProviderNames,
} from '../../../store/swap-crypto/models/thorswap.models';

const CircleCheckIcon = require('../../../../assets/img/circle-check.png');

const ModalHeader = styled.View`
  height: 50px;
  margin-right: 10px;
  margin-left: 10px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const CloseModalButtonContainer = styled.View`
  position: absolute;
  left: 0;
`;

const CloseModalButton = styled.TouchableOpacity`
  padding: 5px;
  height: 41px;
  width: 41px;
  border-radius: 50px;
  background-color: #9ba3ae33;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalTitleContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const ApproveErc20ModalContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
`;

interface SpenderDataWhitelist {
  address: string;
  contractName: string;
  name: string;
  url: string;
}

interface ApproveErc20ModalProps {
  isVisible: boolean;
  modalTitle?: string;
  onDismiss: (broadcastedTx?: Partial<TransactionProposal>) => void;
  modalContext?: string;
  wallet: Wallet;
  spenderData: {
    offerKey: string;
    offerName: string;
    spenderKey: ThorswapProvider;
    spenderName: string;
    address: string;
    amount: string;
  };
  onHelpPress?: () => void;
}

const ApproveErc20Modal: React.FC<ApproveErc20ModalProps> = ({
  isVisible,
  modalTitle,
  onDismiss,
  modalContext,
  wallet,
  spenderData,
  onHelpPress,
}) => {
  const {t} = useTranslation();
  const context = modalContext;
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSpenderData, setIsLoadingSpenderData] = useState(false);
  const [spenderDataWhiteList, setSpenderDataWhiteList] = useState<{
    siteUrl?: string | undefined;
    spenderVerified?: boolean | undefined;
  }>({
    siteUrl: undefined,
    spenderVerified: false,
  });
  const [encodedData, setEncodedData] = useState<string>('');
  const [copiedEncodedData, setCopiedEncodedData] = useState(false);
  const [ctxp, setCtxp] = useState<Partial<TransactionProposal>>();
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const key = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys[wallet.keyId],
  );

  const copyText = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
  };

  const getSpenderData = async () => {
    try {
      const spenderDataWhitelist: SpenderDataWhitelist[] = await dispatch(
        getSpenderApprovalWhitelist(),
      );
      const knownContract = spenderDataWhitelist.find(contract => {
        return (
          contract?.address?.toLowerCase() ==
          cloneDeep(spenderData.address).toLowerCase()
        );
      });

      if (!_.isEmpty(knownContract)) {
        logger.debug(
          'Spender address verified: ' + JSON.stringify(knownContract),
        );
        setSpenderDataWhiteList({
          siteUrl: knownContract.url,
          spenderVerified: true,
        });
      }
    } catch (err) {
      setSpenderDataWhiteList({
        siteUrl: undefined,
        spenderVerified: false,
      });
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      const log = `Spender address could not be verified:  ${errStr}`;
      logger.debug(log);
    }
  };

  const encodeErc20DataAndCreateTx = async () => {
    // Token to approve contract address
    const tokenAddress = wallet.tokenAddress;

    // Spender contract address
    const spenderAddress = spenderData.address;

    // Allowance to approve
    const precision = dispatch(
      GetPrecision(
        wallet.currencyAbbreviation,
        wallet.chain,
        wallet.tokenAddress,
      ),
    );
    const amountToApprove = ethers.utils.parseUnits(
      spenderData.amount,
      precision!.unitDecimals,
    );

    if (!tokenAddress || !spenderAddress || !amountToApprove) {
      return;
    }

    const tokenContract = new ethers.Contract(tokenAddress, [
      // ABI ERC20 Approve function
      {
        constant: false,
        inputs: [
          {
            name: '_spender',
            type: 'address',
          },
          {
            name: '_value',
            type: 'uint256',
          },
        ],
        name: 'approve',
        outputs: [
          {
            name: 'success',
            type: 'bool',
          },
        ],
        payable: false,
        type: 'function',
      },
    ]);

    logger.debug(
      `encodeErc20DataAndCreateTx() => spenderAddress: ${spenderAddress} | amountToApprove: ${amountToApprove} | tokenAddress: ${tokenAddress}`,
    );

    const approveData = tokenContract.interface.encodeFunctionData('approve', [
      spenderAddress,
      amountToApprove,
    ]);

    setEncodedData(approveData);
    logger.debug(`Approve calldata: ${approveData}`);

    try {
      const ctxp = await createTx(approveData);
      setCtxp(ctxp);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      const log = `Error creating transaction: ${errStr}`;
      logger.error(log);
      let msg = t('Error creating transaction');
      const reason = 'createTx Error';
      // showError(msg, reason); // TODO: handle how to show errors here
      return;
    }
  };

  const createTx = async (approveData: string) => {
    try {
      const message =
        wallet.currencyAbbreviation.toUpperCase() + ' ' + t('Approve');
      let outputs = [];

      outputs.push({
        toAddress: wallet.tokenAddress,
        amount: 0,
        message: message,
        data: approveData,
      });

      let txp: Partial<TransactionProposal> = {
        toAddress: wallet.tokenAddress,
        amount: 0,
        chain: wallet.chain,
        outputs,
        message: message,
        excludeUnconfirmedUtxos: true, // Do not use unconfirmed UTXOs
        feeLevel: 'priority', // Avoid expired order due to slow TX confirmation
        customData: {
          [spenderData.offerKey]: wallet.tokenAddress,
          service: spenderData.offerKey,
        },
      };

      const _ctxp = await createTxProposal(wallet, txp);
      return Promise.resolve(_ctxp);
    } catch (err: any) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      const log = `createTxProposal error: ${errStr}`;
      logger.error(log);
      return Promise.reject({
        title: t('Could not create transaction'),
        message: BWCErrorMessage(err),
      });
    }
  };

  const makePayment = async () => {
    try {
      // dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
      // await sleep(400);
      const broadcastedTx = (await dispatch(
        publishAndSign({txp: ctxp! as TransactionProposal, key, wallet}),
      )) as TransactionProposal;
      onDismiss(broadcastedTx);
      // saveChangellyTx();
      // dispatch(dismissOnGoingProcessModal());
      // await sleep(400);
      // setShowPaymentSentModal(true);
    } catch (err) {
      // dispatch(dismissOnGoingProcessModal());
      // await sleep(500);
      setResetSwipeButton(true);
      switch (err) {
        case 'invalid password':
          dispatch(showBottomNotificationModal(WrongPasswordError()));
          break;
        case 'password canceled':
          break;
        case 'biometric check failed':
          setResetSwipeButton(true);
          break;
        default:
          logger.error(JSON.stringify(err));
          const msg = t('Uh oh, something went wrong. Please try again later');
          const reason = 'publishAndSign Error';
        // showError(msg, reason);
      }
    }
  };

  useEffect(() => {
    if (isVisible) {
      setIsLoading(true);
      encodeErc20DataAndCreateTx();
      getSpenderData();
    }
  }, [isVisible]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedEncodedData(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedEncodedData]);

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={() => {}}>
      <ApproveErc20ModalContainer>
        <SafeAreaView>
          <ModalHeader>
            <CloseModalButtonContainer>
              <CloseModalButton
                onPress={() => {
                  if (onDismiss) {
                    onDismiss();
                  }
                }}>
                <CloseModal
                  {...{
                    width: 20,
                    height: 20,
                    color: theme.dark ? 'white' : 'black',
                  }}
                />
              </CloseModalButton>
            </CloseModalButtonContainer>
            {!!modalTitle && (
              <ModalTitleContainer>
                <TextAlign align={'center'}>
                  <H4>{modalTitle}</H4>
                </TextAlign>
                {onHelpPress ? (
                  <TouchableOpacity
                    onPress={() => {
                      onHelpPress();
                    }}
                    style={{marginLeft: 5}}>
                    <InfoSvg width={20} height={20} />
                  </TouchableOpacity>
                ) : null}
              </ModalTitleContainer>
            )}
          </ModalHeader>
          <ApproveErc20ModalContainer style={{padding: 14}}>
            {context === 'swapCrypto' && (
              <TextAlign style={{marginBottom: 15}} align={'left'}>
                <SubText>
                  {`To complete the swap, you will need to allow the exchange (${
                    spenderData.spenderKey &&
                    ThorswapProviderNames[spenderData.spenderKey]
                      ? ThorswapProviderNames[spenderData.spenderKey]
                      : spenderData.spenderKey
                  }) to spend your ${wallet.currencyAbbreviation.toUpperCase()}.` +
                    '\n' +
                    `By granting this permission, ${
                      spenderData.spenderKey &&
                      ThorswapProviderNames[spenderData.spenderKey]
                        ? ThorswapProviderNames[spenderData.spenderKey]
                        : spenderData.spenderKey
                    } will be able to withdraw your ${wallet.currencyAbbreviation.toUpperCase()} and complete transactions for you.`}
                </SubText>
              </TextAlign>
            )}
            <ScrollView>
              <ItemDivisor />
              <RowDataContainer>
                <RowLabel>{t('Approving')}</RowLabel>
                <SelectedOptionContainer>
                  <SelectedOptionCol>
                    <CoinIconContainer>
                      <CurrencyImage
                        img={wallet.img}
                        badgeUri={getBadgeImg(
                          getCurrencyAbbreviation(
                            wallet.currencyAbbreviation,
                            wallet.chain,
                          ),
                          wallet.chain,
                        )}
                        size={20}
                      />
                    </CoinIconContainer>
                    <SelectedOptionText
                      numberOfLines={1}
                      ellipsizeMode={'tail'}>
                      {wallet.currencyName}
                    </SelectedOptionText>
                  </SelectedOptionCol>
                </SelectedOptionContainer>
              </RowDataContainer>
              <ItemDivisor />
              {isLoading ? (
                <SwapCheckoutSkeleton />
              ) : (
                <>
                  <RowDataContainer>
                    <RowLabel>{t('Allowance to approve')}</RowLabel>
                    {spenderData?.amount ? (
                      <RowData>
                        {Number(spenderData.amount)
                          .toFixed(6)
                          .replace(/\.?0+$/, '')}{' '}
                        {wallet.currencyAbbreviation.toUpperCase()}
                      </RowData>
                    ) : null}
                  </RowDataContainer>
                  <ItemDivisor />
                  {ctxp ? (
                    <>
                      <RowDataContainer>
                        <RowLabel>{t('Miner Fee')}</RowLabel>
                        {ctxp.fee ? (
                          <RowData>
                            {dispatch(
                              FormatAmountStr(
                                wallet.chain, // use chain for miner fee
                                wallet.chain,
                                undefined,
                                ctxp.fee,
                              ),
                            )}
                          </RowData>
                        ) : (
                          <RowData>...</RowData>
                        )}
                      </RowDataContainer>
                      <ItemDivisor />
                    </>
                  ) : null}

                  <ContractHeaderContainer style={{paddingTop: 16}}>
                    <RowLabel>{t('Token Contract Address')}</RowLabel>
                    <LinkContainer>
                      <LinkIcon />
                      <ContractLink
                        onPress={() => dispatch(viewOnBlockchain(wallet))}>
                        {t('View Contract')}
                      </ContractLink>
                    </LinkContainer>
                  </ContractHeaderContainer>
                  <ContractAddressText style={{marginBottom: 16}}>
                    {wallet.tokenAddress}
                  </ContractAddressText>
                  <ItemDivisor />

                  <ContractHeaderContainer style={{paddingTop: 16}}>
                    <RowContainer>
                      <RowLabel>{t('Spender Contract Address')}</RowLabel>
                      {spenderDataWhiteList?.spenderVerified ? (
                        <Image
                          source={CircleCheckIcon}
                          style={{width: 20, height: 20, marginLeft: 6}}
                        />
                      ) : null}
                    </RowContainer>
                    <LinkContainer>
                      <LinkIcon />
                      <ContractLink
                        onPress={() =>
                          console.log(
                            'TODO: spenderData.address: ' + spenderData.address,
                          )
                        }>
                        {t('View Contract')}
                      </ContractLink>
                    </LinkContainer>
                  </ContractHeaderContainer>
                  <ContractAddressText
                    style={{
                      marginBottom: spenderDataWhiteList?.spenderVerified
                        ? 5
                        : 16,
                    }}>
                    {spenderData.address}
                  </ContractAddressText>

                  {spenderDataWhiteList?.spenderVerified ? (
                    <>
                      <RowDataContainer>
                        <RowLabel>{t('Site URL')}</RowLabel>
                        <RowData>{spenderDataWhiteList.siteUrl}</RowData>
                      </RowDataContainer>
                    </>
                  ) : (
                    <LabelTip type="warn">
                      <LabelTipText>
                        {t(
                          'We have not been able to verify the Spender Contract Address as a trusted one. Make sure you know this spender to give them access to your tokens.',
                        )}
                      </LabelTipText>
                    </LabelTip>
                  )}
                  <ItemDivisor />

                  <TouchableOpacity
                    onPress={() => {
                      copyText(encodedData);
                      setCopiedEncodedData(true);
                    }}>
                    <ContractHeaderContainer style={{paddingTop: 16}}>
                      <RowLabel>{t('Encoded Data')}</RowLabel>
                      {copiedEncodedData ? <CopiedSvg width={17} /> : null}
                    </ContractHeaderContainer>
                    <ContractAddressText style={{marginBottom: 16}}>
                      {encodedData}
                    </ContractAddressText>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </ApproveErc20ModalContainer>
        </SafeAreaView>
        {ctxp ? (
          <SwipeButton
            title={'Slide to approve'}
            // disabled={!termsAccepted}
            onSwipeComplete={() => {
              try {
                logger.debug('Swipe completed. Making payment...');
                makePayment();
              } catch (err) {}
            }}
            forceReset={resetSwipeButton}
          />
        ) : null}
      </ApproveErc20ModalContainer>
    </SheetModal>
  );
};

export default ApproveErc20Modal;
