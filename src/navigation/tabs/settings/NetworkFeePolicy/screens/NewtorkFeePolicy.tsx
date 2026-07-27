import {H4, Paragraph} from '../../../../../components/styled/Text';
import React, {useEffect, useState} from 'react';
import {useTheme} from '../../../../../contexts';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import {SlateDark, White} from '../../../../../styles/colors';
import {
  Fee,
  FeeLevels,
  getFeeLevelsUsingBwcClient,
  GetFeeOptions,
} from '../../../../../store/wallet/effects/fee/fee';
import {
  GetFeeUnits,
  GetTheme,
} from '../../../../../store/wallet/utils/currency';
import {
  evmAvgTime,
  FeeLevelStep,
  FeeLevelStepCircle,
  FeeLevelStepContainer,
  FeeLevelStepLine,
  FeeLevelStepBottomLabel,
  FeeLevelStepTopLabel,
  FeeLevelStepsHeader,
  FeeLevelStepsHeaderSubTitle,
} from '../../../../wallet/screens/send/TransactionLevel';
import {
  SafeAreaView,
  ScrollView as RNScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';
import {CurrencyListIcons} from '../../../../../constants/SupportedCurrencyOptions';
import NetworkPolicyPlaceholder from '../../components/NetworkPolicyPlaceholder';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {updateCacheFeeLevel} from '../../../../../store/wallet/wallet.actions';
import {useTranslation} from 'react-i18next';
import {SUPPORTED_VM_TOKENS} from '../../../../../constants/currencies';
import {useNavigation} from '@react-navigation/native';

type SupportedFeeChain = 'btc' | 'eth' | 'matic' | 'arb' | 'base' | 'op';

type FeeOption = Omit<Fee, 'level'> & {
  level: FeeLevels;
  feeUnit: string;
  uiLevel: string;
  feePerSatByte: number;
  uiFeePerSatByte: string;
  avgConfirmationTime?: string;
};

type FeeOptionsByChain = Record<SupportedFeeChain, FeeOption[]>;

const SUPPORTED_FEE_CHAINS: SupportedFeeChain[] = [
  'btc',
  'eth',
  'matic',
  'arb',
  'base',
  'op',
];
const EMPTY_FEE_OPTIONS_BY_CHAIN: FeeOptionsByChain = {
  btc: [],
  eth: [],
  matic: [],
  arb: [],
  base: [],
  op: [],
};
const DEFERRED_LOAD_FALLBACK_MS = 2000;

const styles = StyleSheet.create({
  networkFeePolicyContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  networkFeePolicyParagraph: {
    marginBottom: 15,
  },
  stepsHeaderContainer: {
    marginVertical: parseInt(ScreenGutter, 10),
  },
  currencyImageContainer: {
    marginRight: 10,
  },
  stepsContainer: {
    flexDirection: 'row',
    marginBottom: parseInt(ScreenGutter, 10),
    paddingHorizontal: 3,
  },
  bottomLabelContainer: {
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  feeOptionsContainer: {
    marginBottom: 35,
  },
  topLabelContainer: {
    minHeight: 30,
  },
});

const NetworkFeePolicyContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => (
  <SafeAreaView style={styles.networkFeePolicyContainer}>
    {children}
  </SafeAreaView>
);

const ScrollView: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <RNScrollView style={styles.scrollView}>{children}</RNScrollView>
);

const NetworkFeePolicyParagraph: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.networkFeePolicyParagraph,
        {color: theme.dark ? White : SlateDark},
      ]}>
      {children}
    </Paragraph>
  );
};

const StepsHeaderContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.stepsHeaderContainer}>{children}</View>;

const CurrencyImageContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.currencyImageContainer}>{children}</View>;

const StepsContainer: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.stepsContainer}>{children}</View>
);

const BottomLabelContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.bottomLabelContainer}>{children}</View>;

const FeeOptionsContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.feeOptionsContainer}>{children}</View>;

const TopLabelContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.topLabelContainer}>{children}</View>;

const FeeOptions = ({
  feeOptions,
  chain,
  chainName,
}: {
  feeOptions: FeeOption[];
  chain: SupportedFeeChain;
  chainName: string;
}) => {
  const dispatch = useAppDispatch();
  const cachedFeeLevel = useAppSelector(({WALLET}) => WALLET.feeLevel[chain]);
  const [selectedLevel, setSelectedLevel] = useState(cachedFeeLevel);

  const getSelectedFeeOption = () => {
    return feeOptions?.find(({level}) => level === selectedLevel);
  };

  const getBackgroundColor = (index?: number) => {
    const {coinColor: backgroundColor} = GetTheme(chain)!;

    if (index !== undefined) {
      const selectedIndex =
        feeOptions?.findIndex(({level}) => level === selectedLevel) || 0;

      if (!(selectedIndex + 1 <= index)) {
        return backgroundColor;
      }
    }

    return '#E1E7E4';
  };

  const isFirst = (index: number): boolean => {
    return index === 0;
  };

  const isLast = (index: number, length: number): boolean => {
    return index === length - 1;
  };

  return (
    <FeeOptionsContainer>
      <StepsHeaderContainer>
        <FeeLevelStepsHeader>
          <CurrencyImageContainer>
            <CurrencyImage img={CurrencyListIcons[chain]} size={20} />
          </CurrencyImageContainer>
          <H4>{chainName}</H4>
        </FeeLevelStepsHeader>

        <FeeLevelStepsHeaderSubTitle>
          {`${getSelectedFeeOption()?.uiFeePerSatByte} ${
            getSelectedFeeOption()?.avgConfirmationTime
          }`}
        </FeeLevelStepsHeaderSubTitle>
      </StepsHeaderContainer>

      <StepsContainer>
        {feeOptions.map((fee, i, {length}) => (
          <FeeLevelStepContainer key={i} length={length - 1}>
            <TopLabelContainer>
              {!isFirst(i) &&
              !isLast(i, length) &&
              selectedLevel === fee.level ? (
                <View style={{flexShrink: 1}}>
                  <FeeLevelStepTopLabel length={length - 1} medium={true}>
                    {fee.uiLevel}
                  </FeeLevelStepTopLabel>
                </View>
              ) : null}
            </TopLabelContainer>

            <FeeLevelStep isLast={isLast(i, length)}>
              <FeeLevelStepCircle
                isActive={selectedLevel === fee.level}
                onPress={() => {
                  if (selectedLevel !== fee.level) {
                    setSelectedLevel(fee.level);
                    dispatch(
                      updateCacheFeeLevel({
                        currency: chain,
                        feeLevel: fee.level,
                      }),
                    );
                  }
                }}
                backgroundColor={getBackgroundColor(i)}
                style={[
                  {
                    shadowColor: '#000',
                    shadowOffset: {width: -2, height: 4},
                    shadowOpacity: selectedLevel === fee.level ? 0.1 : 0,
                    shadowRadius: 5,
                    borderRadius: 12,
                    elevation: 3,
                  },
                ]}
              />

              {!isLast(i, length) ? (
                <FeeLevelStepLine backgroundColor={getBackgroundColor(i + 1)} />
              ) : null}
            </FeeLevelStep>
          </FeeLevelStepContainer>
        ))}
      </StepsContainer>

      <BottomLabelContainer>
        <FeeLevelStepBottomLabel>
          {feeOptions[0].uiLevel}
        </FeeLevelStepBottomLabel>
        <FeeLevelStepBottomLabel>
          {feeOptions[feeOptions.length - 1].uiLevel}
        </FeeLevelStepBottomLabel>
      </BottomLabelContainer>
    </FeeOptionsContainer>
  );
};

const NetworkFeePolicy = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [feeOptionsByChain, setFeeOptionsByChain] =
    useState<FeeOptionsByChain>();

  useEffect(() => {
    let isActive = true;

    const initFeeLevel = async (
      chain: SupportedFeeChain,
    ): Promise<FeeOption[]> => {
      const {feeUnit, feeUnitAmount, blockTime} = GetFeeUnits(chain);

      try {
        const feeLevels = await getFeeLevelsUsingBwcClient(chain, 'livenet');
        if (!feeLevels.length) {
          return [];
        }

        return feeLevels
          .map((fee: Fee) => {
            const {feePerKb, nbBlocks} = fee;
            const level = fee.level as FeeLevels;
            const feePerSatByte = parseFloat(
              (feePerKb / feeUnitAmount).toFixed(2),
            );
            const feeOption: FeeOption = {
              ...fee,
              level,
              feeUnit,
              uiLevel: GetFeeOptions(chain)[level],
              feePerSatByte,
              uiFeePerSatByte: !isNaN(feePerSatByte)
                ? `${feePerSatByte} ${
                    chain === 'btc' ? t('Satoshis per byte') : feeUnit
                  }`
                : t('Confirmation'),
            };

            if (SUPPORTED_VM_TOKENS.includes(chain)) {
              feeOption.avgConfirmationTime =
                evmAvgTime[level as keyof typeof evmAvgTime];
            }

            if (chain === 'btc') {
              const min = nbBlocks * blockTime;
              const hours = Math.floor(min / 60);
              feeOption.avgConfirmationTime =
                hours > 0
                  ? hours === 1
                    ? t('within an hour')
                    : t('within hours', {hours})
                  : t('within minutes', {min});
            }

            return feeOption;
          })
          .reverse();
      } catch {
        return [];
      }
    };

    let started = false;
    const init = () => {
      if (started || !isActive) {
        return;
      }
      started = true;

      SUPPORTED_FEE_CHAINS.forEach(chain => {
        void initFeeLevel(chain).then(feeOptions => {
          if (!isActive) {
            return;
          }

          setFeeOptionsByChain(current => ({
            ...(current ?? EMPTY_FEE_OPTIONS_BY_CHAIN),
            [chain]: feeOptions,
          }));
        });
      });
    };

    const unsubscribe = (navigation as any).addListener(
      'transitionEnd',
      (event: {data?: {closing?: boolean}}) => {
        if (!event.data?.closing) {
          init();
        }
      },
    );
    const fallbackTimer = setTimeout(init, DEFERRED_LOAD_FALLBACK_MS);

    return () => {
      isActive = false;
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [navigation, t]);

  return (
    <NetworkFeePolicyContainer>
      <ScrollView>
        <NetworkFeePolicyParagraph>
          {t(
            'The higher the fee, the greater the incentive a miner has to include that transaction in a block. Current fees are determined based on network load and the selected policy.',
          )}
        </NetworkFeePolicyParagraph>

        {feeOptionsByChain === undefined ? (
          <NetworkPolicyPlaceholder />
        ) : (
          <>
            <View>
              {feeOptionsByChain.btc.length > 0 ? (
                <FeeOptions
                  feeOptions={feeOptionsByChain.btc}
                  chain={'btc'}
                  chainName={'Bitcoin'}
                />
              ) : null}
            </View>

            <View>
              {feeOptionsByChain.eth.length > 0 ? (
                <FeeOptions
                  feeOptions={feeOptionsByChain.eth}
                  chain={'eth'}
                  chainName={'Ethereum'}
                />
              ) : null}
            </View>

            <View>
              {feeOptionsByChain.matic.length > 0 ? (
                <FeeOptions
                  feeOptions={feeOptionsByChain.matic}
                  chain={'matic'}
                  chainName={'Polygon'}
                />
              ) : null}
            </View>

            <View>
              {feeOptionsByChain.arb.length > 0 ? (
                <FeeOptions
                  feeOptions={feeOptionsByChain.arb}
                  chain={'arb'}
                  chainName={'Arbitrum'}
                />
              ) : null}
            </View>

            <View>
              {feeOptionsByChain.base.length > 0 ? (
                <FeeOptions
                  feeOptions={feeOptionsByChain.base}
                  chain={'base'}
                  chainName={'Base'}
                />
              ) : null}
            </View>

            <View>
              {feeOptionsByChain.op.length > 0 ? (
                <FeeOptions
                  feeOptions={feeOptionsByChain.op}
                  chain={'op'}
                  chainName={'Optimism'}
                />
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </NetworkFeePolicyContainer>
  );
};

export default NetworkFeePolicy;
