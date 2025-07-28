import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {FlashList} from '@shopify/flash-list';
import styled from 'styled-components/native';
import {
  Recipient,
  TransactionOptionsContext,
  Utxo,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {
  BaseText,
  H5,
  H7,
  HeaderTitle,
  Link,
  ListItemSubText,
} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {WalletGroupParamList} from '../WalletGroup';
import {
  ActiveOpacity,
  Column,
  CtaContainer as _CtaContainer,
  Hr,
  RowContainer,
  SettingIcon,
} from '../../../components/styled/Containers';
import {GetUtxos} from '../../../store/wallet/effects/transactions/transactions';
import haptic from '../../../components/haptic-feedback/haptic';
import InputSelectionRow from '../../../components/list/InputsRow';
import {GetPrecision} from '../../../store/wallet/utils/currency';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import Button from '../../../components/button/Button';
import {LayoutAnimation} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {SatToUnit} from '../../../store/wallet/effects/amount/amount';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {
  convertToFiat,
  formatFiatAmount,
  sleep,
} from '../../../utils/helper-methods';
import {GetMinFee} from '../../../store/wallet/effects/fee/fee';
import _ from 'lodash';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {
  buildUIFormattedWallet,
  toFiat,
} from '../../../store/wallet/utils/wallet';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import Question from '../../../../assets/img/settings/feedback/question.svg';
import {ScrollView} from 'react-native-gesture-handler';
import {WalletRowProps} from '../../../components/list/WalletRow';
import BalanceDetailsModal from '../components/BalanceDetailsModal';

export const CurrencyColumn = styled(Column)`
  margin-left: 8px;
`;

const SectionContainer = styled.View`
  margin-bottom: 10px;
`;

const ItemRowContainer = styled.View`
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  height: 55px;
`;

const SelectInputsContainer = styled.SafeAreaView`
  flex: 1;
`;

const AvailableInputsTitle = styled(H5)`
  margin-bottom: 10px;
`;

const SelectInputsDetailsContainer = styled.View`
  margin-top: 20px;
  padding: 0 15px;
`;

const InputSelectionRowContainer = styled.View`
  padding: 0 15px;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 0px 16px 10px 16px;
`;

const DropdownRow = styled(TouchableOpacity)`
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: nowrap;
  height: 48px;
`;

const DropdownTitle = styled.View`
  flex-direction: row;
  justify-content: flex-start;
`;

export const InputTouchableContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 71px;
`;

const AvailableInputsContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

export interface SelectInputsParamList {
  wallet: Wallet;
  recipient: Recipient;
}

export interface UtxoWithFiatAmount extends Utxo {
  fiatAmount?: string;
  network?: string;
}

const SelectInputs = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {t} = useTranslation();
  const route = useRoute<RouteProp<WalletGroupParamList, 'SelectInputs'>>();
  const useUnconfirmedFunds = useAppSelector(
    ({WALLET}) => WALLET.useUnconfirmedFunds,
  );
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const feeLevel = useAppSelector(({WALLET}) => WALLET.feeLevel);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const [inputs, setInputs] = useState<UtxoWithFiatAmount[]>([]);
  const [lockedUtxos, setLockedUtxos] = useState<UtxoWithFiatAmount[]>([]);
  const [hideLockedUtxos, setHideLockedUtxos] = useState<boolean>(true);
  const [uiFormattedWallet, setUiFormattedWallet] = useState<WalletRowProps>();
  const [showBalanceDetailsModal, setShowBalanceDetailsModal] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const {wallet, recipient} = route.params;
  const {currencyAbbreviation, chain, network, tokenAddress} = wallet;
  const precision = dispatch(
    GetPrecision(currencyAbbreviation, chain, tokenAddress),
  );
  const [totalAmount, setTotalAmount] = useState(
    Number(0).toFixed(precision?.unitDecimals),
  );
  const [totalFiatAmount, setTotalFiatAmount] = useState<string>();

  const logger = useLogger();

  const init = async () => {
    try {
      let utxos = await GetUtxos(wallet);
      if (!useUnconfirmedFunds) {
        utxos = utxos.filter(u => u.confirmations !== 0);
      }

      const utxosWithFiatAmount = utxos.map(utxo => ({
        ...utxo,
        fiatAmount: formatFiatAmount(
          convertToFiat(
            dispatch(
              toFiat(
                utxo.satoshis,
                defaultAltCurrency.isoCode,
                currencyAbbreviation,
                chain,
                rates,
                tokenAddress,
              ),
            ),
            false,
            false,
            network,
          ),
          defaultAltCurrency.isoCode,
        ),
        network,
      }));

      const [_lockedUtxos, _availableUtxos] = [
        utxosWithFiatAmount.filter(u => u.locked),
        utxosWithFiatAmount.filter(u => !u.locked),
      ];
      setLockedUtxos(_.orderBy(_lockedUtxos, 'amount', 'desc'));
      setInputs(_.orderBy(_availableUtxos, 'amount', 'desc'));
    } catch (err) {
      logger.error(`An error occurred while getting utxos: ${err}`);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Select Inputs')}</HeaderTitle>,
    });
  }, [navigation, t]);

  useEffect(() => {
    if (!precision) {
      return;
    }
    const totalSat = Number(totalAmount) * precision.unitToSatoshi;
    setTotalFiatAmount(
      formatFiatAmount(
        convertToFiat(
          dispatch(
            toFiat(
              totalSat,
              defaultAltCurrency.isoCode,
              currencyAbbreviation,
              chain,
              rates,
              tokenAddress,
            ),
          ),
          false,
          false,
          network,
        ),
        defaultAltCurrency.isoCode,
      ),
    );
  }, [totalAmount]);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const _uiFormattedWallet = buildUIFormattedWallet(
      wallet,
      defaultAltCurrency.isoCode,
      rates,
      dispatch,
      'symbol',
    );
    setUiFormattedWallet(_uiFormattedWallet);
  }, [lockedUtxos]);

  const inputsSelectAll = (UtxosWithFiatAmount: UtxoWithFiatAmount[]) => {
    let totalAmount = 0;
    const updatedUtxos = UtxosWithFiatAmount.map(utxo => {
      totalAmount += Number(utxo.amount);
      return {...utxo, checked: !utxo.checked};
    });
    setInputs(updatedUtxos);
    if (selectAll) {
      setTotalAmount(Number(0).toFixed(precision?.unitDecimals));
      setSelectAll(false);
    } else {
      setTotalAmount(Number(totalAmount).toFixed(precision!.unitDecimals));
      setSelectAll(true);
    }
  };

  const inputToggled = useCallback(
    (item: UtxoWithFiatAmount, index: number) => {
      setInputs(prevInputs => {
        prevInputs[index] = item;
        return prevInputs;
      });
      setTotalAmount(prevTotalAmountStr => {
        let prevTotalAmount = Number(prevTotalAmountStr);
        if (item.checked) {
          prevTotalAmount += item.amount;
        } else {
          prevTotalAmount -= item.amount;
        }
        return Number(prevTotalAmount).toFixed(precision!.unitDecimals);
      });
    },
    [precision],
  );

  const renderItem = useCallback(
    ({item, index}: {item: UtxoWithFiatAmount; index: number}) => (
      <InputSelectionRowContainer>
        <InputSelectionRow
          item={item}
          emit={inputToggled}
          unitCode={precision?.unitCode}
          index={index}
        />
        <Hr />
      </InputSelectionRowContainer>
    ),
    [inputToggled, precision],
  );

  const goToConfirmView = async () => {
    try {
      haptic('impactLight');
      dispatch(startOnGoingProcessModal('LOADING'));
      const selectedInputs = inputs.filter(input => input.checked);
      logger.debug(
        `Estimating fee for: ${selectedInputs.length} selected inputs - feeLevel: ${feeLevel[currencyAbbreviation]}`,
      );
      const estimatedFee = await GetMinFee(
        wallet,
        1,
        selectedInputs.length,
        feeLevel[currencyAbbreviation],
      );
      logger.debug(`Estimated fee: ${estimatedFee}`);
      const formattedEstimatedFee = dispatch(
        SatToUnit(estimatedFee, currencyAbbreviation, chain, tokenAddress),
      );

      const amount = Number(totalAmount) - formattedEstimatedFee!;
      const tx = {
        wallet,
        recipient,
        inputs: inputs.filter(i => i.checked),
        amount,
        fee: estimatedFee,
        context: 'selectInputs' as TransactionOptionsContext,
      };
      const {txDetails, txp} = (await dispatch<any>(
        createProposalAndBuildTxDetails(tx),
      )) as any;
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      navigation.navigate('Confirm', {
        wallet,
        recipient,
        txp,
        txDetails,
        amount,
        inputs,
      });
    } catch (err: any) {
      const errorMessageConfig = await dispatch(
        handleCreateTxProposalError(err),
      );
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: false,
        }),
      );
    }
  };

  const memoizedLockedUtxosList = useMemo(
    () => (
      <>
        <DropdownRow
          activeOpacity={ActiveOpacity}
          onPress={() => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setHideLockedUtxos(!hideLockedUtxos);
            // onPress();
          }}>
          <DropdownTitle>
            <H5>{t('Locked Inputs') + ' ' + '(' + lockedUtxos.length + ')'}</H5>
            <TouchableOpacity
              style={{marginLeft: 10}}
              onPress={() => {
                setShowBalanceDetailsModal(true);
              }}>
              <Question width={24} height={24} />
            </TouchableOpacity>
          </DropdownTitle>
          <SettingIcon suffix>
            {!hideLockedUtxos ? <ChevronDownSvg /> : <ChevronUpSvg />}
          </SettingIcon>
        </DropdownRow>
        <ScrollView style={{marginBottom: 10, maxHeight: 225}}>
          {!hideLockedUtxos
            ? lockedUtxos.map(
                (lockedUtxo: UtxoWithFiatAmount, index: number) => {
                  return (
                    <RowContainer
                      key={index}
                      activeOpacity={ActiveOpacity}
                      style={{paddingLeft: 0, paddingRight: 0}}>
                      <Column>
                        <H5>
                          {lockedUtxo.amount}{' '}
                          {precision?.unitCode?.toUpperCase()}{' '}
                        </H5>
                        {/* <Hr /> */}
                        {lockedUtxo.network !== 'testnet' ? (
                          <ListItemSubText textAlign={'left'}>
                            {lockedUtxo.fiatAmount}
                          </ListItemSubText>
                        ) : null}
                        <ListItemSubText
                          numberOfLines={1}
                          ellipsizeMode={'middle'}>
                          {lockedUtxo.address}
                        </ListItemSubText>
                      </Column>
                    </RowContainer>
                  );
                },
              )
            : null}
        </ScrollView>
        {/* workaround to prevent weird behaviour with dropdown animation */}
        {!hideLockedUtxos ? (
          <AvailableInputsTitle>{t('Available Inputs')}</AvailableInputsTitle>
        ) : null}
      </>
    ),
    [lockedUtxos, hideLockedUtxos],
  );

  return (
    <SelectInputsContainer>
      <SelectInputsDetailsContainer>
        <SectionContainer>
          <H5 style={{marginBottom: 10}}>{t('Total Selected Inputs')}</H5>
          <ItemRowContainer
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}>
            <H5>
              {Number(totalAmount)} {precision?.unitCode.toUpperCase()}
            </H5>
            <BaseText>
              {network !== 'testnet'
                ? totalFiatAmount
                : t('Test Only - No Value')}
            </BaseText>
          </ItemRowContainer>
          <Hr />
        </SectionContainer>
        {lockedUtxos.length > 0 ? memoizedLockedUtxosList : null}
        {hideLockedUtxos ? (
          <AvailableInputsContainer>
            <AvailableInputsTitle>{t('Available Inputs')}</AvailableInputsTitle>
            <Link
              onPress={() => {
                inputsSelectAll(inputs);
              }}>
              {t('Select All')}
            </Link>
          </AvailableInputsContainer>
        ) : null}
      </SelectInputsDetailsContainer>
      {inputs && inputs.length ? (
        <FlashList
          contentContainerStyle={{paddingBottom: 20}}
          estimatedItemSize={94}
          data={inputs}
          keyExtractor={(_item, index) => index.toString()}
          renderItem={({item, index}: {item: Utxo; index: number}) =>
            renderItem({item, index})
          }
        />
      ) : (
        <>
          <ItemRowContainer style={{paddingHorizontal: 15}}>
            <H7>{t('No available inputs.')}</H7>
          </ItemRowContainer>
          <Hr />
        </>
      )}
      <CtaContainer>
        <Button
          buttonStyle={'primary'}
          onPress={goToConfirmView}
          disabled={!inputs.filter(i => i.checked).length}>
          {t('Continue')}
        </Button>
      </CtaContainer>

      {wallet && uiFormattedWallet ? (
        <BalanceDetailsModal
          isVisible={showBalanceDetailsModal}
          closeModal={() => setShowBalanceDetailsModal(false)}
          wallet={uiFormattedWallet}
        />
      ) : null}
    </SelectInputsContainer>
  );
};
export default SelectInputs;
