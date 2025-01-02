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
  margin-bottom: 12px;
`;

interface AccountContainerProps {
  isLast?: boolean;
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
  padding-bottom: 12px;
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
  mergedUtxoAccounts: WalletRowProps[][];
  coinbaseAccounts: WalletRowProps[];
}

interface KeyWalletProps {
  keyAccounts: KeyWalletsRowProps[];
  keySvg?: React.FC<SvgProps>;
  onPress: (wallet: Wallet | WalletRowProps) => void;
  currency?: string;
  hideBalance: boolean;
}

const KeyWalletsRow = ({
  keyAccounts,
  keySvg = KeySvg,
  onPress,
  currency,
  hideBalance,
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

  return (
    <OuterContainer>
      {keyAccounts.map((key, keyIndex) => (
        <KeyWalletsRowContainer
          key={key.key}
          isLast={keyIndex === keyAccounts.length - 1}>
          {(key.accounts?.length > 0 ||
            key.coinbaseAccounts?.length > 0 ||
            Object.values(key?.mergedUtxoAccounts ?? {})?.length > 0) && (
            <KeyNameContainer noBorder={!!currency}>
              {keySvg({})}
              <KeyName>{key.keyName || 'My Key'}</KeyName>
              {!key.backupComplete && !key?.coinbaseAccounts && (
                <NeedBackupText>{t('Needs Backup')}</NeedBackupText>
              )}
            </KeyNameContainer>
          )}
          {key.accounts?.map((account, index) =>
            IsEVMChain(account.chains[0]) ? (
              <AccountContainer
                key={account.id}
                isLast={
                  index === key.accounts.length - 1 &&
                  Object.values(key?.mergedUtxoAccounts).length === 0
                }>
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
                            {chainAssetsList.map(asset => (
                              <WalletRow
                                key={asset.id}
                                id={asset.id}
                                hideBalance={hideBalance}
                                noBorder={true}
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
            ) : null,
          )}
          {key?.mergedUtxoAccounts
            ? Object.values(key?.mergedUtxoAccounts).map(
                (mergedUtxoAccount, index) => (
                  <UtxoAccountContainer
                    key={mergedUtxoAccount[0]?.chain || index}
                    isLast={index === Object.values(key?.mergedUtxoAccounts).length - 1}>
                    <AccountChainsContainer
                      activeOpacity={ActiveOpacity}
                      onPress={() =>
                        mergedUtxoAccount?.[0]?.chain &&
                        onHide(`${mergedUtxoAccount[0].chain}-${key.key}`)
                      }>
                      <CurrencyImage
                        img={mergedUtxoAccount[0]?.img}
                        size={20}
                      />
                      <Column>
                        <H5 ellipsizeMode="tail" numberOfLines={1}>
                          {BitpaySupportedCoins[
                            mergedUtxoAccount[0]?.currencyAbbreviation?.toLowerCase()
                          ]?.name ?? ''}
                        </H5>
                      </Column>
                      <Column style={{alignItems: 'flex-end'}}>
                        <ChainAssetsContainer>
                          <ChevronContainer>
                            {showChainAssets?.[
                              `${mergedUtxoAccount[0]?.chain}-${key.key}`
                            ] === undefined ||
                            showChainAssets[
                              `${mergedUtxoAccount[0]?.chain}-${key.key}`
                            ] ? (
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

                    {mergedUtxoAccount?.map(wallet => {
                      const showAssets =
                        showChainAssets?.[`${wallet.chain}-${key.key}`] ===
                          undefined ||
                        showChainAssets?.[`${wallet.chain}-${key.key}`];

                      return showAssets ? (
                        <View style={{marginLeft: -10}} key={wallet.id}>
                          <WalletRow
                            id={wallet.id}
                            hideBalance={hideBalance}
                            noBorder={true}
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
                      ) : null;
                    })}
                  </UtxoAccountContainer>
                ),
              )
            : null}

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
