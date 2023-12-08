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
import {GetFeeUnits, GetTheme} from '../../../../store/wallet/utils/currency';
import styled, {useTheme} from 'styled-components/native';
import {
  ActionContainer,
  ActiveOpacity,
  CtaContainer,
  ScreenGutter,
  SheetContainer,
  WIDTH,
} from '../../../../components/styled/Containers';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import Back from '../../../../components/back/Back';
import {TouchableOpacity, View} from 'react-native';
import {DetailsList} from './confirm/Shared';
import Button from '../../../../components/button/Button';
import {
  Caution,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import BoxInput from '../../../../components/form/BoxInput';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SUPPORTED_EVM_COINS} from '../../../../constants/currencies';

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

const TxSpeedContainer = styled(SheetContainer)`
  flex: 1;
  justify-content: flex-start;
  margin-top: 0;
  padding: 0 0 20px 0;
`;

const TxSpeedScroll = styled(KeyboardAwareScrollView)`
  margin-top: 0;
`;

const SheetHeaderContainer = styled.View`
  margin-bottom: 15px;
  align-items: center;
  flex-direction: row;
`;

const TitleContainer = styled.View`
  justify-content: center;
  align-items: center;
  width: ${WIDTH - 110}px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
`;

const StepsContainer = styled.View`
  flex-direction: row;
  margin: ${ScreenGutter};
  padding: 0 3px;
`;

export const FeeLevelStepContainer = styled.View<{length: number}>`
  /* Circle size + horizontal gutter */
  width: ${({length}) => (WIDTH - (CIRCLE_SIZE + 36)) / length}px;
`;

export const FeeLevelStep = styled.View<{isLast?: boolean}>`
  flex-direction: row;
`;

export const FeeLevelStepCircle = styled.Pressable<{
  isActive: boolean;
  backgroundColor: string;
  isDisabled?: boolean;
}>`
  background-color: ${({backgroundColor}) => backgroundColor};
  width: ${CIRCLE_SIZE}px;
  height: ${CIRCLE_SIZE}px;
  border-width: ${({isActive}) => (isActive ? '3px' : 0)};
  border-color: ${White};
  border-radius: 50px;
  transform: ${({isActive}) => (isActive ? 'scale(1.3)' : 'scale(1)')};
  z-index: 1;
  opacity: ${({isDisabled}) => (isDisabled ? 0.7 : 1)};
`;

export const FeeLevelStepLine = styled.View<{backgroundColor: string}>`
  background-color: ${({backgroundColor}) => backgroundColor};
  flex-grow: 1;
  height: 2px;
  align-self: center;
`;

const TopLabelContainer = styled.View`
  min-height: 30px;
`;

const BottomLabelContainer = styled.View`
  justify-content: space-between;
  flex-direction: row;
  margin: 0 ${ScreenGutter};
`;

export const FeeLevelStepBottomLabel = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

export const FeeLevelStepTopLabel = styled(H7)<{length: number}>`
  text-align: center;
  left: -50%;
  width: ${({length}) => (WIDTH + (length - 1 + CIRCLE_SIZE)) / length}px;
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
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [speedUpMinFeePerKb, setSpeedUpMinFeePerKb] = useState<number>();
  const {feeUnit, feeUnitAmount, blockTime} = GetFeeUnits(chain);
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

  const {coinColor: backgroundColor} = GetTheme(chain)!;
  const themedBackground = theme.dark ? '#464646' : NeutralSlate;

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

  const onSelectCustomFee = () => {
    setError(undefined);
    setSelectedLevel('custom');
    if (customSatsPerByte) {
      checkFees(customSatsPerByte);
    }
  };

  const getSelectedFeeOption = () => {
    return feeOptions?.find(({level}) => level === selectedLevel);
  };

  const getBackgroundColor = (index?: number) => {
    if (selectedLevel === 'custom') {
      return backgroundColor;
    }

    if (index !== undefined) {
      const selectedIndex =
        feeOptions?.findIndex(({level}) => level === selectedLevel) || 0;

      if (!(selectedIndex + 1 <= index)) {
        return backgroundColor;
      }
    }

    return '#E1E7E4';
  };

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onClose}>
      <TxSpeedContainer>
        <TxSpeedScroll
          extraScrollHeight={150}
          keyboardShouldPersistTaps={'handled'}>
          <SheetHeaderContainer style={{marginTop: insets.top}}>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={() => onClose()}>
              <Back opacity={1} background={themedBackground} />
            </TouchableOpacity>
            <TitleContainer>
              <HeaderTitle>{t('Transaction Speed')}</HeaderTitle>
            </TitleContainer>
          </SheetHeaderContainer>

          <TxSpeedParagraph>
            {t(
              'The higher the fee, the greater the incentive a miner has to include that transaction in a block. Current fees are determined based on network load and the selected policy.',
            )}
          </TxSpeedParagraph>

          <View>
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
                </StepsHeaderContainer>

                <StepsContainer>
                  {feeOptions.map((fee, i, {length}) => (
                    <FeeLevelStepContainer key={i} length={length}>
                      <TopLabelContainer>
                        {i !== 0 && selectedLevel === fee.level ? (
                          <View style={{flexShrink: 1}}>
                            <FeeLevelStepTopLabel length={length} medium={true}>
                              {fee.uiLevel}
                            </FeeLevelStepTopLabel>
                          </View>
                        ) : null}
                      </TopLabelContainer>

                      <FeeLevelStep>
                        <FeeLevelStepCircle
                          isActive={selectedLevel === fee.level}
                          isDisabled={fee.disabled}
                          onPress={() => {
                            setDisableApply(false);
                            setSelectedLevel(fee.level);
                          }}
                          disabled={!!fee.disabled}
                          backgroundColor={getBackgroundColor(i)}
                          style={[
                            {
                              shadowColor: '#000',
                              shadowOffset: {width: -2, height: 4},
                              shadowOpacity:
                                selectedLevel === fee.level ? 0.1 : 0,
                              shadowRadius: 5,
                              borderRadius: 12,
                              elevation: 3,
                            },
                          ]}
                        />

                        <FeeLevelStepLine
                          backgroundColor={getBackgroundColor(i + 1)}
                        />
                      </FeeLevelStep>
                    </FeeLevelStepContainer>
                  ))}

                  <View>
                    <TopLabelContainer />

                    <FeeLevelStep isLast={true}>
                      <FeeLevelStepCircle
                        isActive={selectedLevel === 'custom'}
                        onPress={onSelectCustomFee}
                        backgroundColor={getBackgroundColor()}
                        style={[
                          {
                            shadowColor: '#000',
                            shadowOffset: {width: -2, height: 4},
                            shadowOpacity: selectedLevel === 'custom' ? 0.1 : 0,
                            shadowRadius: 5,
                            borderRadius: 12,
                            elevation: 3,
                          },
                        ]}
                      />
                    </FeeLevelStep>
                  </View>
                </StepsContainer>

                <BottomLabelContainer>
                  <FeeLevelStepBottomLabel>
                    {feeOptions[0].uiLevel}
                  </FeeLevelStepBottomLabel>
                  <FeeLevelStepBottomLabel>
                    {t('Custom')}
                  </FeeLevelStepBottomLabel>
                </BottomLabelContainer>

                <DetailsList>
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
                        <ErrorText>
                          {t('Fee is lower than recommended.')}
                        </ErrorText>
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
                </DetailsList>

                <CtaContainer>
                  <Button onPress={() => onApply()} disabled={disableApply}>
                    {t('Apply')}
                  </Button>
                </CtaContainer>
              </>
            ) : null}
          </View>
        </TxSpeedScroll>
      </TxSpeedContainer>
    </SheetModal>
  );
};

export default TransactionLevel;
