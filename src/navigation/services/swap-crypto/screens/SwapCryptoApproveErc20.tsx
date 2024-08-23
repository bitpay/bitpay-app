import React, {useState, useEffect} from 'react';
import styled from 'styled-components/native';
import {ethers} from 'ethers';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import {
  TransactionProposal,
  Wallet,
} from '../../../../store/wallet/wallet.models';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {Image, ScrollView, TouchableOpacity} from 'react-native';
import _ from 'lodash';
import cloneDeep from 'lodash.clonedeep';
import {TextAlign, SubText, BaseText} from '../../../../components/styled/Text';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {useTranslation} from 'react-i18next';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {GetPrecision} from '../../../../store/wallet/utils/currency';
import {FormatAmountStr} from '../../../../store/wallet/effects/amount/amount';
import {
  createTxProposal,
  publishAndSign,
} from '../../../../store/wallet/effects/send/send';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import SwipeButton from '../../../../components/swipe-button/SwipeButton';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import {RootState} from '../../../../store';
import {
  CoinIconContainer,
  ItemDivisor,
  RowData,
  RowDataContainer,
  SelectedOptionCol,
  SelectedOptionContainer,
  SelectedOptionText,
} from '../styled/SwapCryptoCheckout.styled';
import SwapCheckoutSkeleton from './SwapCheckoutSkeleton';
import {
  ContractAddressText,
  ContractHeaderContainer,
  ContractLink,
  LinkContainer,
  viewOnBlockchain,
} from '../../../wallet/components/SendingToERC20Warning';
import LinkIcon from '../../../../components/icons/link-icon/LinkIcon';
import {getSpenderApprovalWhitelist} from '../../../../store/external-services/external-services.effects';
import CopiedSvg from '../../../../../assets/img/copied-success.svg';
import haptic from '../../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  LabelTip,
  LabelTipText,
} from '../../../tabs/settings/external-services/styled/ExternalServicesDetails';
import {
  ThorswapProvider,
  ThorswapProviderNames,
} from '../../../../store/swap-crypto/models/thorswap.models';
import {Black, White} from '../../../../styles/colors';

const CircleCheckIcon = require('../../../../../assets/img/circle-check.png');

const SwapCryptoApproveErc20Container = styled.SafeAreaView`
  flex: 1;
`;

const ViewContainer = styled.View`
  padding: 16px;
`;

const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
`;

const DataLabel = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-size: 14px;
  font-weight: 500;
`;

interface SpenderDataWhitelist {
  address: string;
  contractName: string;
  name: string;
  url: string;
}

export interface SwapCryptoApproveErc20Params {
  onDismiss: (
    broadcastedTx?: Partial<TransactionProposal>,
    err?: string,
  ) => void;
  context?: string;
  wallet: Wallet;
  spenderData: {
    offerKey: string;
    offerName: string;
    spenderKey: ThorswapProvider;
    address: string;
    amount: string;
  };
}

const SwapCryptoApproveErc20: React.FC = () => {
  const {
    params: {onDismiss, context, wallet, spenderData},
  }: {params: SwapCryptoApproveErc20Params} =
    useRoute<RouteProp<{params: SwapCryptoApproveErc20Params}>>();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const [isLoading, setIsLoading] = useState(true);
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

  const finish = async (
    broadcastedTx?: Partial<TransactionProposal>,
    err?: string,
  ) => {
    dispatch(dismissOnGoingProcessModal());
    navigation.goBack();
    await sleep(1000);
    onDismiss(broadcastedTx, err);
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
      const errMsg = t(
        'Uh oh, something went wrong. Error creating transaction',
      );
      finish(undefined, errMsg);
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
      const broadcastedTx = (await dispatch(
        publishAndSign({txp: ctxp! as TransactionProposal, key, wallet}),
      )) as TransactionProposal;
      finish(broadcastedTx);
    } catch (err) {
      setResetSwipeButton(true);
      await sleep(200);
      switch (err) {
        case 'invalid password':
          dispatch(showBottomNotificationModal(WrongPasswordError()));
          break;
        case 'password canceled':
          break;
        case 'biometric check failed':
          break;
        default:
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          const log = `Error making payment in publishAndSign: ${errStr}`;
          logger.error(log);
          const errMsg = t(
            'Uh oh, something went wrong. Error: publishAndSign',
          );
          finish(undefined, errMsg);
          return;
      }
    }
  };

  useEffect(() => {
    setIsLoading(true);
    encodeErc20DataAndCreateTx();
    getSpenderData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedEncodedData(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedEncodedData]);

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  return (
    <SwapCryptoApproveErc20Container>
      {context === 'swapCrypto' && (
        <ViewContainer>
          <TextAlign align={'left'}>
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
        </ViewContainer>
      )}
      <ScrollView>
        <ViewContainer>
          <ItemDivisor />
          <RowDataContainer>
            <DataLabel>{t('Approving')}</DataLabel>
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
                <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
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
                <DataLabel>{t('Allowance to approve')}</DataLabel>
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
                    <DataLabel>{t('Miner Fee')}</DataLabel>
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
                <DataLabel>{t('Token Contract Address')}</DataLabel>
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
                  <DataLabel>{t('Spender Contract Address')}</DataLabel>
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
                      dispatch(viewOnBlockchain(wallet, spenderData.address))
                    }>
                    {t('View Contract')}
                  </ContractLink>
                </LinkContainer>
              </ContractHeaderContainer>
              <ContractAddressText
                style={{
                  marginBottom: spenderDataWhiteList?.spenderVerified ? 5 : 16,
                }}>
                {spenderData.address}
              </ContractAddressText>

              {spenderDataWhiteList?.spenderVerified ? (
                <>
                  <RowDataContainer>
                    <DataLabel>{t('Site URL')}</DataLabel>
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
                  <DataLabel>{t('Encoded Data')}</DataLabel>
                  {copiedEncodedData ? <CopiedSvg width={17} /> : null}
                </ContractHeaderContainer>
                <ContractAddressText style={{marginBottom: 16}}>
                  {encodedData}
                </ContractAddressText>
              </TouchableOpacity>
            </>
          )}
        </ViewContainer>
      </ScrollView>
      {ctxp ? (
        <SwipeButton
          title={'Slide to approve'}
          onSwipeComplete={() => {
            try {
              logger.debug('Swipe completed. Making payment...');
              makePayment();
            } catch (err) {}
          }}
          forceReset={resetSwipeButton}
        />
      ) : null}
    </SwapCryptoApproveErc20Container>
  );
};

export default SwapCryptoApproveErc20;
