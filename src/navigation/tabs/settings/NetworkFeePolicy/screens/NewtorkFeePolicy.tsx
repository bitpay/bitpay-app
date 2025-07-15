import {H4, Paragraph} from '../../../../../components/styled/Text';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import {SlateDark, White} from '../../../../../styles/colors';
import {
  Fee,
  getFeeLevelsUsingBwcClient,
  GetFeeOptions,
} from '../../../../../store/wallet/effects/fee/fee';
import * as _ from 'lodash';
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
import {View} from 'react-native';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';
import {CurrencyListIcons} from '../../../../../constants/SupportedCurrencyOptions';
import {sleep} from '../../../../../utils/helper-methods';
import NetworkPolicyPlaceholder from '../../components/NetworkPolicyPlaceholder';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {updateCacheFeeLevel} from '../../../../../store/wallet/wallet.actions';
import {useTranslation} from 'react-i18next';
import {SUPPORTED_VM_TOKENS} from '../../../../../constants/currencies';

const NetworkFeePolicyContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const NetworkFeePolicyParagraph = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-bottom: 15px;
`;

const StepsHeaderContainer = styled.View`
  margin: ${ScreenGutter} 0;
`;

const CurrencyImageContainer = styled.View`
  margin-right: 10px;
`;

const StepsContainer = styled.View`
  flex-direction: row;
  margin: 0 0 ${ScreenGutter} 0;
  padding: 0 3px;
`;

const BottomLabelContainer = styled.View`
  justify-content: space-between;
  flex-direction: row;
`;

const FeeOptionsContainer = styled.View`
  margin-bottom: 35px;
`;

const TopLabelContainer = styled.View`
  min-height: 30px;
`;

const FeeOptions = ({
  feeOptions,
  chain,
  chainName,
}: {
  feeOptions: any[];
  chain: 'btc' | 'eth' | 'matic' | 'arb' | 'base' | 'op';
  chainName: string;
}) => {
  const dispatch = useAppDispatch();
  const cachedFeeLevels = useAppSelector(({WALLET}) => WALLET.feeLevel);
  const [selectedLevel, setSelectedLevel] = useState(cachedFeeLevels[chain]);

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
  const network = 'livenet';
  const [ethFeeOptions, setEthFeeOptions] = useState<any[]>();
  const [maticFeeOptions, setMaticFeeOptions] = useState<any[]>();
  const [arbFeeOptions, setArbFeeOptions] = useState<any[]>();
  const [baseFeeOptions, setBaseFeeOptions] = useState<any[]>();
  const [opFeeOptions, setOpFeeOptions] = useState<any[]>();
  const [btcFeeOptions, setBtcFeeOptions] = useState<any[]>();
  const [isLoading, setIsLoading] = useState(true);

  const initFeeLevel = async (currencyAbbreviation: string, chain: string) => {
    let feeOptions: any[] = [];
    const {feeUnit, feeUnitAmount, blockTime} = GetFeeUnits(chain);
    try {
      const _feeLevels = await getFeeLevelsUsingBwcClient(chain, network);
      if (_.isEmpty(_feeLevels)) {
        return;
      }

      _feeLevels.forEach((fee: Fee) => {
        const {feePerKb, level, nbBlocks} = fee;
        const feeOption: any = {
          ...fee,
          feeUnit,
          // @ts-ignore
          uiLevel: GetFeeOptions(chain)[level],
        };
        const _feePerSatByte = feePerKb / feeUnitAmount;
        feeOption.feePerSatByte = parseFloat(_feePerSatByte.toFixed(2));
        feeOption.uiFeePerSatByte = !isNaN(feeOption.feePerSatByte)
          ? `${feeOption.feePerSatByte} ${
              currencyAbbreviation === 'btc' ? t('Satoshis per byte') : feeUnit
            }`
          : t('Confirmation');

        if (SUPPORTED_VM_TOKENS.includes(chain)) {
          // @ts-ignore
          feeOption.avgConfirmationTime = evmAvgTime[level];
        }

        if (currencyAbbreviation === 'btc') {
          const min = nbBlocks * blockTime;
          const hours = Math.floor(min / 60);
          feeOption.avgConfirmationTime =
            hours > 0
              ? hours === 1
                ? t('within an hour')
                : t('within hours', {hours})
              : t('within minutes', {min});
        }
        feeOptions.push(feeOption);
      });

      feeOptions = feeOptions.reverse();

      if (currencyAbbreviation === 'btc') {
        setBtcFeeOptions(feeOptions);
      } else if (currencyAbbreviation === 'eth') {
        setEthFeeOptions(feeOptions);
      } else if (currencyAbbreviation === 'matic') {
        setMaticFeeOptions(feeOptions);
      } else if (currencyAbbreviation === 'arb') {
        setArbFeeOptions(feeOptions);
      } else if (currencyAbbreviation === 'base') {
        setBaseFeeOptions(feeOptions);
      } else if (currencyAbbreviation === 'op') {
        setOpFeeOptions(feeOptions);
      }
    } catch (e) {
      return;
    }
  };
  const init = async () => {
    ['btc', 'eth', 'matic', 'arb', 'base', 'op'].forEach((ca: string) =>
      initFeeLevel(ca, ca),
    );
    await sleep(500);
    setIsLoading(false);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <NetworkFeePolicyContainer>
      <ScrollView>
        <NetworkFeePolicyParagraph>
          {t(
            'The higher the fee, the greater the incentive a miner has to include that transaction in a block. Current fees are determined based on network load and the selected policy.',
          )}
        </NetworkFeePolicyParagraph>

        {isLoading ? (
          <NetworkPolicyPlaceholder />
        ) : (
          <>
            <View>
              {btcFeeOptions && btcFeeOptions.length > 0 ? (
                <FeeOptions
                  feeOptions={btcFeeOptions}
                  chain={'btc'}
                  chainName={'Bitcoin'}
                />
              ) : null}
            </View>

            <View>
              {ethFeeOptions && ethFeeOptions.length > 0 ? (
                <FeeOptions
                  feeOptions={ethFeeOptions}
                  chain={'eth'}
                  chainName={'Ethereum'}
                />
              ) : null}
            </View>

            <View>
              {maticFeeOptions && maticFeeOptions.length > 0 ? (
                <FeeOptions
                  feeOptions={maticFeeOptions}
                  chain={'matic'}
                  chainName={'Polygon'}
                />
              ) : null}
            </View>

            <View>
              {arbFeeOptions && arbFeeOptions.length > 0 ? (
                <FeeOptions
                  feeOptions={arbFeeOptions}
                  chain={'arb'}
                  chainName={'Arbitrum'}
                />
              ) : null}
            </View>

            <View>
              {baseFeeOptions && baseFeeOptions.length > 0 ? (
                <FeeOptions
                  feeOptions={baseFeeOptions}
                  chain={'base'}
                  chainName={'Base'}
                />
              ) : null}
            </View>

            <View>
              {opFeeOptions && opFeeOptions.length > 0 ? (
                <FeeOptions
                  feeOptions={opFeeOptions}
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
