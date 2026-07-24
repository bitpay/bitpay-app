import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {BaseText} from '../../../components/styled/Text';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {SheetContainer} from '../../../components/styled/Containers';
import {Black, White, Success, Caution, Warning} from '../../../styles/colors';
import {ScrollView, SafeAreaView, Text} from 'react-native';
import Button from '../../../components/button/Button';
import {WalletRowProps} from '../../../components/list/WalletRow';
import LockSvg from '../../../../assets/img/wallet/balance/lock.svg';
import SigmaSvg from '../../../../assets/img/wallet/balance/sigma.svg';
import CheckmarkSvg from '../../../../assets/img/wallet/balance/checkmark.svg';
import ConfirmingSvg from '../../../../assets/img/wallet/balance/confirming.svg';
import {useTranslation} from 'react-i18next';
import {formatFiatAmount} from '../../../utils/helper-methods';
import {useAppSelector} from '../../../utils/hooks';

const styles = StyleSheet.create({
  balanceDetailsContainer: {
    minHeight: 500,
  },
  modalHeader: {
    marginTop: 10,
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalHeaderRight: {
    position: 'absolute',
    right: 0,
  },
  labelTip: {
    borderRadius: 8,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14,
  },
  balanceContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  cryptoBalance: {
    fontSize: 16,
  },
  fiatBalance: {
    fontSize: 12.5,
  },
});

const LabelTipBgColor = (type: string | undefined, dark: boolean) => {
  switch (type) {
    case 'warn':
      return dark ? 'rgba(56, 56, 56, 0.8)' : '#fff7f2';
    case 'info':
      return dark ? 'rgba(56, 56, 56, 0.8)' : '#eff1f8';
  }
};

const LabelTip: React.FC<{type?: string; children?: React.ReactNode}> = ({
  type,
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.labelTip,
        {backgroundColor: LabelTipBgColor(type, theme.dark)},
      ]}>
      {children}
    </View>
  );
};

const LabelTipText: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={{color: theme.dark ? 'rgba(255, 255, 255, 0.6)' : '#4a4a4a'}}>
      {children}
    </BaseText>
  );
};

const CryptoBalance: React.FC<{type?: string; children?: React.ReactNode}> = ({
  type,
  children,
}) => {
  const theme = useTheme();
  let color;
  switch (type) {
    case 'success':
      color = Success;
      break;
    case 'warn':
      color = Warning;
      break;
    case 'caution':
      color = Caution;
      break;
    default:
      color = theme.dark ? White : Black;
  }
  return (
    <BaseText style={[styles.cryptoBalance, {color}]}>{children}</BaseText>
  );
};

const FiatBalance: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.fiatBalance,
        {color: theme.dark ? 'rgba(255, 255, 255, 0.6)' : '#4a4a4a'},
      ]}>
      {children}
    </BaseText>
  );
};

interface Props {
  isVisible: boolean;
  closeModal: () => void;
  wallet: WalletRowProps;
}

const BalanceDetailsModal = ({isVisible, closeModal, wallet}: Props) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const isTestnet = wallet.network === 'testnet';
  return (
    <SheetModal isVisible={isVisible} onBackdropPress={closeModal}>
      <SheetContainer
        style={[
          styles.balanceDetailsContainer,
          {backgroundColor: theme.dark ? Black : White},
        ]}>
        <SafeAreaView style={{height: '100%'}}>
          <View style={styles.modalHeader}>
            <BaseText style={styles.modalHeaderText}>
              {t('Spendable balance')}
            </BaseText>
            <View style={styles.modalHeaderRight}>
              <Button
                touchableLibrary={'react-native'}
                buttonType={'pill'}
                buttonStyle={'cancel'}
                onPress={closeModal}>
                {t('Close')}
              </Button>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <LabelTip type="warn">
              <LabelTipText>
                {t(
                  'All of your wallet balance may not be available for immediate spending.',
                  {
                    currencyName: wallet.currencyName,
                  },
                )}
              </LabelTipText>
            </LabelTip>

            {wallet.currencyAbbreviation.toLowerCase() === 'xrp' ? (
              <>
                <View style={styles.row}>
                  <View style={styles.rowLabelContainer}>
                    <LockSvg width={30} height={20} />
                    <BaseText style={styles.rowLabel}>
                      {t('XRP Locked Balance')}
                    </BaseText>
                  </View>
                  <View style={styles.balanceContainer}>
                    <CryptoBalance type="caution">
                      {wallet.cryptoConfirmedLockedBalance} XRP
                    </CryptoBalance>
                    {wallet.fiatConfirmedLockedBalance ? (
                      <FiatBalance>
                        {isTestnet
                          ? t('Test Only - No Value')
                          : formatFiatAmount(
                              wallet.fiatConfirmedLockedBalance,
                              defaultAltCurrency.isoCode,
                            )}
                      </FiatBalance>
                    ) : null}
                  </View>
                </View>
                <LabelTip type="info">
                  <LabelTipText>
                    {t(
                      'The XRP ledger requires that all wallets maintain a minimum balance of XRP. This non-refundable XRP will remain permanently locked in your wallet.',
                      {
                        lockedBalance: wallet.cryptoConfirmedLockedBalance,
                      },
                    )}
                  </LabelTipText>
                </LabelTip>
              </>
            ) : null}

            {wallet.currencyAbbreviation.toLowerCase() === 'sol' ? (
              <>
                <View style={styles.row}>
                  <View style={styles.rowLabelContainer}>
                    <LockSvg width={30} height={20} />
                    <BaseText style={styles.rowLabel}>
                      {t('SOL Locked Balance')}
                    </BaseText>
                  </View>
                  <View style={styles.balanceContainer}>
                    <CryptoBalance type="caution">
                      {wallet.cryptoConfirmedLockedBalance} SOL
                    </CryptoBalance>
                    {wallet.fiatConfirmedLockedBalance ? (
                      <FiatBalance>
                        {isTestnet
                          ? t('Test Only - No Value')
                          : formatFiatAmount(
                              wallet.fiatConfirmedLockedBalance,
                              defaultAltCurrency.isoCode,
                            )}
                      </FiatBalance>
                    ) : null}
                  </View>
                </View>
                <LabelTip type="info">
                  <LabelTipText>
                    {t(
                      'The Solana network requires accounts to maintain a minimum balance of SOL to remain active. This non-refundable amount is used to cover rent-exemption and will remain locked in your wallet.',
                      {
                        lockedBalance: wallet.cryptoConfirmedLockedBalance,
                      },
                    )}
                  </LabelTipText>
                </LabelTip>
              </>
            ) : null}

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <SigmaSvg width={30} height={20} />
                <BaseText style={styles.rowLabel}>{t('Total')}</BaseText>
              </View>
              <View style={styles.balanceContainer}>
                <CryptoBalance>
                  {wallet.cryptoBalance} {wallet.currencyAbbreviation}
                </CryptoBalance>
                {wallet.fiatBalance ? (
                  <FiatBalance>
                    {isTestnet
                      ? t('Test Only - No Value')
                      : formatFiatAmount(
                          wallet.fiatBalance,
                          defaultAltCurrency.isoCode,
                        )}
                  </FiatBalance>
                ) : null}
              </View>
            </View>
            <LabelTip type="info">
              <LabelTipText>
                <Text>
                  {t('The total amount of stored in this wallet.', {
                    wallet: wallet.currencyName,
                  })}
                </Text>
                {wallet.currencyAbbreviation.toLowerCase() === 'xrp' ||
                wallet.currencyAbbreviation.toLowerCase() === 'sol' ? (
                  <Text>
                    {' '}
                    {t('Not including locked funds required for activation.')}
                  </Text>
                ) : null}
              </LabelTipText>
            </LabelTip>

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <CheckmarkSvg width={30} height={30} />
                <BaseText style={styles.rowLabel}>{t('Available')}</BaseText>
              </View>
              <View style={styles.balanceContainer}>
                <CryptoBalance type="success">
                  {wallet.cryptoSpendableBalance} {wallet.currencyAbbreviation}
                </CryptoBalance>
                {wallet.fiatSpendableBalance ? (
                  <FiatBalance>
                    {isTestnet
                      ? t('Test Only - No Value')
                      : formatFiatAmount(
                          wallet.fiatSpendableBalance,
                          defaultAltCurrency.isoCode,
                        )}
                  </FiatBalance>
                ) : null}
              </View>
            </View>
            <LabelTip type="info">
              <LabelTipText>
                {t('The amount of immediately spendable from this wallet.', {
                  currencyName: wallet.currencyName,
                })}
              </LabelTipText>
            </LabelTip>

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <ConfirmingSvg width={30} height={18} />
                <BaseText style={styles.rowLabel}>{t('Confirming')}</BaseText>
              </View>
              <View style={styles.balanceContainer}>
                <CryptoBalance type="warn">
                  {wallet.cryptoPendingBalance} {wallet.currencyAbbreviation}
                </CryptoBalance>
                {wallet.fiatPendingBalance ? (
                  <FiatBalance>
                    {isTestnet
                      ? t('Test Only - No Value')
                      : formatFiatAmount(
                          wallet.fiatPendingBalance,
                          defaultAltCurrency.isoCode,
                        )}
                  </FiatBalance>
                ) : null}
              </View>
            </View>
            <LabelTip type="info">
              <LabelTipText>
                {t(
                  'The amount of stored in this wallet with less than 1 blockchain confirmation.',
                  {currencyName: wallet.currencyName},
                )}
              </LabelTipText>
            </LabelTip>

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <LockSvg width={30} height={20} />
                <BaseText style={styles.rowLabel}>{t('Locked')}</BaseText>
              </View>
              <View style={styles.balanceContainer}>
                <CryptoBalance type="caution">
                  {wallet.cryptoLockedBalance} {wallet.currencyAbbreviation}
                </CryptoBalance>
                {wallet.fiatLockedBalance ? (
                  <FiatBalance>
                    {isTestnet
                      ? t('Test Only - No Value')
                      : formatFiatAmount(
                          wallet.fiatLockedBalance,
                          defaultAltCurrency.isoCode,
                        )}
                  </FiatBalance>
                ) : null}
              </View>
            </View>
            <LabelTip type="info">
              <LabelTipText>
                {t(
                  'The amount in this wallet that is currently allocated to pending transaction proposals. This balance will become available once the proposals are either sent or rejected.',
                  {currencyName: wallet.currencyName},
                )}
              </LabelTipText>
            </LabelTip>
          </ScrollView>
        </SafeAreaView>
      </SheetContainer>
    </SheetModal>
  );
};

export default BalanceDetailsModal;
