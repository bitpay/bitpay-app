import React, {
  ReactElement,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import styled from 'styled-components/native';
import {ethers} from 'ethers';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {
  Key,
  TransactionProposal,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {
  convertToFiat,
  formatCurrencyAbbreviation,
  formatFiatAmount,
  getCurrencyAbbreviation,
  keyExtractor,
  sleep,
} from '../../../utils/helper-methods';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {AvailableWalletsPill} from '../../../components/list/GlobalSelectRow';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {
  ActiveOpacity,
  CurrencyColumn,
  CurrencyImageContainer,
} from '../../../components/styled/Containers';
import _ from 'lodash';
import KeyWalletsRow, {
  KeyWallet,
  KeyWalletsRowProps,
} from '../../../components/list/KeyWalletsRow';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {Black, White} from '../../../styles/colors';
import {H4, TextAlign, H7, SubText} from '../../../components/styled/Text';
import {useNavigation, useTheme} from '@react-navigation/native';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {useTranslation} from 'react-i18next';
import {findWalletById, toFiat} from '../../../store/wallet/utils/wallet';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import NestedArrowIcon from '../../../components/nested-arrow/NestedArrow';
import {SearchContainer} from '../../wallet/screens/CurrencySelection';
import {
  createHomeCardList,
  keyBackupRequired,
} from '../../tabs/home/components/Crypto';
import {AddWalletData} from '../../../store/wallet/effects/create/create';
import {Network} from '../../../constants';
import CurrencySelectionSearchInput from '../../wallet/components/CurrencySelectionSearchInput';
import {
  DescriptionRow,
  TokensHeading,
} from '../../../components/list/CurrencySelectionRow';
import {GetPrecision, IsSegwitCoin} from '../../../store/wallet/utils/currency';
import {SUPPORTED_EVM_COINS} from '../../../constants/currencies';
import {
  FormatAmountStr,
  parseAmountToStringIfBN,
} from '../../../store/wallet/effects/amount/amount';
import {
  createTxProposal,
  publishAndSign,
} from '../../../store/wallet/effects/send/send';
import {BWCErrorMessage} from '../../../constants/BWCError';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import {WrongPasswordError} from '../../wallet/components/ErrorMessages';
import {RootState} from '../../../store';

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

interface ApproveErc20ModalProps {
  isVisible: boolean;
  modalTitle?: string;
  onDismiss: (broadcastedTx?: Partial<TransactionProposal>) => void;
  modalContext?: string;
  wallet: Wallet;
  spenderData: {
    offerKey: string;
    offerName: string;
    spenderKey: string;
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
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const navigation = useNavigation();
  const [encodedData, setEncodedData] = useState<string>('');
  const [ctxp, setCtxp] = useState<Partial<TransactionProposal>>();
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const key = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys[wallet.keyId],
  );

  // object to pass to select modal
  const [keyWallets, setKeysWallets] =
    useState<KeyWalletsRowProps<KeyWallet>[]>();

  const getApproveErc20EncodedData = () => {
    // Dirección del contrato ERC20 del token
    const tokenAddress = wallet.tokenAddress; // 'contract_address_of_erc20_token';

    // Dirección del beneficiario al que se le dará la aprobación
    const spenderAddress = spenderData.address; // 'address_of_the_spender';

    // Cantidad de tokens que se aprobarán (en unidades mínimas del token)
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
    ); // 100 tokens con 18 decimales

    if (!tokenAddress || !spenderAddress || !amountToApprove) {
      return;
    }

    // Abre una instancia del contrato ERC20
    const tokenContract = new ethers.Contract(tokenAddress, [
      // ABI del contrato ERC20
      // Asegúrate de tener la ABI correcta del contrato ERC20 que estás usando
      // Puedes encontrarlo en Etherscan o en la documentación del contrato
      // Aquí hay un ejemplo simplificado de la ABI: 'function approve(address spender, uint256 amount) external returns (bool)'
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

    console.log(
      `getApproveErc20EncodedData() => spenderAddress: ${spenderAddress} | amountToApprove: ${amountToApprove} | tokenAddress: ${tokenAddress}`,
    );
    // Crea la llamada a la función approve
    const approveData = tokenContract.interface.encodeFunctionData('approve', [
      spenderAddress,
      amountToApprove,
    ]);

    setEncodedData(approveData);
    console.log('Approve calldata:', approveData);
  };

  const createTx = async () => {
    try {
      const message =
        wallet.currencyAbbreviation.toUpperCase() + ' ' + t('Approve');
      let outputs = [];

      outputs.push({
        toAddress: wallet.tokenAddress,
        amount: 0,
        message: message,
        data: encodedData,
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

      const ctxp = await createTxProposal(wallet, txp);
      return Promise.resolve(ctxp);
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
      console.log('==============makePayment err: ', err);
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
    if (encodedData) {
      createTx()
        .then(ctxp => {
          console.log('============== CTXP: ', ctxp);
          setCtxp(ctxp);
        })
        .catch(err => {
          let msg = t('Error creating transaction');
          if (typeof err?.message === 'string') {
            msg = msg + `: ${err.message}`;
          }
          const reason = 'createTx Error';
          // showError(msg, reason); // TODO: handle how to show errors here
          return;
        });
    }
  }, [encodedData]);

  useEffect(() => {
    if (isVisible) {
      getApproveErc20EncodedData();
    }
  }, [isVisible]);

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
          {context === 'swapCrypto' && (
            <TextAlign
              style={{marginTop: 15, marginLeft: 5, marginRight: 5}}
              align={'center'}>
              <SubText>
                {`To complete the swap, you will need to allow the exchange (${
                  spenderData.spenderKey
                }) to spend your ${wallet.currencyAbbreviation.toUpperCase()}.` +
                  '\n' +
                  `By granting this permission, ${
                    spenderData.spenderName
                  } will be able to withdraw your ${wallet.currencyAbbreviation.toUpperCase()} and complete transactions for you.`}
              </SubText>
            </TextAlign>
          )}
          <ApproveErc20ModalContainer>
            <SubText>
              {`Token: ${wallet.currencyAbbreviation.toUpperCase()}`}
            </SubText>
            <SubText>{`Token Contract: ${wallet.tokenAddress}`}</SubText>
            <SubText>
              {`Allowance to approve: ${
                spenderData.amount
              } ${wallet.currencyAbbreviation.toUpperCase()}`}
            </SubText>
            <SubText>{`Spender Address: ${spenderData.address}`}</SubText>
            <SubText>{`Encoded data: ${encodedData}`}</SubText>
            {ctxp ? (
              <SubText>
                {`Fee: ${dispatch(
                  FormatAmountStr(
                    wallet.chain, // use chain for miner fee
                    wallet.chain,
                    undefined,
                    ctxp.fee,
                  ),
                )}`}
              </SubText>
            ) : null}
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
