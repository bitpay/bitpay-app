import React, {ReactElement, useRef, useState} from 'react';
import styled from 'styled-components/native';
import {View} from 'react-native';
import {Badge, BaseText, H5} from '../styled/Text';
import KeySvg from '../../../assets/img/key.svg';
import {LightBlack, Slate30, SlateDark, White} from '../../styles/colors';
import {Wallet} from '../../store/wallet/wallet.models';
import {WalletRowProps} from './WalletRow';
import WalletRow from './WalletRow';
import {SvgProps} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import {
  ActiveOpacity,
  BadgeContainer,
  ChevronContainer,
  Column,
  Row,
} from '../styled/Containers';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import ChevronDownSvgLight from '../../../assets/img/chevron-down-lightmode.svg';
import ChevronUpSvgLight from '../../../assets/img/chevron-up-lightmode.svg';
import ChevronDownSvgDark from '../../../assets/img/chevron-down-darkmode.svg';
import ChevronUpSvgDark from '../../../assets/img/chevron-up-darkmode.svg';
import {useTheme} from 'styled-components/native';
import {AccountRowProps} from './AccountListRow';
import {AssetsByChainData} from '../../navigation/wallet/screens/AccountDetails';
import {formatCryptoAddress} from '../../utils/helper-methods';
import Blockie from '../blockie/Blockie';
import {IsVMChain} from '../../store/wallet/utils/currency';
import {findWalletById} from '../../store/wallet/utils/wallet';
import {useAppSelector} from '../../utils/hooks';
import {BitpaySupportedCoins} from '../../constants/currencies';
import {SearchableItem} from '../chain-search/ChainSearch';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {SupportedTransactionCurrencies} from '../../store/wallet/effects/paypro/paypro';

interface KeyWalletsRowContainerProps {
  isLast?: boolean;
}

const KeyWalletsRowContainer = styled.View<KeyWalletsRowContainerProps>`
  margin-bottom: 0px;
  border-bottom-width: ${({isLast}) => (isLast ? 0 : 1)}px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ECEFFD')};
  border-bottom-width: 0;
  gap: 24px;
`;

const OuterContainer = styled.View`
  padding-bottom: 10px;
`;

interface KeyNameContainerProps {
  noBorder?: boolean;
}

const KeyNameContainer = styled.View<KeyNameContainerProps>`
  flex-direction: row;
  align-items: center;
  border-bottom-color: ${({theme: {dark}}) => (dark ? SlateDark : '#ECEFFD')};
  border-bottom-width: ${({noBorder}) => (noBorder ? 0 : 1)}px;
  margin-top: 20px;
  ${({noBorder}) => (noBorder ? 'margin-left: 10px;' : '')}
  padding-bottom: ${({noBorder}) => (noBorder ? 0 : 10)}px;
`;

const KeyName = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 10px;
`;

const NeedBackupText = styled(BaseText)`
  font-size: 12px;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  padding: 2px 4px;
  border: 1px solid ${({theme: {dark}}) => (dark ? White : Slate30)};
  border-radius: 3px;
  margin-left: auto;
`;

const CurrencyImageContainer = styled.View`
  height: 30px;
  width: 30px;
  display: flex;
  justify-content: center;
  align-self: center;
  border-radius: 8px;
`;

const ChainAssetsContainer = styled(Row)`
  align-items: center;
  justify-content: center;
  display: flex;
  flex-direction: row;
`;

const AccountChainsContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  margin: 0px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ECEFFD')};
  gap: 11px;
`;

const AccountChainTitleContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 12px;
`;

interface AccountContainerProps {
  isLast?: boolean;
  isSameChain?: boolean;
}

const AccountContainer = styled.View<AccountContainerProps>`
  gap: 12px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? '#333333' : '#ECEFFD')};
  border-bottom-width: ${({isLast}) => (isLast ? 0 : 1)}px;
  padding-bottom: 12px;
`;

const UtxoAccountContainer = styled.View<AccountContainerProps>`
  border-bottom-color: ${({theme: {dark}}) => (dark ? '#333333' : '#ECEFFD')};
  border-bottom-width: ${({isLast}) => (isLast ? 0 : 1)}px;
  padding-bottom: ${({isLast}) => (isLast ? 0 : 12)}px;
  margin-top: ${({isSameChain}) => (isSameChain ? -24 : 0)}px;
`;

const CoinbaseAccountContainer = styled.View`
  margin: -10px 0 -15px -10px;
`;

type WalletRowType = KeyWallet | WalletRowProps;

export interface KeyWallet extends Wallet {
  img: string | ((props: any) => ReactElement);
}

export interface KeyWalletsRowProps extends SearchableItem {
  key: string;
  backupComplete?: boolean;
  keyName: string;
  accounts: (AccountRowProps & {assetsByChain?: AssetsByChainData[]} & {
    checked?: boolean;
  })[];
  mergedUtxoAndEvmAccounts:
    | WalletRowProps[]
    | (AccountRowProps & {assetsByChain?: AssetsByChainData[]})[];
  coinbaseAccounts: WalletRowProps[];
}

interface KeyWalletProps {
  keyAccounts: KeyWalletsRowProps[];
  keySvg?: React.FC<SvgProps>;
  onPress: (wallet: Wallet | WalletRowProps) => void;
  currency?: string;
  hideBalance: boolean;
  supportedTransactionCurrencies?: SupportedTransactionCurrencies;
}

const KeyWalletsRow = ({
  keyAccounts,
  keySvg = KeySvg,
  onPress,
  currency,
  hideBalance,
  supportedTransactionCurrencies,
}: KeyWalletProps) => {
  const {t} = useTranslation();
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const [showChainAssets, setShowChainAssets] = useState<{
    [key: string]: boolean;
  }>();
  const theme = useTheme();

  const onHide = (address: string) => {
    setShowChainAssets({
      ...showChainAssets,
      [address]:
        showChainAssets?.[address] === undefined
          ? false
          : !showChainAssets?.[address],
    });
  };
  const prevValueRef = useRef<WalletRowProps | null>(null);

  return (
    <OuterContainer>
      {keyAccounts.map((key, keyIndex) => (
        <KeyWalletsRowContainer
          key={key.key}
          isLast={keyIndex === keyAccounts.length - 1}>
          {(key.accounts?.length > 0 ||
            key.coinbaseAccounts?.length > 0 ||
            Object.values(key?.mergedUtxoAndEvmAccounts ?? {})?.length > 0) && (
            <KeyNameContainer noBorder={!!currency}>
              {keySvg({})}
              <KeyName>{key.keyName || 'My Key'}</KeyName>
              {!key.backupComplete && !key?.coinbaseAccounts && (
                <NeedBackupText>{t('Needs Backup')}</NeedBackupText>
              )}
            </KeyNameContainer>
          )}
          {key?.mergedUtxoAndEvmAccounts?.map((account, index) => {
            const chain = account?.chain ?? account?.chains?.[0] ?? '';
            if (IsVMChain(chain)) {
              let evmAccount = account as AccountRowProps & {
                assetsByChain?: AssetsByChainData[];
              };
              return (
                <AccountContainer
                  key={account.id}
                  isLast={key?.mergedUtxoAndEvmAccounts.length === index + 1}>
                  <AccountChainsContainer
                    activeOpacity={ActiveOpacity}
                    onPress={() => onHide(evmAccount?.receiveAddress)}>
                    <Blockie size={19} seed={evmAccount?.receiveAddress} />
                    <Column>
                      <H5 ellipsizeMode="tail" numberOfLines={1}>
                        {evmAccount?.accountName}
                      </H5>
                    </Column>
                    <Column style={{alignItems: 'flex-end'}}>
                      <ChainAssetsContainer>
                        <BadgeContainer>
                          <Badge>
                            {formatCryptoAddress(evmAccount?.receiveAddress)}
                          </Badge>
                        </BadgeContainer>
                        <ChevronContainer>
                          {theme.dark ? (
                            showChainAssets?.[evmAccount?.receiveAddress] !==
                            false ? (
                              <ChevronDownSvgDark width={10} height={6} />
                            ) : (
                              <ChevronUpSvgDark width={10} height={6} />
                            )
                          ) : showChainAssets?.[evmAccount?.receiveAddress] !==
                            false ? (
                            <ChevronDownSvgLight width={10} height={6} />
                          ) : (
                            <ChevronUpSvgLight width={10} height={6} />
                          )}
                        </ChevronContainer>
                      </ChainAssetsContainer>
                    </Column>
                  </AccountChainsContainer>
                  {showChainAssets?.[evmAccount?.receiveAddress] !== false &&
                    evmAccount?.assetsByChain
                      ?.filter(
                        ({chainAssetsList}) => chainAssetsList.length > 0,
                      )
                      .map(
                        ({
                          chain,
                          chainImg,
                          chainName,
                          chainAssetsList,
                        }: {
                          chain: string;
                          chainImg: string | ((props?: any) => ReactElement);
                          chainName: string;
                          chainAssetsList: WalletRowProps[];
                        }) => (
                          <View key={chain}>
                            <AccountChainTitleContainer>
                              <CurrencyImageContainer>
                                <CurrencyImage img={chainImg} size={20} />
                              </CurrencyImageContainer>
                              <H5 ellipsizeMode="tail" numberOfLines={1}>
                                {chainName}
                              </H5>
                            </AccountChainTitleContainer>

                            <View style={{marginTop: -10, marginLeft: -10}}>
                              {chainAssetsList.map(asset => (
                                <WalletRow
                                  key={asset.id}
                                  id={asset.id}
                                  hideBalance={hideBalance}
                                  noBorder={true}
                                  supportedTransactionCurrencies={
                                    supportedTransactionCurrencies
                                  }
                                  onPress={() => {
                                    const fullWalletObj = findWalletById(
                                      keys[key.key].wallets,
                                      asset.id,
                                    ) as Wallet;
                                    onPress(fullWalletObj);
                                  }}
                                  wallet={asset}
                                />
                              ))}
                            </View>
                          </View>
                        ),
                      )}
                </AccountContainer>
              );
            } else {
              const wallet = account as WalletRowProps;
              const prev = prevValueRef.current;
              prevValueRef.current = wallet;
              const showAssets =
                showChainAssets?.[`${wallet.chain}-${key.key}`] !== false;
              const chainWalletslength = Object.values(
                key.mergedUtxoAndEvmAccounts,
              )
                .flat()
                .filter(
                  wallet => wallet?.chain && wallet.chain === chain,
                ).length;
              return (
                <UtxoAccountContainer
                  key={wallet.id}
                  isLast={
                    key?.mergedUtxoAndEvmAccounts.length === index + 1 ||
                    !prev ||
                    (prev.chain !== wallet.chain &&
                      chainWalletslength === index + 1)
                  }
                  isSameChain={!prev || prev.chain === wallet.chain}>
                  {!prev ||
                    (prev.chain !== wallet.chain && (
                      <AccountChainsContainer
                        activeOpacity={ActiveOpacity}
                        onPress={() =>
                          wallet?.chain && onHide(`${wallet.chain}-${key.key}`)
                        }>
                        <CurrencyImage img={wallet?.img} size={20} />
                        <Column>
                          <H5 ellipsizeMode="tail" numberOfLines={1}>
                            {BitpaySupportedCoins[
                              // @ts-ignore
                              wallet?.currencyAbbreviation?.toLowerCase()
                            ]?.name ?? ''}
                          </H5>
                        </Column>
                        <Column style={{alignItems: 'flex-end'}}>
                          <ChainAssetsContainer>
                            <ChevronContainer>
                              {theme.dark ? (
                                showChainAssets?.[
                                  `${wallet?.chain}-${key.key}`
                                ] !== false ? (
                                  <ChevronDownSvgDark width={10} height={6} />
                                ) : (
                                  <ChevronUpSvgDark width={10} height={6} />
                                )
                              ) : showChainAssets?.[
                                  `${wallet?.chain}-${key.key}`
                                ] !== false ? (
                                <ChevronDownSvgLight width={10} height={6} />
                              ) : (
                                <ChevronUpSvgLight width={10} height={6} />
                              )}
                            </ChevronContainer>
                          </ChainAssetsContainer>
                        </Column>
                      </AccountChainsContainer>
                    ))}
                  {showAssets && (
                    <View style={{marginLeft: -10}} key={wallet.id}>
                      <WalletRow
                        id={wallet.id}
                        hideBalance={hideBalance}
                        noBorder={true}
                        supportedTransactionCurrencies={
                          supportedTransactionCurrencies
                        }
                        onPress={() => {
                          const fullWalletObj = findWalletById(
                            keys[key.key].wallets,
                            wallet.id,
                          ) as Wallet;

                          onPress(fullWalletObj);
                        }}
                        wallet={wallet}
                      />
                    </View>
                  )}
                </UtxoAccountContainer>
              );
            }
          })}

          {key?.coinbaseAccounts?.map((wallet, index) => (
            <CoinbaseAccountContainer key={index}>
              <WalletRow
                id={wallet.id}
                hideBalance={hideBalance}
                noBorder={true}
                onPress={() => onPress(wallet)}
                wallet={wallet}
              />
            </CoinbaseAccountContainer>
          ))}
        </KeyWalletsRowContainer>
      ))}
    </OuterContainer>
  );
};

export default KeyWalletsRow;
