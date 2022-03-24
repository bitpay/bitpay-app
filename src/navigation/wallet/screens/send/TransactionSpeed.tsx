import React, {useEffect, useState} from 'react';
import {BaseText, H4, H6} from '../../../../components/styled/Text';
import {
  Fee,
  getFeeLevels,
  GetFeeOptions,
} from '../../../../store/wallet/effects/fee/fee';
import {Wallet} from '../../../../store/wallet/wallet.models';
import * as _ from 'lodash';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {
  CustomErrorMessage,
  MinFeeWarning,
} from '../../components/ErrorMessages';
import {useAppDispatch} from '../../../../utils/hooks';
import {GetFeeUnits, IsERCToken} from '../../../../store/wallet/utils/currency';
import styled from 'styled-components/native';
import TransactionSpeedRow, {
  SpeedOptionRow,
} from '../../../../components/list/TransactionSpeedRow';
import {
  ActionContainer,
  ActiveOpacity,
  CtaContainer,
  Hr,
  Row,
  SheetContainer,
  WIDTH,
} from '../../../../components/styled/Containers';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import Back from '../../../../components/back/Back';
import {TouchableOpacity, View} from 'react-native';
import {DetailsList} from './confirm/Shared';
import Checkbox from '../../../../components/checkbox/Checkbox';
import Button from '../../../../components/button/Button';
import {Caution, Slate} from '../../../../styles/colors';

export type TransactionSpeedParamList = {
  feeLevel: string;
  wallet: Wallet;
  isSpeedUpTx?: boolean;
  customFeePerKB?: number;
  feePerSatByte?: number;
  isVisible: boolean;
  onCloseModal: (level?: string, customFeePerKB?: number) => void;
};

enum ethAvgTime {
  normal = '<5m',
  priority = '<2m',
  urgent = 'ASAP',
}

const TxSpeedContainer = styled(SheetContainer)`
  flex: 1;
  justify-content: flex-start;
  margin-top: 0px;
  padding: 20px 0;
`;

const SheetHeaderContainer = styled.View`
  margin: 20px 0;
  align-items: center;
  flex-direction: row;
`;

const TitleContainer = styled.View`
  justify-content: center;
  align-items: center;
  width: ${WIDTH - 110}px;
`;

export const TextInput = styled.TextInput`
  height: 50px;
  color: ${({theme}) => theme.colors.text};
  background: ${({theme}) => theme.colors.background};
  border: 0.75px solid ${Slate};
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
  padding: 5px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
`;

const FEE_MIN = 0;
const FEE_MULTIPLIER = 10;

const TransactionSpeed = ({
  isVisible,
  onCloseModal,
  wallet,
  isSpeedUpTx,
  customFeePerKB = 0,
  feeLevel,
  feePerSatByte: paramFeePerSatByte,
}: TransactionSpeedParamList) => {
  const {coin, network} = wallet.credentials;
  const dispatch = useAppDispatch();

  const [speedUpMinFeePerKb, setSpeedUpMinFeePerKb] = useState<number>();
  const {feeUnit, feeUnitAmount, blockTime} = GetFeeUnits(coin);
  const [feeOptions, setFeeOptions] = useState<any[]>();
  const [feePerSatByte, setFeePerSatByte] = useState<
    number | string | undefined
  >(paramFeePerSatByte);
  const [selectedSpeed, setSelectedSpeed] = useState(feeLevel);
  const [customSatsPerByte, setCustomSatsPerByte] = useState(
    feePerSatByte ? feePerSatByte + '' : undefined,
  );
  const [error, setError] = useState<string | undefined>();
  const [disableApply, setDisableApply] = useState(false);
  const [maxFeeRecommended, setMaxFeeRecommended] = useState<number>();
  const [minFeeRecommended, setMinFeeRecommended] = useState<number>();
  const minFeeAllowed = FEE_MIN;
  const [maxFeeAllowed, setMaxFeeAllowed] = useState<number>();

  const setSpeedUpMinFee = (_feeLevels: Fee[]) => {
    const minFeeLevel = coin === 'btc' ? 'custom' : 'priority';
    let feeLevelsAllowed: Fee[] = [];
    if (coin === 'btc') {
      feeLevelsAllowed = _feeLevels.filter(
        (f: Fee) => f.feePerKb >= customFeePerKB,
      );
      const _speedUpMinFeePerKb = feeLevelsAllowed.length
        ? // @ts-ignore
          _.minBy(feeLevelsAllowed, 'feePerKb').feePerKb
        : customFeePerKB;
      setSpeedUpMinFeePerKb(_speedUpMinFeePerKb);
    } else {
      const {feePerKb} =
        _feeLevels.find((f: Fee) => f.level === minFeeLevel) || {};
      if (feePerKb) {
        setSpeedUpMinFeePerKb(feePerKb);
      }
    }
  };

  const setFeeRate = (_feeLevels: Fee[]) => {
    const _feeOptions: any[] = [];
    _feeLevels.forEach((fee: Fee) => {
      const {feePerKb, level, nbBlocks} = fee;
      const feeOption: any = {
        ...fee,
        feeUnit,
        uiLevel: GetFeeOptions(coin)[level],
      };

      feeOption.feePerSatByte = (feePerKb / feeUnitAmount).toFixed();
      feeOption.uiFeePerSatByte = `@ ${feeOption.feePerSatByte} ${feeUnit}`;

      if (coin === 'eth' || IsERCToken(coin)) {
        // @ts-ignore
        feeOption.avgConfirmationTime = ethAvgTime[level];
      } else {
        const min = nbBlocks * blockTime;
        const hours = Math.floor(min / 60);
        feeOption.avgConfirmationTime =
          hours > 0
            ? hours === 1
              ? 'an hour'
              : `${hours} hours`
            : `${min} minutes`;
      }

      if (level === feeLevel) {
        setFeePerSatByte((feePerKb / feeUnitAmount).toFixed());
      }

      if (isSpeedUpTx) {
        feeOption.disabled = speedUpMinFeePerKb || feePerKb < 0;
      }

      _feeOptions.push(feeOption);
    });

    setFeeOptions(_feeOptions);

    setFeesRecommended(_feeLevels);
    if (feeLevel === 'custom') {
      checkFees(feePerSatByte);
    }
  };

  const [feeLevels, setFeeLevels] = useState<Fee>();

  const init = async () => {
    try {
      const _feeLevels = await getFeeLevels({
        wallet,
        network,
      });

      if (_.isEmpty(_feeLevels)) {
        dispatch(
          showBottomNotificationModal(
            CustomErrorMessage({errMsg: 'Could not get fee levels'}),
          ),
        );
        return;
      }

      setFeeLevels(feeLevels);
      if (isSpeedUpTx) {
        setSpeedUpMinFee(_feeLevels);
      }

      setFeeRate(_feeLevels);
      if (customFeePerKB) {
        setCustomSatsPerByte((customFeePerKB / feeUnitAmount).toFixed());
      }
    } catch (e) {}
  };

  const checkFees = (feePerSatByte: string | number | undefined): void => {
    setError(undefined);
    const fee = Number(feePerSatByte);

    if (!fee) {
      setDisableApply(true);
      setError('required');
      return;
    }

    if (fee < minFeeAllowed) {
      setError('showMinError');
      setDisableApply(true);
      return;
    }

    if (
      fee > minFeeAllowed &&
      minFeeRecommended !== undefined &&
      fee < minFeeRecommended
    ) {
      setError('showMinWarning');
    }

    if (
      maxFeeAllowed &&
      fee <= maxFeeAllowed &&
      maxFeeRecommended !== undefined &&
      fee > maxFeeRecommended
    ) {
      setError('showMaxWarning');
    }

    if (maxFeeAllowed && fee > maxFeeAllowed) {
      setError('showMaxError');
      setDisableApply(true);
      return;
    }

    setDisableApply(false);
    return;
  };

  useEffect(() => {
    init();
  }, [wallet]);

  const onClose = () => {
    onCloseModal();
    setSelectedSpeed(feeLevel);
  };

  const onApply = () => {
    if (selectedSpeed === 'custom' && customSatsPerByte) {
      const customFeePerKB = Number(
        (+customSatsPerByte * feeUnitAmount).toFixed(),
      );

      if (error === 'showMinWarning') {
        dispatch(
          showBottomNotificationModal(
            MinFeeWarning(() => {
              onCloseModal(selectedSpeed, customFeePerKB);
            }),
          ),
        );
        return;
      }
      onCloseModal(selectedSpeed, customFeePerKB);
    } else {
      onCloseModal(selectedSpeed);
    }
  };

  const setFeesRecommended = (feeLevels: Fee[]): void => {
    let {minValue, maxValue} = getRecommendedFees(feeLevels);
    setMaxFeeRecommended(maxValue);
    setMinFeeRecommended(minValue);
    setMaxFeeAllowed(maxValue * FEE_MULTIPLIER);
  };

  const getRecommendedFees = (
    feeLevels: Fee[],
  ): {minValue: number; maxValue: number} => {
    const value = feeLevels.map(({feePerKb}: Fee) => feePerKb);
    const maxValue = Math.max(...value);

    let minValue;
    if (isSpeedUpTx && speedUpMinFeePerKb) {
      minValue = speedUpMinFeePerKb;
    } else {
      minValue = Math.min(...value);
    }

    return {
      maxValue: parseInt((maxValue / feeUnitAmount).toFixed(), 10),
      minValue: parseInt((minValue / feeUnitAmount).toFixed(), 10),
    };
  };

  const onSelectCustomFee = () => {
    setError(undefined);
    setSelectedSpeed('custom');
    if (customSatsPerByte) {
      checkFees(customSatsPerByte);
    }
  };

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onClose}>
      <TxSpeedContainer>
        <SheetHeaderContainer>
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() => onClose()}>
            <Back opacity={1} />
          </TouchableOpacity>
          <TitleContainer>
            <H4>Transaction Speed</H4>
          </TitleContainer>
        </SheetHeaderContainer>

        <View>
          {feeOptions && feeOptions.length > 0 ? (
            <>
              {feeOptions.map((fee, i) => (
                <TransactionSpeedRow
                  key={fee.level}
                  fee={fee}
                  onPress={selectedFee => {
                    setDisableApply(false);
                    setSelectedSpeed(selectedFee.level);
                  }}
                  selectedSpeed={selectedSpeed}
                  isFirst={i === 0}
                />
              ))}
              <DetailsList>
                <SpeedOptionRow
                  activeOpacity={ActiveOpacity}
                  onPress={onSelectCustomFee}>
                  <Row>
                    <H6 style={{marginRight: 10}}>Custom fee</H6>
                    <H6 medium={true}>in {feeUnit}</H6>
                  </Row>

                  <Row
                    style={{justifyContent: 'flex-end', alignItems: 'center'}}>
                    <Checkbox
                      radio={true}
                      onPress={onSelectCustomFee}
                      checked={selectedSpeed === 'custom'}
                    />
                  </Row>
                </SpeedOptionRow>

                {selectedSpeed === 'custom' ? (
                  <ActionContainer>
                    <TextInput
                      keyboardType="numeric"
                      value={customSatsPerByte}
                      onChangeText={(text: string) => {
                        checkFees(text);
                        setCustomSatsPerByte(text);
                      }}
                    />
                    {error === 'required' ? (
                      <ErrorText>Fee is required.</ErrorText>
                    ) : null}
                    {error === 'showMinWarning' ? (
                      <ErrorText>Fee is lower than recommended.</ErrorText>
                    ) : null}
                    {error === 'showMaxWarning' ? (
                      <ErrorText>
                        You should not set a fee higher than {maxFeeRecommended}{' '}
                        {feeUnit}.
                      </ErrorText>
                    ) : null}
                    {error === 'showMinError' ? (
                      <ErrorText>
                        Fee should be higher than {minFeeAllowed} {feeUnit}.
                      </ErrorText>
                    ) : null}
                    {error === 'showMaxError' ? (
                      <ErrorText>
                        Fee Should be lesser than {maxFeeAllowed} {feeUnit}.
                      </ErrorText>
                    ) : null}
                  </ActionContainer>
                ) : null}

                <Hr />
              </DetailsList>

              <CtaContainer>
                <Button onPress={() => onApply()} disabled={disableApply}>
                  Apply {disableApply}
                </Button>
              </CtaContainer>
            </>
          ) : null}
        </View>
      </TxSpeedContainer>
    </SheetModal>
  );
};

export default TransactionSpeed;
