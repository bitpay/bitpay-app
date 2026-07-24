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
import {useTheme} from '../../../../contexts';
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
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
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
import {SUPPORTED_VM_TOKENS} from '../../../../constants/currencies';

const CIRCLE_SIZE = 20;
const CIRCLE_ACTIVE_SIZE = 26;

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

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  txSpeedContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 0,
  },
  txSpeedScroll: {
    marginTop: 0,
  },
  sheetHeaderContainer: {
    marginBottom: 15,
    alignItems: 'center',
    flexDirection: 'row',
  },
  titleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: WIDTH - 110,
  },
  errorText: {
    color: Caution,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  stepsContainer: {
    flexDirection: 'row',
    margin: gutter,
    paddingHorizontal: 3,
  },
  feeLevelStep: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  feeLevelStepCircleBase: {
    borderColor: White,
    borderRadius: 50,
    zIndex: 1,
  },
  feeLevelStepLine: {
    flexGrow: 1,
    height: 2,
    alignSelf: 'center',
  },
  topLabelContainer: {
    minHeight: 30,
  },
  bottomLabelContainer: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginVertical: 0,
    marginHorizontal: gutter,
  },
  feeLevelStepTopLabel: {
    textAlign: 'center',
    left: '-50%' as any,
  },
  txSpeedParagraph: {
    marginVertical: 0,
    marginHorizontal: gutter,
  },
  feeLevelStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepsHeaderContainer: {
    marginTop: gutter,
    marginHorizontal: gutter,
    marginBottom: 0,
  },
  currencyImageContainer: {
    marginRight: 10,
  },
  feeLevelStepsHeaderSubTitle: {
    paddingTop: 5,
    minHeight: 30,
  },
});

const TxSpeedContainer: React.FC<
  React.ComponentProps<typeof SheetContainer>
> = ({style, ...rest}) => (
  <SheetContainer style={[styles.txSpeedContainer, style]} {...rest} />
);

const TxSpeedScroll: React.FC<
  React.ComponentProps<typeof KeyboardAwareScrollView>
> = ({style, ...rest}) => (
  <KeyboardAwareScrollView style={[styles.txSpeedScroll, style]} {...rest} />
);

const SheetHeaderContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.sheetHeaderContainer, style]} {...rest} />;

const TitleContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.titleContainer, style]} {...rest} />;

const ErrorText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.errorText, style]} {...rest} />;

const StepsContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.stepsContainer, style]} {...rest} />;

export const FeeLevelStepContainer: React.FC<
  React.ComponentProps<typeof View> & {length: number}
> = ({length, style, ...rest}) => (
  <View
    style={[{width: (WIDTH - (CIRCLE_SIZE + 36)) / length}, style]}
    {...rest}
  />
);

export const FeeLevelStep: React.FC<
  React.ComponentProps<typeof View> & {isLast?: boolean}
> = ({isLast: _isLast, style, ...rest}) => (
  <View style={[styles.feeLevelStep, style]} {...rest} />
);

export const FeeLevelStepCircle: React.FC<
  Omit<React.ComponentProps<typeof Pressable>, 'style'> & {
    style?: StyleProp<ViewStyle>;
    isActive: boolean;
    backgroundColor: string;
    isDisabled?: boolean;
  }
> = ({isActive, backgroundColor, isDisabled, style, ...rest}) => (
  <Pressable
    style={[
      styles.feeLevelStepCircleBase,
      {
        backgroundColor,
        width: isActive ? CIRCLE_ACTIVE_SIZE : CIRCLE_SIZE,
        height: isActive ? CIRCLE_ACTIVE_SIZE : CIRCLE_SIZE,
        borderWidth: isActive ? 3 : 0,
        opacity: isDisabled ? 0.7 : 1,
      },
      style,
    ]}
    {...rest}
  />
);

export const FeeLevelStepLine: React.FC<
  React.ComponentProps<typeof View> & {backgroundColor: string}
> = ({backgroundColor, style, ...rest}) => (
  <View style={[styles.feeLevelStepLine, {backgroundColor}, style]} {...rest} />
);

const TopLabelContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.topLabelContainer, style]} {...rest} />;

const BottomLabelContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.bottomLabelContainer, style]} {...rest} />;

export const FeeLevelStepBottomLabel: React.FC<
  React.ComponentProps<typeof H7>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <H7 style={[{color: theme.dark ? White : SlateDark}, style]} {...rest} />
  );
};

export const FeeLevelStepTopLabel: React.FC<
  React.ComponentProps<typeof H7> & {length: number}
> = ({length, style, ...rest}) => (
  <H7
    style={[
      styles.feeLevelStepTopLabel,
      {width: (WIDTH + (length - 1 + CIRCLE_SIZE)) / length},
      style,
    ]}
    {...rest}
  />
);

const TxSpeedParagraph: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.txSpeedParagraph,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

export const FeeLevelStepsHeader: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.feeLevelStepsHeader, style]} {...rest} />
);

const StepsHeaderContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.stepsHeaderContainer, style]} {...rest} />;

const CurrencyImageContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.currencyImageContainer, style]} {...rest} />;

export const FeeLevelStepsHeaderSubTitle: React.FC<
  React.ComponentProps<typeof Paragraph>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.feeLevelStepsHeaderSubTitle,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

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
  const {img, badgeImg, currencyAbbreviation, network, chain} = wallet;
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

      if (SUPPORTED_VM_TOKENS.includes(chain)) {
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
              style={{marginLeft: 15}}
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
                      <CurrencyImage
                        img={badgeImg ? badgeImg : img} // Badge image is chain image
                        size={20}
                      />
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
                          {t('Fee should not be higher than') +
                            ' ' +
                            maxFeeRecommended +
                            ' ' +
                            feeUnit +
                            '.'}
                        </ErrorText>
                      ) : null}
                      {error === 'showMinError' ? (
                        <ErrorText>
                          {t('Fee should be higher than') +
                            ' ' +
                            minFeeAllowed +
                            ' ' +
                            feeUnit +
                            '.'}
                        </ErrorText>
                      ) : null}
                      {error === 'showMaxError' ? (
                        <ErrorText>
                          {t('Fee Should be lesser than') +
                            ' ' +
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
                  <Button
                    touchableLibrary={'react-native'}
                    onPress={() => onApply()}
                    disabled={disableApply}>
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
