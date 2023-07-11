import React, {useEffect, useState} from 'react';
import {
  BaseText,
  H4,
  H7,
  HeaderTitle,
  Paragraph,
} from '../../../../components/styled/Text';
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
import {GetFeeUnits} from '../../../../store/wallet/utils/currency';
import styled from 'styled-components/native';
import {
  ActionContainer,
  CtaContainer,
  ScreenGutter,
  Setting,
  SettingTitle,
  SheetContainer,
} from '../../../../components/styled/Containers';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import Button from '../../../../components/button/Button';
import {Caution, SlateDark, White} from '../../../../styles/colors';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {useTranslation} from 'react-i18next';
import BoxInput from '../../../../components/form/BoxInput';
import {SUPPORTED_EVM_COINS} from '../../../../constants/currencies';
import Checkbox from '../../../../components/checkbox/Checkbox';

const CIRCLE_SIZE = 20;

export type TransactionSpeedParamList = {
  feeLevel: string;
  wallet: Wallet;
  isSpeedUpTx?: boolean;
  customFeePerKB?: number;
  feePerSatByte?: number;
  isVisible: boolean;
  onCloseModal: (level?: string, customFeePerKB?: number) => void;
};

export enum evmAvgTime {
  normal = 'within 5 minutes',
  priority = 'within 2 minutes',
  urgent = 'ASAP',
}

const CloseButton = styled.TouchableOpacity`
  margin: auto;
`;

const CloseButtonText = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? White : Caution)};
`;

const TxSpeedContainer = styled(SheetContainer)`
  flex: 1;
  justify-content: flex-start;
  margin-top: 0;
  padding: 0 0 20px 0;
`;

const TxSpeedScroll = styled.ScrollView`
  padding: 0px 8px;
  margin-left: ${ScreenGutter};
`;

const SheetHeaderContainer = styled.View`
  margin: 15px;
  align-items: center;
  flex-direction: row;
`;

const TitleContainer = styled.View`
  justify-content: center;
  align-items: center;
  width: 95%;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
`;

export const FeeLevelStep = styled.View<{isLast?: boolean}>`
  flex-direction: row;
`;

const TxSpeedParagraph = styled(Paragraph)`
  margin: 0 ${ScreenGutter} ${ScreenGutter};
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

export const FeeLevelStepsHeader = styled.View`
  flex-direction: row;
  align-items: center;
`;

const StepsHeaderContainer = styled.View`
  margin: ${ScreenGutter} ${ScreenGutter} 0;
`;

const CurrencyImageContainer = styled.View`
  margin-right: 10px;
`;

export const FeeLevelStepsHeaderSubTitle = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  padding-top: 5px;
  min-height: 30px;
`;

const FEE_MIN = 0;
const FEE_MULTIPLIER = 10;

const TransactionLevel = ({
  isVisible,
  onCloseModal,
  wallet,
  isSpeedUpTx,
  customFeePerKB = 0,
  feeLevel,
  feePerSatByte: paramFeePerSatByte,
}: TransactionSpeedParamList) => {
  const {img, currencyAbbreviation, network, chain} = wallet;
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const [speedUpMinFeePerKb, setSpeedUpMinFeePerKb] = useState<number>();
  const {feeUnit, feeUnitAmount, blockTime} = dispatch(
    GetFeeUnits(currencyAbbreviation, chain),
  );
  const [feeOptions, setFeeOptions] = useState<any[]>();
  const [feePerSatByte, setFeePerSatByte] = useState<
    number | string | undefined
  >(paramFeePerSatByte);
  const [selectedLevel, setSelectedLevel] = useState(feeLevel);
  const [customSatsPerByte, setCustomSatsPerByte] = useState(
    feePerSatByte ? feePerSatByte + '' : undefined,
  );
  const [error, setError] = useState<string | undefined>();
  const [disableApply, setDisableApply] = useState(false);
  const [maxFeeRecommended, setMaxFeeRecommended] = useState<number>();
  const [minFeeRecommended, setMinFeeRecommended] = useState<number>();
  const minFeeAllowed = FEE_MIN;
  const [maxFeeAllowed, setMaxFeeAllowed] = useState<number>();

  const setSpeedUpMinFee = (_feeLevels: Fee[]): number | undefined => {
    const minFeeLevel = currencyAbbreviation === 'btc' ? 'custom' : 'priority';
    let feeLevelsAllowed: Fee[] = [];
    let _speedUpMinFeePerKb;
    if (currencyAbbreviation === 'btc') {
      feeLevelsAllowed = _feeLevels.filter(
        (f: Fee) => f.feePerKb >= customFeePerKB,
      );
      _speedUpMinFeePerKb = feeLevelsAllowed.length
        ? // @ts-ignore
          _.minBy(feeLevelsAllowed, 'feePerKb').feePerKb
        : customFeePerKB;
      setSpeedUpMinFeePerKb(_speedUpMinFeePerKb);
    } else {
      const {feePerKb} =
        _feeLevels.find((f: Fee) => f.level === minFeeLevel) || {};
      if (feePerKb) {
        _speedUpMinFeePerKb = feePerKb;
        setSpeedUpMinFeePerKb(feePerKb);
      }
    }
    return _speedUpMinFeePerKb;
  };

  const setFeeRate = (_feeLevels: Fee[]) => {
    let _speedUpMinFeePerKb: number | undefined;
    if (isSpeedUpTx) {
      _speedUpMinFeePerKb = setSpeedUpMinFee(_feeLevels);
    }

    let _feeOptions: any[] = [];
    _feeLevels.forEach((fee: Fee) => {
      const {feePerKb, level, nbBlocks} = fee;
      const feeOption: any = {
        ...fee,
        feeUnit,
        // @ts-ignore
        uiLevel: GetFeeOptions(chain)[level],
      };

      feeOption.feePerSatByte = (feePerKb / feeUnitAmount).toFixed();
      feeOption.uiFeePerSatByte = `${feeOption.feePerSatByte} ${
        currencyAbbreviation === 'btc' ? t('Satoshis per byte') : feeUnit
      }`;

      if (SUPPORTED_EVM_COINS.includes(chain)) {
        // @ts-ignore
        feeOption.avgConfirmationTime = evmAvgTime[level];
      } else {
        const min = nbBlocks * blockTime;
        const hours = Math.floor(min / 60);
        feeOption.avgConfirmationTime =
          hours > 0
            ? hours === 1
              ? t('within an hour')
              : t('within hours', {hours})
            : t('within minutes', {min});
      }

      if (level === feeLevel) {
        setFeePerSatByte((feePerKb / feeUnitAmount).toFixed());
      }

      if (isSpeedUpTx && _speedUpMinFeePerKb) {
        feeOption.disabled = _speedUpMinFeePerKb > feePerKb;
      }

      _feeOptions.push(feeOption);
    });

    _feeOptions = _feeOptions.reverse();
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
            CustomErrorMessage({errMsg: t('Could not get fee levels')}),
          ),
        );
        return;
      }

      setFeeLevels(feeLevels);
      setFeeRate(_feeLevels);
      if (customFeePerKB) {
        setCustomSatsPerByte((customFeePerKB / feeUnitAmount).toFixed());
      }
    } catch (e) {}
  };

  const checkFees = (
    customFeePerSatByte: string | number | undefined,
  ): void => {
    setError(undefined);
    const fee = Number(customFeePerSatByte);

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

      if (isSpeedUpTx) {
        setDisableApply(true);
        return;
      }
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
    setSelectedLevel(feeLevel);
  };

  const onApply = () => {
    if (selectedLevel === 'custom' && customSatsPerByte) {
      const _customFeePerKB = Number(
        (+customSatsPerByte * feeUnitAmount).toFixed(),
      );

      if (error === 'showMinWarning') {
        dispatch(
          showBottomNotificationModal(
            MinFeeWarning(() => {
              onCloseModal(selectedLevel, _customFeePerKB);
            }),
          ),
        );
        return;
      }
      onCloseModal(selectedLevel, _customFeePerKB);
    } else {
      onCloseModal(selectedLevel);
    }
  };

  const setFeesRecommended = (_feeLevels: Fee[]): void => {
    let {minValue, maxValue} = getRecommendedFees(_feeLevels);
    setMaxFeeRecommended(maxValue);
    setMinFeeRecommended(minValue);
    setMaxFeeAllowed(maxValue * FEE_MULTIPLIER);
  };

  const getRecommendedFees = (
    _feeLevels: Fee[],
  ): {minValue: number; maxValue: number} => {
    const value = _feeLevels.map(({feePerKb}: Fee) => feePerKb);
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

  const getSelectedFeeOption = () => {
    return feeOptions?.find(({level}) => level === selectedLevel);
  };

  return (
    <SheetModal
      isVisible={isVisible}
      onBackdropPress={onClose}
      placement={'bottom'}
      fullScreen={false}
      useMaxHeight={'100%'}>
      <TxSpeedContainer>
        <TxSpeedScroll>
          <SheetHeaderContainer>
            <TitleContainer>
              <HeaderTitle>{t('Transaction Speed')}</HeaderTitle>
            </TitleContainer>
          </SheetHeaderContainer>

          <TxSpeedParagraph>
            {t(
              'The higher the fee, the greater the incentive a miner has to include that transaction in a block. Current fees are determined based on network load and the selected policy.',
            )}
          </TxSpeedParagraph>

          {feeOptions && feeOptions.length > 0 ? (
            <>
              <StepsHeaderContainer>
                <FeeLevelStepsHeader>
                  <CurrencyImageContainer>
                    <CurrencyImage img={img} size={20} />
                  </CurrencyImageContainer>
                  <H4>
                    {chain.charAt(0).toUpperCase() + chain.slice(1)}{' '}
                    {t('Network Fee Policy')}
                  </H4>
                </FeeLevelStepsHeader>

                <FeeLevelStepsHeaderSubTitle>
                  {selectedLevel === 'custom' && customSatsPerByte
                    ? `${customSatsPerByte} ${feeUnit}`
                    : null}
                  {selectedLevel !== 'custom'
                    ? `${getSelectedFeeOption()?.uiFeePerSatByte} ${
                        getSelectedFeeOption()?.avgConfirmationTime
                      }`
                    : null}
                </FeeLevelStepsHeaderSubTitle>

                {feeOptions.map((fee, i) => (
                  <Setting key={i}>
                    <SettingTitle>{fee.uiLevel}</SettingTitle>
                    <Checkbox
                      radio={true}
                      onPress={() => {
                        if (selectedLevel !== fee.level) {
                          setDisableApply(false);
                          setSelectedLevel(fee.level);
                        }
                      }}
                      checked={fee.level === selectedLevel}
                    />
                  </Setting>
                ))}
              </StepsHeaderContainer>
              {selectedLevel === 'custom' ? (
                <ActionContainer>
                  <BoxInput
                    keyboardType={'number-pad'}
                    type="number"
                    value={customSatsPerByte}
                    onChangeText={(text: string) => {
                      checkFees(text);
                      setCustomSatsPerByte(text);
                    }}
                  />
                  {error === 'required' ? (
                    <ErrorText>{t('Fee is required')}.</ErrorText>
                  ) : null}
                  {error === 'showMinWarning' ? (
                    <ErrorText>{t('Fee is lower than recommended.')}</ErrorText>
                  ) : null}
                  {error === 'showMaxWarning' ? (
                    <ErrorText>
                      {t('Fee should not be higher than ') +
                        maxFeeRecommended +
                        ' ' +
                        feeUnit +
                        '.'}
                    </ErrorText>
                  ) : null}
                  {error === 'showMinError' ? (
                    <ErrorText>
                      {t('Fee should be higher than ') +
                        minFeeAllowed +
                        ' ' +
                        feeUnit +
                        '.'}
                    </ErrorText>
                  ) : null}
                  {error === 'showMaxError' ? (
                    <ErrorText>
                      {t('Fee Should be lesser than ') +
                        maxFeeAllowed +
                        ' ' +
                        feeUnit +
                        '.'}
                    </ErrorText>
                  ) : null}
                </ActionContainer>
              ) : null}

              <CtaContainer>
                <Button onPress={() => onApply()} disabled={disableApply}>
                  {t('Apply')}
                </Button>
              </CtaContainer>
              <CloseButton onPress={() => onClose()}>
                <CloseButtonText>{t('CLOSE')}</CloseButtonText>
              </CloseButton>
            </>
          ) : null}
        </TxSpeedScroll>
      </TxSpeedContainer>
    </SheetModal>
  );
};

export default TransactionLevel;
