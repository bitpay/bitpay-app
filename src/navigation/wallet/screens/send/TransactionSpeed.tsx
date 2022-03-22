import React, {useEffect, useState} from 'react';
import {H4, H6} from '../../../../components/styled/Text';
import {Fee, getFeeLevels} from '../../../../store/wallet/effects/fee/fee';
import {useNavigation} from '@react-navigation/native';
import {Wallet} from '../../../../store/wallet/wallet.models';
import * as _ from 'lodash';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {CustomErrorMessage} from '../../components/ErrorMessages';
import {useAppDispatch} from '../../../../utils/hooks';
import {GetFeeUnits, IsERCToken} from '../../../../store/wallet/utils/currency';
import styled from 'styled-components/native';
import TransactionSpeedRow, {SpeedOptionRow} from '../../../../components/list/TransactionSpeedRow';
import {
  ActiveOpacity, CtaContainer, Hr, ImportTextInput, Row,
  SheetContainer,
  WIDTH,
} from '../../../../components/styled/Containers';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import Back from '../../../../components/back/Back';
import {TouchableOpacity} from 'react-native';
import {DetailColumn, DetailsList} from "./confirm/Shared";
import Checkbox from "../../../../components/checkbox/Checkbox";
import Button, {ButtonState} from "../../../../components/button/Button";

export type TransactionSpeedParamList = {
  feeLevel: string;
  wallet: Wallet;
  isSpeedUpTx?: boolean;
  customFeePerKB?: number;
  feePerSatByte?: string;
  isVisible: boolean;
  onCloseModal: (level?: any) => void;
};

interface FeeOpts {
  feeUnit: string;
  feeUnitAmount: number;
  blockTime: number;
  disabled?: boolean;
}

enum ethAvgTime {
  normal = '<5m',
  priority = '<2m',
  urgent = 'ASAP',
}

const TxSpeedContainer = styled(SheetContainer)`
  flex: 1;
  justify-content: flex-start;
  margin-top: 20px;
  padding: 20px 0;
`;

const SheetHeaderContainer = styled.View`
  margin-bottom: 20px;
  align-items: center;
  flex-direction: row;
`;

const TitleContainer = styled.View`
  justify-content: center;
  align-items: center;
  width: ${WIDTH - 110}px;
`;

const OptionsContainer = styled.View``;

const GetFeeOpts: any = (currencyAbbreviation: string) => {
  const isEthOrToken =
    currencyAbbreviation == 'eth' || IsERCToken(currencyAbbreviation);
  return {
    urgent: isEthOrToken ? 'High' : 'Urgent',
    priority: isEthOrToken ? 'Average' : 'Priority',
    normal: isEthOrToken ? 'Low' : 'Normal',
    economy: 'Economy',
    superEconomy: 'Super Economy',
    custom: 'Custom',
  };
};

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
  const [feePerSatByte, setFeePerSatByte] = useState(paramFeePerSatByte);
  const [customSatPerByte, setCustomSatPerByte] = useState<number>();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpeed, setSelectedSpeed] = useState(feeLevel);
  const [buttonState, setButtonState] = useState<ButtonState>();

  const setSpeedUpMinFee = (_feeLevels: Fee[]) => {
    const minFeeLevel = coin === 'btc' ? 'custom' : 'priority';
    let feeLevelsAllowed: Fee[] = [];
    if (coin === 'btc') {
      feeLevelsAllowed = _feeLevels.filter(
        (f: Fee) => f.feePerKb >= customFeePerKB,
      );
      const _speedUpMinFeePerKb = feeLevelsAllowed.length
        ? // @ts-ignore
          _.minBy(feeLevesAllowed, 'feePerKb').feePerKb
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
    _feeLevels.forEach((fee: Fee, i: number) => {
      const {feePerKb, level, nbBlocks} = fee;
      const feeOption: any = {
        ...fee,
        feeUnit,
        uiLevel: GetFeeOpts(coin)[level],
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
        const _feePerSatByte = (feePerKb / feeUnitAmount).toFixed();
        setFeePerSatByte(_feePerSatByte);
      }

      if (isSpeedUpTx) {
        feeOption.disabled = speedUpMinFeePerKb || feePerKb < 0;
      }

      _feeOptions.push(feeOption);
    });

    setFeeOptions(_feeOptions);
    setIsLoading(false);
    //    TODO: Warnings
  };

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

      if (isSpeedUpTx) {
        setSpeedUpMinFee(_feeLevels);
      }

      setFeeRate(_feeLevels);
      if (customFeePerKB) {
        setCustomSatPerByte(customFeePerKB / feeUnitAmount);
      }
    } catch (e) {}
  };

  useEffect(() => {
    init();
  }, [wallet]);

  const onClose = () => {
    onCloseModal();
  };

  const onSetCustomFee = () => {
    setSelectedSpeed('custom');
  }

  const onApply = () => {
    onCloseModal(selectedSpeed);
  }

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onClose}>
      <TxSpeedContainer>
        <SheetHeaderContainer>
          <TouchableOpacity activeOpacity={ActiveOpacity} onPress={onCloseModal}>
            <Back opacity={1} />
          </TouchableOpacity>
          <TitleContainer>
            <H4>Transaction Speed</H4>
          </TitleContainer>
        </SheetHeaderContainer>

        <OptionsContainer>
          {feeOptions && feeOptions.length > 0
            ? <>{feeOptions.map((fee, i) => (
                <TransactionSpeedRow
                  key={fee.level}
                  fee={fee}
                  onPress={(selectedFee) => {
                    setSelectedSpeed(selectedFee.level);
                  }}
                  selectedSpeed={selectedSpeed}
                  isFirst={i === 0}
                />

              ))

          }
                <DetailsList>
                  <SpeedOptionRow
                      activeOpacity={ActiveOpacity}
                      onPress={() => onSetCustomFee()}>
                    <Row>
                      <H6 style={{marginRight: 10}}>
                        Custom fee
                      </H6>
                      <H6 medium={true}>
                        in {feeUnit}
                      </H6>
                    </Row>

                    <Row style={{justifyContent: 'flex-end', alignItems: 'center'}}>
                      <Checkbox
                          radio={true}
                          onPress={() => onSetCustomFee()}
                          checked={selectedSpeed === 'custom'}
                      />
                    </Row>

                  </SpeedOptionRow>

                  {selectedSpeed === 'custom' ? <>
                    <ImportTextInput>

                    </ImportTextInput>

                  </> : null}

                  <Hr/>


                </DetailsList>

                <CtaContainer>
                  <Button onPress={() => onApply()} state={buttonState}>Apply</Button>
                </CtaContainer>
              </>
            : null}
        </OptionsContainer>



      </TxSpeedContainer>
    </SheetModal>
  );
};

export default TransactionSpeed;
