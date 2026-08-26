import React, {ReactElement, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Badge, BaseText, H5} from '../styled/Text';
import KeySvg from '../../../assets/img/key.svg';
import {
  LightBlack,
  LightBlue,
  Slate30,
  SlateDark,
  White,
} from '../../styles/colors';
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
import {useTheme} from '../../contexts';
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

const styles = StyleSheet.create({
  keyWalletsRowContainer: {
    marginBottom: 0,
    borderBottomWidth: 0,
    gap: 24,
  },
  outerContainer: {
    paddingBottom: 10,
  },
  keyNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  keyName: {
    marginLeft: 10,
  },
  needBackupText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 3,
    marginLeft: 'auto' as any,
  },
  currencyImageContainer: {
    height: 30,
    width: 30,
    display: 'flex',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 8,
  },
  chainAssetsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
  accountChainsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 0,
    gap: 11,
  },
  accountChainTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountContainer: {
    gap: 12,
    paddingBottom: 12,
  },
  coinbaseAccountContainer: {
    marginTop: -10,
    marginRight: 0,
    marginBottom: -15,
    marginLeft: -10,
  },
});

interface KeyNameContainerProps {
  noBorder?: boolean;
}

const KeyNameContainer: React.FC<
  KeyNameContainerProps & React.ComponentProps<typeof View>
> = ({noBorder, style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.keyNameContainer,
        {
          borderBottomColor: theme.dark ? SlateDark : LightBlue,
          borderBottomWidth: noBorder ? 0 : 1,
          marginLeft: noBorder ? 10 : undefined,
          paddingBottom: noBorder ? 0 : 10,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const KeyName: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.keyName, {color: theme.dark ? White : SlateDark}, style]}
      {...rest}
    />
  );
};

const NeedBackupText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.needBackupText,
        {
          color: theme.dark ? White : SlateDark,
          borderColor: theme.dark ? White : Slate30,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const AccountChainsContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.accountChainsContainer,
        {borderBottomColor: theme.dark ? LightBlack : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

interface AccountContainerProps {
  isLast?: boolean;
  isSameChain?: boolean;
}

const AccountContainer: React.FC<
  AccountContainerProps & React.ComponentProps<typeof View>
> = ({isLast, style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.accountContainer,
        {
          borderBottomColor: theme.dark ? '#333333' : LightBlue,
          borderBottomWidth: isLast ? 0 : 1,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const UtxoAccountContainer: React.FC<
  AccountContainerProps & React.ComponentProps<typeof View>
> = ({isLast, isSameChain, style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderBottomColor: theme.dark ? '#333333' : LightBlue,
          borderBottomWidth: isLast ? 0 : 1,
          paddingBottom: isLast ? 0 : 12,
          marginTop: isSameChain ? -24 : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export interface KeyWallet extends Wallet {
  img: string | ((props: any) => ReactElement);
}

export type KeyWalletsAccountRow = AccountRowProps & {
  assetsByChain?: AssetsByChainData[];
  checked?: boolean;
};

export type KeyWalletsMergedAccountRow =
  | WalletRowProps
  | (AccountRowProps & {assetsByChain?: AssetsByChainData[]});

export interface KeyWalletsRowProps extends SearchableItem {
  key: string;
  backupComplete?: boolean;
  keyName: string;
  accounts: KeyWalletsAccountRow[];
  mergedUtxoAndEvmAccounts: KeyWalletsMergedAccountRow[];
  coinbaseAccounts?: WalletRowProps[];
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
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
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
    <View style={styles.outerContainer}>
      {keyAccounts.map(key => (
        <View style={styles.keyWalletsRowContainer} key={key.key}>
          {(key.accounts?.length > 0 ||
            (key.coinbaseAccounts?.length ?? 0) > 0 ||
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
                    testID={`key-wallets-evm-account-toggle-${evmAccount?.receiveAddress}`}
                    accessibilityLabel={`${evmAccount?.accountName} account`}
                    onPress={() => onHide(evmAccount?.receiveAddress)}>
                    <Blockie size={19} seed={evmAccount?.receiveAddress} />
                    <Column>
                      <H5 ellipsizeMode="tail" numberOfLines={1}>
                        {evmAccount?.accountName}
                      </H5>
                    </Column>
                    <Column style={{alignItems: 'flex-end'}}>
                      <Row style={styles.chainAssetsContainer}>
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
                      </Row>
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
                            <View style={styles.accountChainTitleContainer}>
                              <View style={styles.currencyImageContainer}>
                                <CurrencyImage img={chainImg} size={20} />
                              </View>
                              <H5 ellipsizeMode="tail" numberOfLines={1}>
                                {chainName}
                              </H5>
                            </View>

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
                        testID={`key-wallets-utxo-chain-toggle-${wallet?.chain}-${key.key}`}
                        accessibilityLabel={`${
                          BitpaySupportedCoins[
                            wallet?.currencyAbbreviation?.toLowerCase() as keyof typeof BitpaySupportedCoins
                          ]?.name ?? wallet?.chain
                        } chain`}
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
                          <Row style={styles.chainAssetsContainer}>
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
                          </Row>
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
            <View key={index} style={styles.coinbaseAccountContainer}>
              <WalletRow
                id={wallet.id}
                hideBalance={hideBalance}
                noBorder={true}
                onPress={() => onPress(wallet)}
                wallet={wallet}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

export default KeyWalletsRow;
