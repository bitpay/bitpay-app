import React, {ReactElement, useState} from 'react';
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
import {IsEVMChain} from '../../store/wallet/utils/currency';
import {findWalletById} from '../../store/wallet/utils/wallet';
import {useAppSelector} from '../../utils/hooks';
import {BitpaySupportedCoins} from '../../constants/currencies';
import {SearchableItem} from '../chain-search/ChainSearch';

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

const AccountChainsContainer = styled.TouchableOpacity`
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
  margin-bottom: 24px;
`;

interface AccountContainerProps {
  isLast?: boolean;
}

const AccountContainer = styled.View<AccountContainerProps>`
  gap: 24px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? '#333333' : '#ECEFFD')};
  border-bottom-width: ${({isLast}) => (isLast ? 0 : 1)}px;
  padding-bottom: 24px;
`;

type WalletRowType = KeyWallet | WalletRowProps;

export interface KeyWallet extends Wallet {
  img: string | ((props: any) => ReactElement);
}

export interface KeyWalletsRowProps<T> extends SearchableItem {
  key: string;
  backupComplete?: boolean;
  keyName: string;
  accounts: (AccountRowProps & {assetsByChain?: AssetsByChainData[]})[];
}

interface KeyWalletProps<T extends WalletRowType> {
  keyAccounts: KeyWalletsRowProps<T>[];
  keySvg?: React.FC<SvgProps>;
  onPress: (wallet: Wallet) => void;
  currency?: string;
  hideBalance: boolean;
}

const KeyWalletsRow = <T extends WalletRowType>({
  keyAccounts,
  keySvg = KeySvg,
  onPress,
  currency,
  hideBalance,
}: KeyWalletProps<T>) => {
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

  return (
    <View>
      {keyAccounts.map((key, keyIndex) => (
        <KeyWalletsRowContainer
          key={key.key}
          isLast={keyIndex === keyAccounts.length - 1}>
          {key.accounts.length > 0 && (
            <KeyNameContainer noBorder={!!currency}>
              {keySvg({})}
              <KeyName>{key.keyName || 'My Key'}</KeyName>
              {!key.backupComplete &&
                !key.accounts[0].wallets[0].coinbaseAccount && (
                  <NeedBackupText>{t('Needs Backup')}</NeedBackupText>
                )}
            </KeyNameContainer>
          )}
          {key.accounts.map((account, index) =>
            IsEVMChain(account.chains[0]) ? (
              <AccountContainer
                key={account.id}
                isLast={index === key.accounts.length - 1}>
                <AccountChainsContainer
                  activeOpacity={ActiveOpacity}
                  onPress={() => onHide(account.receiveAddress)}>
                  <Blockie size={19} seed={account.receiveAddress} />
                  <Column>
                    <H5 ellipsizeMode="tail" numberOfLines={1}>
                      {account.accountName}
                    </H5>
                  </Column>
                  <Column style={{alignItems: 'flex-end'}}>
                    <ChainAssetsContainer>
                      <BadgeContainer>
                        <Badge>
                          {formatCryptoAddress(account.receiveAddress)}
                        </Badge>
                      </BadgeContainer>

                      <ChevronContainer>
                        {showChainAssets?.[account.receiveAddress] ===
                          undefined ||
                        showChainAssets[account.receiveAddress] ? (
                          theme.dark ? (
                            <ChevronDownSvgDark width={10} height={6} />
                          ) : (
                            <ChevronDownSvgLight width={10} height={6} />
                          )
                        ) : theme.dark ? (
                          <ChevronUpSvgDark width={10} height={6} />
                        ) : (
                          <ChevronUpSvgLight width={10} height={6} />
                        )}
                      </ChevronContainer>
                    </ChainAssetsContainer>
                  </Column>
                </AccountChainsContainer>
                {showChainAssets?.[account.receiveAddress] === undefined ||
                showChainAssets[account.receiveAddress]
                  ? account?.assetsByChain?.map(
                      ({chain, chainImg, chainName, chainAssetsList}) => (
                        <View key={chain}>
                          <AccountChainTitleContainer>
                            <CurrencyImageContainer>
                              <CurrencyImage img={chainImg} size={20} />
                            </CurrencyImageContainer>
                            <H5 ellipsizeMode="tail" numberOfLines={1}>
                              {chainName}
                            </H5>
                          </AccountChainTitleContainer>

                          <View
                            style={{marginTop: -10, marginLeft: -10}}
                            key={chain}>
                            {chainAssetsList.map((asset, index) => (
                              <WalletRow
                                key={asset.id}
                                id={asset.id}
                                hideBalance={false}
                                isLast={false}
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
                    )
                  : null}
              </AccountContainer>
            ) : (
              account?.wallets?.map(wallet => (
                <AccountContainer
                  key={wallet.id}
                  isLast={index === key.accounts.length - 1}>
                  <AccountChainsContainer
                    activeOpacity={ActiveOpacity}
                    onPress={() => onHide(wallet.id)}>
                    <CurrencyImage img={wallet.img} size={20} />
                    <Column>
                      <H5 ellipsizeMode="tail" numberOfLines={1}>
                        {
                          BitpaySupportedCoins[
                            wallet?.currencyAbbreviation?.toLowerCase()
                          ]?.name
                        }
                      </H5>
                    </Column>
                    <Column style={{alignItems: 'flex-end'}}>
                      <ChainAssetsContainer>
                        <ChevronContainer>
                          {showChainAssets?.[wallet.id] === undefined ||
                          showChainAssets[wallet.id] ? (
                            theme.dark ? (
                              <ChevronDownSvgDark width={10} height={6} />
                            ) : (
                              <ChevronDownSvgLight width={10} height={6} />
                            )
                          ) : theme.dark ? (
                            <ChevronUpSvgDark width={10} height={6} />
                          ) : (
                            <ChevronUpSvgLight width={10} height={6} />
                          )}
                        </ChevronContainer>
                      </ChainAssetsContainer>
                    </Column>
                  </AccountChainsContainer>

                  {showChainAssets?.[wallet.id] === undefined ||
                  showChainAssets[wallet.id] ? (
                    <View style={{marginTop: -10, marginLeft: -10}}>
                      <WalletRow
                        id={wallet.id}
                        hideBalance={false}
                        isLast={false}
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
                  ) : null}
                </AccountContainer>
              ))
            ),
          )}
        </KeyWalletsRowContainer>
      ))}
    </View>
  );
};

export default KeyWalletsRow;
