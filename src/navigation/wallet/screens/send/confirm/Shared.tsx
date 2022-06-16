import {
  FeeOptions,
  TxDetailsAmount,
  TxDetailsFee,
  TxDetailsSendingFrom,
  TxDetailsSendingTo,
} from '../../../../../store/wallet/wallet.models';
import {H4, H5, H6, H7, TextAlign} from '../../../../../components/styled/Text';
import SendToPill from '../../../components/SendToPill';
import {
  Column,
  Hr,
  Row,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import React, {ReactChild, useCallback, useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {Pressable, ScrollView, View} from 'react-native';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';
import ChevronRightSvg from '../../../../../../assets/img/angle-right.svg';
import {sleep} from '../../../../../utils/helper-methods';
import {WalletsAndAccounts} from '../../../../../store/wallet/utils/wallet';
import {WalletRowProps} from '../../../../../components/list/WalletRow';
import KeyWalletsRow, {
  KeyWallet,
} from '../../../../../components/list/KeyWalletsRow';
import SheetModal from '../../../../../components/modal/base/sheet/SheetModal';
import {
  WalletSelectMenuBodyContainer,
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer,
} from '../../GlobalSelect';
import CoinbaseSmall from '../../../../../../assets/img/logos/coinbase-small.svg';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch} from '../../../../../utils/hooks';
import {showNoWalletsModal} from '../../../../../store/wallet/effects/send/send';
import Clipboard from '@react-native-community/clipboard';
import CopiedSvg from '../../../../../../assets/img/copied-success.svg';
import {useTranslation} from 'react-i18next';

// Styled
export const ConfirmContainer = styled.SafeAreaView`
  flex: 1;
`;

export const HeaderTitle = styled(H6)`
  margin-top: 20px;
  margin-bottom: 15px;
  justify-content: center;
  text-transform: uppercase;
`;

export interface DetailContainerParams {
  height?: number;
}

export const DetailContainer = styled.View<DetailContainerParams>`
  min-height: 53px;
  padding: 20px 0;
  justify-content: center;
  ${({height}) => (height ? `height: ${height}px;` : '')}
`;

export const PressableDetailContainer = styled.TouchableOpacity<DetailContainerParams>`
  min-height: 53px;
  padding: 20px 0;
  justify-content: center;
  ${({height}) => (height ? `height: ${height}px;` : '')}
`;

export const DetailRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`;

export const DetailColumn = styled(Column)`
  align-items: flex-end;
`;

export const DetailsList = styled(ScrollView)`
  padding: 0 ${ScreenGutter};
`;

// Row UI
export const Header = ({
  children,
  hr,
}: {
  children: ReactChild;
  hr?: boolean;
}): JSX.Element | null => {
  if (children) {
    return (
      <>
        <HeaderTitle>{children}</HeaderTitle>
        {hr && <Hr />}
      </>
    );
  } else {
    return null;
  }
};

export const SendingTo = ({
  recipient,
  hr,
}: {
  recipient: TxDetailsSendingTo | undefined;
  hr?: boolean;
}): JSX.Element | null => {
  const {t} = useTranslation();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [copied]);

  if (recipient) {
    const {recipientName, recipientAddress, img, recipientFullAddress} =
      recipient;

    const copyText = (text: string) => {
      if (!copied && !!text) {
        Clipboard.setString(text);
        setCopied(true);
      }
    };

    return (
      <>
        <DetailContainer height={83}>
          <DetailRow>
            <H7>{t('Sending to')}</H7>
            <SendToPill
              onPress={() => copyText(recipientFullAddress || '')}
              icon={
                copied ? (
                  <CopiedSvg width={18} />
                ) : (
                  <CurrencyImage img={img} size={18} />
                )
              }
              description={recipientName || recipientAddress || ''}
            />
          </DetailRow>
        </DetailContainer>
        {hr && <Hr />}
      </>
    );
  } else {
    return null;
  }
};

export const Fee = ({
  fee,
  hr,
  onPress,
  feeOptions,
  hideFeeOptions,
}: {
  fee: TxDetailsFee | undefined;
  feeOptions: FeeOptions;
  hideFeeOptions?: boolean;
  hr?: boolean;
  onPress?: () => void;
}): JSX.Element | null => {
  const {t} = useTranslation();
  if (fee) {
    const {feeLevel, cryptoAmount, fiatAmount, percentageOfTotalAmount} = fee;
    // @ts-ignore
    const viewFee = feeOptions[feeLevel].toUpperCase();
    return (
      <>
        <Pressable disabled={!onPress} onPress={onPress}>
          <DetailContainer>
            <DetailRow>
              <H7>{t('Miner fee')}</H7>
              <DetailColumn>
                {feeLevel && !hideFeeOptions ? <H5>{viewFee}</H5> : null}
                <H6>{cryptoAmount}</H6>
                <H7>
                  {t(' ( of total amount)', {
                    fiatAmount,
                    percentageOfTotalAmount,
                  })}
                </H7>
              </DetailColumn>
              {onPress ? (
                <View style={{marginLeft: 10}}>
                  <ChevronRightSvg />
                </View>
              ) : null}
            </DetailRow>
          </DetailContainer>
        </Pressable>
        {hr && <Hr />}
      </>
    );
  } else {
    return null;
  }
};

export const SendingFrom = ({
  sender,
  onPress,
  hr,
}: {
  sender: TxDetailsSendingFrom | undefined;
  onPress?: () => void;
  hr?: boolean;
}): JSX.Element | null => {
  const {t} = useTranslation();
  if (sender) {
    const {walletName, img} = sender;
    return (
      <>
        <DetailContainer height={83}>
          <DetailRow>
            <H7>{t('Sending from')}</H7>
            <SendToPill
              onPress={onPress}
              icon={CurrencyImage({img, size: 18})}
              description={walletName}
            />
          </DetailRow>
        </DetailContainer>
        {hr && <Hr />}
      </>
    );
  } else {
    return null;
  }
};

export const Amount = ({
  description,
  amount,
  fiatOnly,
  hr,
}: {
  description: string | undefined;
  amount: TxDetailsAmount | undefined;
  fiatOnly?: boolean;
  hr?: boolean;
}): JSX.Element | null => {
  if (amount && description) {
    const {cryptoAmount, fiatAmount} = amount;
    return (
      <>
        <DetailContainer>
          <DetailRow>
            {fiatOnly ? (
              <H7>{description}</H7>
            ) : (
              <H6>{description.toUpperCase()}</H6>
            )}
            <DetailColumn>
              {fiatOnly ? (
                <H7>{fiatAmount}</H7>
              ) : (
                <>
                  <H4>{cryptoAmount}</H4>
                  <H7>{fiatAmount}</H7>
                </>
              )}
            </DetailColumn>
          </DetailRow>
        </DetailContainer>
        {hr && <Hr />}
      </>
    );
  } else {
    return null;
  }
};

export const SharedDetailRow = ({
  description,
  value,
  hr,
  onPress,
}: {
  description: string;
  value: number | string;
  hr?: boolean;
  onPress?: () => void;
}): JSX.Element | null => {
  return (
    <>
      {onPress ? (
        <PressableDetailContainer onPress={onPress}>
          <DetailRow>
            <H7>{description}</H7>
            <H7>{value}</H7>
          </DetailRow>
        </PressableDetailContainer>
      ) : (
        <DetailContainer>
          <DetailRow>
            <H7>{description}</H7>
            <H7>{value}</H7>
          </DetailRow>
        </DetailContainer>
      )}
      {hr && <Hr />}
    </>
  );
};

export const WalletSelector = ({
  walletsAndAccounts,
  onWalletSelect,
  onCoinbaseAccountSelect,
  onBackdropPress,
  isVisible,
  setWalletSelectorVisible,
}: {
  walletsAndAccounts: WalletsAndAccounts;
  onWalletSelect: (wallet: KeyWallet) => void;
  onCoinbaseAccountSelect: (account: WalletRowProps) => void;
  onBackdropPress: () => void;
  isVisible: boolean;
  setWalletSelectorVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [autoSelectSingleWallet, setAutoSelectSingleWallet] = useState(true);

  const selectOption = useCallback(
    async (onSelect: () => void, waitForClose?: boolean) => {
      setWalletSelectorVisible(false);
      setAutoSelectSingleWallet(false);
      if (waitForClose) {
        // not ideal - will dive into why the timeout has to be this long
        await sleep(600);
      }
      onSelect();
    },
    [setWalletSelectorVisible],
  );

  const showSelector = useCallback(
    async autoSelect => {
      const {keyWallets, coinbaseWallets} = walletsAndAccounts;
      if (keyWallets.length || coinbaseWallets.length) {
        if (autoSelect) {
          if (
            keyWallets.length === 1 &&
            keyWallets[0].wallets.length === 1 &&
            coinbaseWallets.length === 0
          ) {
            return selectOption(() => onWalletSelect(keyWallets[0].wallets[0]));
          } else if (
            coinbaseWallets.length === 1 &&
            coinbaseWallets[0].wallets.length === 1 &&
            keyWallets.length === 0
          ) {
            return selectOption(() =>
              onCoinbaseAccountSelect(coinbaseWallets[0].wallets[0]),
            );
          }
        }
        await sleep(10);
        setSelectorVisible(true);
      } else {
        dispatch(showNoWalletsModal({navigation}));
      }
    },
    [
      dispatch,
      navigation,
      onCoinbaseAccountSelect,
      onWalletSelect,
      selectOption,
      walletsAndAccounts,
    ],
  );

  useEffect(() => {
    isVisible
      ? showSelector(autoSelectSingleWallet)
      : setSelectorVisible(false);
  }, [autoSelectSingleWallet, isVisible, showSelector]);

  return (
    <SheetModal isVisible={selectorVisible} onBackdropPress={onBackdropPress}>
      <WalletSelectMenuContainer>
        <WalletSelectMenuHeaderContainer>
          <TextAlign align={'center'}>
            <H4>{t('Select a wallet')}</H4>
          </TextAlign>
        </WalletSelectMenuHeaderContainer>
        <WalletSelectMenuBodyContainer>
          <KeyWalletsRow<KeyWallet>
            keyWallets={walletsAndAccounts.keyWallets}
            onPress={wallet => selectOption(() => onWalletSelect(wallet), true)}
          />
          <KeyWalletsRow<WalletRowProps>
            keyWallets={walletsAndAccounts.coinbaseWallets}
            keySvg={CoinbaseSmall}
            onPress={account =>
              selectOption(() => onCoinbaseAccountSelect(account), true)
            }
          />
        </WalletSelectMenuBodyContainer>
      </WalletSelectMenuContainer>
    </SheetModal>
  );
};
