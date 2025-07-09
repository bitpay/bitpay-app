import React from 'react';
import styled from 'styled-components/native';
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

const BalanceDetailsContainer = styled(SheetContainer)`
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
  min-height: 500px;
`;

const ModalHeader = styled.View`
  margin: 10px 0 20px 0;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const ModalHeaderText = styled(BaseText)`
  font-size: 18px;
  font-weight: bold;
`;

const ModalHeaderRight = styled(BaseText)`
  position: absolute;
  right: 0;
`;

const LabelTip = styled.View<{type?: string}>`
  background-color: ${({type, theme: {dark}}) => {
    switch (type) {
      case 'warn':
        return dark ? 'rgba(56, 56, 56, 0.8)' : '#fff7f2';
      case 'info':
        return dark ? 'rgba(56, 56, 56, 0.8)' : '#eff1f8';
    }
  }};
  border-radius: 8px;
  padding: 16px;
  margin: 10px 0 20px 0;
`;

const LabelTipText = styled(BaseText)`
  color: ${({theme: {dark}}) =>
    dark ? 'rgba(255, 255, 255, 0.6)' : '#4a4a4a'};
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const RowLabelContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const RowLabel = styled(BaseText)`
  font-size: 14px;
`;

const BalanceContainer = styled.View`
  flex-direction: column;
  justify-content: space-around;
  align-items: flex-end;
`;

const CryptoBalance = styled(BaseText)<{type?: string}>`
  color: ${({type, theme: {dark}}) => {
    switch (type) {
      case 'success':
        return Success;
      case 'warn':
        return Warning;
      case 'caution':
        return Caution;
      default:
        return dark ? White : Black;
    }
  }};
  font-size: 16px;
`;

const FiatBalance = styled(BaseText)`
  font-size: 12.5px;
  color: ${({theme: {dark}}) =>
    dark ? 'rgba(255, 255, 255, 0.6)' : '#4a4a4a'};
`;

interface Props {
  isVisible: boolean;
  closeModal: () => void;
  wallet: WalletRowProps;
}

const BalanceDetailsModal = ({isVisible, closeModal, wallet}: Props) => {
  const {t} = useTranslation();
  const isTestnet = wallet.network === 'testnet';
  return (
    <SheetModal isVisible={isVisible} onBackdropPress={closeModal}>
      <BalanceDetailsContainer>
        <SafeAreaView style={{height: '100%'}}>
          <ModalHeader>
            <ModalHeaderText>{t('Spendable balance')}</ModalHeaderText>
            <ModalHeaderRight>
              <Button
                touchableLibrary={'react-native'}
                buttonType={'pill'}
                buttonStyle={'cancel'}
                onPress={closeModal}>
                {t('Close')}
              </Button>
            </ModalHeaderRight>
          </ModalHeader>
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
                <Row>
                  <RowLabelContainer>
                    <LockSvg width={30} height={20} />
                    <RowLabel>{t('XRP Locked Balance')}</RowLabel>
                  </RowLabelContainer>
                  <BalanceContainer>
                    <CryptoBalance type="caution">
                      {wallet.cryptoConfirmedLockedBalance} XRP
                    </CryptoBalance>
                    <FiatBalance>
                      {isTestnet
                        ? t('Test Only - No Value')
                        : wallet.fiatConfirmedLockedBalance}
                    </FiatBalance>
                  </BalanceContainer>
                </Row>
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
                <Row>
                  <RowLabelContainer>
                    <LockSvg width={30} height={20} />
                    <RowLabel>{t('SOL Locked Balance')}</RowLabel>
                  </RowLabelContainer>
                  <BalanceContainer>
                    <CryptoBalance type="caution">
                      {wallet.cryptoConfirmedLockedBalance} SOL
                    </CryptoBalance>
                    <FiatBalance>
                      {isTestnet
                        ? t('Test Only - No Value')
                        : wallet.fiatConfirmedLockedBalance}
                    </FiatBalance>
                  </BalanceContainer>
                </Row>
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

            <Row>
              <RowLabelContainer>
                <SigmaSvg width={30} height={20} />
                <RowLabel>{t('Total')}</RowLabel>
              </RowLabelContainer>
              <BalanceContainer>
                <CryptoBalance>
                  {wallet.cryptoBalance} {wallet.currencyAbbreviation}
                </CryptoBalance>
                <FiatBalance>
                  {isTestnet ? t('Test Only - No Value') : wallet.fiatBalance}
                </FiatBalance>
              </BalanceContainer>
            </Row>
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

            <Row>
              <RowLabelContainer>
                <CheckmarkSvg width={30} height={30} />
                <RowLabel>{t('Available')}</RowLabel>
              </RowLabelContainer>
              <BalanceContainer>
                <CryptoBalance type="success">
                  {wallet.cryptoSpendableBalance} {wallet.currencyAbbreviation}
                </CryptoBalance>
                <FiatBalance>
                  {isTestnet
                    ? t('Test Only - No Value')
                    : wallet.fiatSpendableBalance}
                </FiatBalance>
              </BalanceContainer>
            </Row>
            <LabelTip type="info">
              <LabelTipText>
                {t('The amount of immediately spendable from this wallet.', {
                  currencyName: wallet.currencyName,
                })}
              </LabelTipText>
            </LabelTip>

            <Row>
              <RowLabelContainer>
                <ConfirmingSvg width={30} height={18} />
                <RowLabel>{t('Confirming')}</RowLabel>
              </RowLabelContainer>
              <BalanceContainer>
                <CryptoBalance type="warn">
                  {wallet.cryptoPendingBalance} {wallet.currencyAbbreviation}
                </CryptoBalance>
                <FiatBalance>
                  {isTestnet
                    ? t('Test Only - No Value')
                    : wallet.fiatPendingBalance}
                </FiatBalance>
              </BalanceContainer>
            </Row>
            <LabelTip type="info">
              <LabelTipText>
                {t(
                  'The amount of stored in this wallet with less than 1 blockchain confirmation.',
                  {currencyName: wallet.currencyName},
                )}
              </LabelTipText>
            </LabelTip>

            <Row>
              <RowLabelContainer>
                <LockSvg width={30} height={20} />
                <RowLabel>{t('Locked')}</RowLabel>
              </RowLabelContainer>
              <BalanceContainer>
                <CryptoBalance type="caution">
                  {wallet.cryptoLockedBalance} {wallet.currencyAbbreviation}
                </CryptoBalance>
                <FiatBalance>
                  {isTestnet
                    ? t('Test Only - No Value')
                    : wallet.fiatLockedBalance}
                </FiatBalance>
              </BalanceContainer>
            </Row>
            <LabelTip type="info">
              <LabelTipText>
                {t(
                  'The amount of stored in this wallet that is allocated as inputs to your pending transaction proposals. The amount is determined using unspent transaction outputs associated with this wallet and may be more than the actual amounts associated with your pending transaction proposals.',
                  {currencyName: wallet.currencyName},
                )}
              </LabelTipText>
            </LabelTip>
          </ScrollView>
        </SafeAreaView>
      </BalanceDetailsContainer>
    </SheetModal>
  );
};

export default BalanceDetailsModal;
