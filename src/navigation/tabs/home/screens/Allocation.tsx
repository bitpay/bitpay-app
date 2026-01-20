import React, {useLayoutEffect, useMemo} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';
import {HeaderTitle, BaseText} from '../../../../components/styled/Text';
import HeaderBackButton from '../../../../components/back/HeaderBackButton';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {AllocationDonutLegendCard} from '../components/AllocationSection';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {buildAccountList} from '../../../../store/wallet/utils/wallet';
import type {Key, Wallet} from '../../../../store/wallet/wallet.models';
import {useTokenContext} from '../../../../contexts';
import {BitpaySupportedTokenOptsByAddress} from '../../../../constants/tokens';
import {addTokenChainSuffix} from '../../../../utils/helper-methods';
import {
  buildAllocationDataFromWalletRows,
  type AllocationWallet,
} from '../../../../utils/allocation';
import {LightBlack, Slate30, SlateDark} from '../../../../styles/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Allocation'>;

export type AllocationRowItem = {
  key: string;
  currencyAbbreviation: string;
  chain: string;
  tokenAddress?: string;
  name: string;
  fiatAmount: string;
  percent: string;
  barColor: {
    light: string;
    dark: string;
  };
  progress: number;
};

const ScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

const Content = styled.ScrollView`
  flex: 1;
`;

const Rows = styled.View`
  margin: 0px 16px 24px;
`;

const Row = styled.View`
  padding: 14px 0;
`;

const RowTop = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
`;

const RowLeft = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const IconContainer = styled.View`
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const RowLabels = styled.View`
  flex: 1;
  justify-content: center;
`;

const AssetName = styled(BaseText)`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme}) => theme.colors.text};
`;

const AssetSymbol = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const RowRight = styled.View`
  align-items: flex-end;
  justify-content: center;
  margin-left: 12px;
`;

const FiatAmount = styled(BaseText)`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme}) => theme.colors.text};
`;

const Percent = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme}) => theme.colors.text};
`;

const ProgressTrack = styled.View`
  margin-top: 10px;
  height: 10px;
  border-radius: 50px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  overflow: hidden;
`;

const ProgressFill = styled.View<{
  progress: number;
  color: string;
}>`
  height: 10px;
  width: ${({progress}) => `${Math.min(100, Math.max(0, progress))}%`};
  border-radius: 50px;
  background-color: ${({color}) => color};
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
`;

export const AllocationRowsList: React.FC<{
  rows: AllocationRowItem[];
  style?: any;
}> = ({rows, style}) => {
  const theme = useTheme();
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const {tokenOptionsByAddress} = useTokenContext();
  const customTokenOptionsByAddress = useAppSelector(
    ({WALLET}) => WALLET.customTokenOptionsByAddress,
  );

  const allTokenOptionsByAddress = useMemo(() => {
    return {
      ...BitpaySupportedTokenOptsByAddress,
      ...tokenOptionsByAddress,
      ...customTokenOptionsByAddress,
    };
  }, [customTokenOptionsByAddress, tokenOptionsByAddress]);

  return (
    <Rows style={style}>
      {rows.map(item => {
        const option = SupportedCurrencyOptions.find(o => {
          const tokenMatch = item.tokenAddress
            ? o.tokenAddress?.toLowerCase() === item.tokenAddress?.toLowerCase()
            : true;
          return (
            o.currencyAbbreviation === item.currencyAbbreviation &&
            o.chain === item.chain &&
            tokenMatch
          );
        });

        const tokenKey = item.tokenAddress
          ? addTokenChainSuffix(item.tokenAddress, item.chain)
          : undefined;
        const tokenOpt = tokenKey
          ? allTokenOptionsByAddress[tokenKey]
          : undefined;
        const img = option?.img || (tokenOpt?.logoURI as string | undefined);

        const barColor = theme.dark ? item.barColor.dark : item.barColor.light;

        return (
          <Row key={item.key}>
            <RowTop>
              <RowLeft>
                <IconContainer>
                  <CurrencyImage
                    img={img}
                    imgSrc={
                      option?.img
                        ? undefined
                        : (option?.imgSrc as unknown as number)
                    }
                    size={40}
                  />
                </IconContainer>
                <RowLabels>
                  <AssetName>{item.name}</AssetName>
                  <AssetSymbol>
                    {item.currencyAbbreviation.toUpperCase()}
                  </AssetSymbol>
                </RowLabels>
              </RowLeft>

              <RowRight>
                <FiatAmount>
                  {hideAllBalances ? '****' : item.fiatAmount}
                </FiatAmount>
                <Percent>{item.percent}</Percent>
              </RowRight>
            </RowTop>

            <ProgressTrack>
              <ProgressFill progress={item.progress} color={barColor} />
            </ProgressTrack>
          </Row>
        );
      })}
    </Rows>
  );
};

const Allocation: React.FC<Props> = ({navigation, route}) => {
  const theme = useTheme();
  const commonOptions = useStackScreenOptions(theme);
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const {rates} = useAppSelector(({RATE}) => RATE);
  const {defaultAltCurrency} = useAppSelector(({APP}) => APP);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...commonOptions,
      headerLeft: () => <HeaderBackButton />,
      headerTitle: () => <HeaderTitle>Allocation</HeaderTitle>,
    });
  }, [navigation, commonOptions]);

  const walletRows: AllocationWallet[] = useMemo(() => {
    const keyId = route.params?.keyId;
    const accountAddress = route.params?.accountAddress;

    if (keyId) {
      const key = keys[keyId];
      if (!key) {
        return [];
      }

      if (accountAddress) {
        const accounts = buildAccountList(
          key,
          defaultAltCurrency.isoCode,
          rates,
          dispatch,
          {
            filterByHideWallet: true,
          },
        );
        const account = accounts.find(a => a.receiveAddress === accountAddress);
        return (account?.wallets || []) as AllocationWallet[];
      }

      const wallets = key.wallets.filter(
        w => !w.hideWallet && !w.hideWalletByAccount,
      );

      return wallets.map((w: Wallet) => {
        return {
          currencyAbbreviation: w.currencyAbbreviation,
          chain: w.chain,
          tokenAddress: w.tokenAddress,
          currencyName: w.currencyName,
          fiatBalance: (w.balance as any)?.fiat,
        };
      });
    }

    const wallets = (Object.values(keys) as Key[])
      .flatMap((k: Key) => k.wallets)
      .filter((w: Wallet) => !w.hideWallet && !w.hideWalletByAccount);

    return wallets.map((w: Wallet) => {
      return {
        currencyAbbreviation: w.currencyAbbreviation,
        chain: w.chain,
        tokenAddress: w.tokenAddress,
        currencyName: w.currencyName,
        fiatBalance: (w.balance as any)?.fiat,
      };
    });
  }, [
    defaultAltCurrency.isoCode,
    dispatch,
    keys,
    rates,
    route.params?.accountAddress,
    route.params?.keyId,
  ]);

  const allocationData = useMemo(() => {
    return buildAllocationDataFromWalletRows(
      walletRows,
      defaultAltCurrency.isoCode,
    );
  }, [defaultAltCurrency.isoCode, walletRows]);

  return (
    <ScreenContainer>
      <Content>
        <AllocationDonutLegendCard
          legendItems={allocationData.legendItems}
          slices={allocationData.slices}
        />

        <AllocationRowsList rows={allocationData.rows} />
      </Content>
    </ScreenContainer>
  );
};

export default Allocation;
