import {StackActions, useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {useAppSelector} from '../../../utils/hooks';
import styled from 'styled-components/native';
import haptic from '../../../components/haptic-feedback/haptic';
import {BaseText, H4, TextAlign} from '../../../components/styled/Text';
import {sleep} from '../../../utils/helper-methods';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {
  BottomNotificationCta,
  BottomNotificationHr,
} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer,
} from '../../wallet/screens/GlobalSelect';
import {useTranslation} from 'react-i18next';
import {Platform, View} from 'react-native';
import {WalletConnectCtaContainer} from '../styled/WalletConnectContainers';
import WCV2KeyWalletsRow from './WCV2KeyWalletsRow';
import {
  WCV2SessionType,
  WCV2Wallet,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {WALLET_CONNECT_SUPPORTED_CHAINS} from '../../../constants/WalletConnectV2';
import {
  ActionContainer,
  CtaContainerAbsolute,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {Network} from '../../../constants';
import {Wallet, Key} from '../../../store/wallet/wallet.models';

const DescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: normal;
  font-size: 16px;
  line-height: 24px;
  margin: 12px;
`;

export default ({
  isVisible,
  session,
  proposal,
  onBackdropPress,
}: {
  isVisible: boolean;
  session?: WCV2SessionType;
  proposal?: any;
  onBackdropPress: (selectedWallets?: any, session?: WCV2SessionType) => void;
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const [chainsSelected, setChainsSelected] =
    useState<{chainId: string; chain: string; network: Network}[]>();
  const {requiredNamespaces, namespaces = undefined} =
    proposal?.params || session;

  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const [allKeys, setAllkeys] = useState<any>();
  const _allKeys = Object.values(keys).filter(key => key.backupComplete);

  const getSelectedWallets = (): {
    chain: string;
    address: string;
    network: Network;
  }[] => {
    const selectedWallets: {
      chain: string;
      address: string;
      network: Network;
    }[] = [];
    allKeys &&
      allKeys.forEach((key: any) => {
        key.wallets.forEach((walletObj: WCV2Wallet) => {
          const {checked, wallet} = walletObj;
          const {receiveAddress, chain, network} = wallet;
          if (checked && receiveAddress) {
            selectedWallets.push({
              address: receiveAddress,
              chain: chain!,
              network: network!,
            });
          }
        });
      });
    return selectedWallets;
  };

  useEffect(() => {
    if (requiredNamespaces) {
      Object.keys(requiredNamespaces).forEach(key => {
        const chains: {chainId: string; chain: string; network: Network}[] = [];
        requiredNamespaces[key].chains.map((chain: string) => {
          if (WALLET_CONNECT_SUPPORTED_CHAINS[chain]) {
            chains.push({
              chainId: chain,
              ...WALLET_CONNECT_SUPPORTED_CHAINS[chain],
            });
          }
        });
        setChainsSelected(chains);
      });
    }
  }, [requiredNamespaces]);

  const setFormattedKeys = () => {
    let allAccounts: string[] = [];
    namespaces &&
      Object.values(namespaces).forEach((n: any) => {
        allAccounts = [...allAccounts, ...n.accounts];
      });
    const formattedKeys = _allKeys
      .map(key => {
        const wallets = key.wallets
          .filter(({chain, network, currencyAbbreviation, receiveAddress}) =>
            chainsSelected?.some(
              c =>
                chain === c.chain &&
                network === c.network &&
                currencyAbbreviation === c.chain &&
                !allAccounts.some(account =>
                  account.endsWith(receiveAddress || ''),
                ),
            ),
          )
          .map((wallet: Wallet) => {
            return {
              wallet,
              checked: false,
            };
          });
        return {
          keyName: key.keyName,
          keyId: key.id,
          wallets,
        };
      })
      .filter(key => key.wallets?.length > 0);
    setAllkeys(formattedKeys);
  };

  useEffect(() => {
    setFormattedKeys();
  }, [chainsSelected]);

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onBackdropPress}>
      <WalletSelectMenuContainer>
        {allKeys && allKeys.length ? (
          <>
            <WalletSelectMenuHeaderContainer>
              <TextAlign align={'center'}>
                <H4>{t('Select Wallets')}</H4>
              </TextAlign>
            </WalletSelectMenuHeaderContainer>
            <DescriptionText>
              {session
                ? t('Which wallets would you like to add to this connection?')
                : t('Which wallets would you like to use for WalletConnect?')}
            </DescriptionText>

            <View>
              <WCV2KeyWalletsRow
                keys={allKeys}
                chainsSelected={chainsSelected}
                onPress={(keyId: string, wallet: WCV2Wallet) => {
                  haptic('impactLight');
                  setAllkeys((prev: any) => {
                    prev &&
                      prev.forEach((k: any) => {
                        if (k && k.keyId === keyId) {
                          const {wallets} = k;
                          wallets.forEach((w: WCV2Wallet) => {
                            if (w.wallet.id === wallet.wallet.id) {
                              w.checked = !w.checked;
                            }
                            return w;
                          });
                        }
                      });
                    return [...prev];
                  });
                }}
              />
            </View>
            <CtaContainerAbsolute
              background={true}
              style={{
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}>
              <ActionContainer>
                <Button
                  state={undefined}
                  disabled={!getSelectedWallets().length}
                  onPress={async () => {
                    haptic('impactLight');
                    if (proposal) {
                      onBackdropPress();
                      await sleep(500);
                      navigation.navigate('WalletConnect', {
                        screen: 'WalletConnectStart',
                        params: {
                          proposal,
                          selectedWallets: getSelectedWallets(),
                        },
                      });
                    } else if (session) {
                      onBackdropPress(getSelectedWallets(), session);
                      await sleep(500);
                    }
                  }}>
                  {t('Continue')}
                </Button>
              </ActionContainer>
            </CtaContainerAbsolute>
          </>
        ) : (
          <>
            <WalletSelectMenuHeaderContainer>
              <TextAlign align={'center'}>
                <H4>{t('No available wallets')}</H4>
              </TextAlign>
            </WalletSelectMenuHeaderContainer>
            <DescriptionText>
              {t(
                "You currently don't have more wallets able to connect with. Would you like to import one?",
              )}
            </DescriptionText>

            <BottomNotificationHr />
            <WalletConnectCtaContainer platform={Platform.OS}>
              <BottomNotificationCta
                suppressHighlighting={true}
                primary={true}
                onPress={async () => {
                  haptic('impactLight');
                  onBackdropPress();
                  await sleep(500);
                  navigation.dispatch(
                    StackActions.replace('Wallet', {
                      screen: 'CreationOptions',
                    }),
                  );
                }}>
                {t('IMPORT WALLET')}
              </BottomNotificationCta>

              <BottomNotificationCta
                suppressHighlighting={true}
                primary={false}
                onPress={async () => {
                  haptic('impactLight');
                  onBackdropPress();
                  await sleep(500);
                }}>
                {t('MAYBE LATER')}
              </BottomNotificationCta>
            </WalletConnectCtaContainer>
          </>
        )}
      </WalletSelectMenuContainer>
    </SheetModal>
  );
};
