import {
  FeeOptions,
  TxDetailsAmount,
  TxDetailsFee,
  TxDetailsSendingFrom,
  TxDetailsSendingTo,
} from '../../../../../store/wallet/wallet.models';
import {H4, H5, H6, H7} from '../../../../../components/styled/Text';
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
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../../utils/helper-methods';
import {WalletsAndAccounts} from '../../../../../store/wallet/utils/wallet';
import {
  buildTestBadge,
  WalletRowProps,
} from '../../../../../components/list/WalletRow';
import KeyWalletsRow, {
  KeyWallet,
} from '../../../../../components/list/KeyWalletsRow';
import SheetModal from '../../../../../components/modal/base/sheet/SheetModal';
import {
  WalletSelectMenuBodyContainer,
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer,
  WalletSelectMenuHeaderIconContainer,
} from '../../GlobalSelect';
import CoinbaseSmall from '../../../../../../assets/img/logos/coinbase-small.svg';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch} from '../../../../../utils/hooks';
import {showNoWalletsModal} from '../../../../../store/wallet/effects/send/send';
import Clipboard from '@react-native-community/clipboard';
import CopiedSvg from '../../../../../../assets/img/copied-success.svg';

import {useTranslation} from 'react-i18next';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import AddressCard from '../../../components/AddressCard';
import {LuckySevens} from '../../../../../styles/colors';
import {IsERCToken} from '../../../../../store/wallet/utils/currency';
import {CurrencyListIcons} from '../../../../../constants/SupportedCurrencyOptions';
import ContactIcon from '../../../../tabs/contacts/components/ContactIcon';

// Styled
export const ConfirmContainer = styled.SafeAreaView`
  flex: 1;
`;

export const ConfirmScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
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
  min-height: 60px;
  padding: 20px 0;
  justify-content: center;
  ${({height}) => (height ? `height: ${height}px;` : '')}
`;

export const PressableDetailContainer = styled.TouchableOpacity<DetailContainerParams>`
  min-height: 60px;
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

export const ConfirmSubText = styled(H7)`
  color: ${({theme}) => (theme.dark ? LuckySevens : theme.colors.text)};
`;

export const SendToPillContainer = styled.View`
  height: 37px;
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

interface SendingToProps {
  recipient: TxDetailsSendingTo | undefined;
  recipientList?: TxDetailsSendingTo[];
  hr?: boolean;
}

export const SendingTo: React.VFC<SendingToProps> = ({
  recipient,
  recipientList,
  hr,
}) => {
  const {t} = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showRecipientCards, setShowRecipientCards] = useState(true);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [copied]);

  if (!recipient) {
    return null;
  }

  const {
    recipientName,
    recipientAddress,
    recipientEmail,
    img,
    recipientFullAddress,
    recipientCoin,
    recipientChain,
    recipientType,
  } = recipient;

  let badgeImg;

  if (
    recipientCoin &&
    recipientChain &&
    IsERCToken(recipientCoin, recipientChain)
  ) {
    const _recipientCoin = getCurrencyAbbreviation(
      recipientCoin,
      recipientChain,
    );
    badgeImg = getBadgeImg(_recipientCoin, recipientChain);
  }
  const copyText = (text: string) => {
    if (!copied && !!text) {
      Clipboard.setString(text);
      setCopied(true);
    }
  };

  let description;
  if (recipientList) {
    description =
      recipientList.length +
      ' ' +
      (recipientList.length === 1 ? t('Recipient') : t('Recipients'));
  } else {
    description = recipientName || recipientEmail || recipientAddress || '';
  }

  return (
    <>
      <DetailContainer height={83}>
        <DetailRow>
          <H7>{t('Sending to')}</H7>
          <SendToPill
            onPress={() =>
              !recipientList
                ? copyText(recipientFullAddress || '')
                : setShowRecipientCards(!showRecipientCards)
            }
            icon={
              copied ? (
                <CopiedSvg width={18} />
              ) : recipientType === 'contact' || recipientEmail ? (
                <ContactIcon name={description} size={20} />
              ) : (
                <CurrencyImage img={img} size={18} badgeUri={badgeImg} />
              )
            }
            description={description}
            dropDown={!!recipientList}
          />
        </DetailRow>
      </DetailContainer>
      {hr && <Hr />}
      {showRecipientCards && recipientList
        ? recipientList.map((r, i) => (
            <AddressCard key={i.toString()} recipient={r} />
          ))
        : null}
      {showRecipientCards && recipientList && <Hr />}
    </>
  );
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
          <DetailContainer height={84}>
            <DetailRow>
              <H7>{t('Miner fee')}</H7>
              <DetailColumn>
                {feeLevel && !hideFeeOptions ? <H5>{viewFee}</H5> : null}
                <H6>{cryptoAmount}</H6>
                <ConfirmSubText>
                  {t(' ( of total amount)', {
                    fiatAmount,
                    percentageOfTotalAmount,
                  })}
                </ConfirmSubText>
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

interface SendingFromProps {
  onPress?: () => void;
  sender: TxDetailsSendingFrom | undefined;
  hr?: boolean;
}

export const SendingFrom: React.VFC<SendingFromProps> = ({
  sender,
  onPress,
  hr,
}) => {
  const {t} = useTranslation();

  if (!sender) {
    return null;
  }

  const {walletName, img, badgeImg} = sender;
  const icon = <CurrencyImage img={img} size={18} badgeUri={badgeImg} />;

  return (
    <>
      <DetailContainer height={83}>
        <DetailRow>
          <H7>{t('Sending from')}</H7>
          <SendToPill onPress={onPress} icon={icon} description={walletName} />
        </DetailRow>
      </DetailContainer>
      {hr && <Hr />}
    </>
  );
};

export const Amount = ({
  description,
  amount,
  fiatOnly,
  height,
  hr,
  chain,
  network,
}: {
  description: string | undefined;
  amount: TxDetailsAmount | undefined;
  fiatOnly?: boolean;
  height?: number;
  hr?: boolean;
  chain?: string | undefined;
  network?: string | undefined;
}): JSX.Element | null => {
  if (amount && description) {
    const {cryptoAmount, fiatAmount} = amount;
    return (
      <>
        <DetailContainer height={height}>
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
                  {network &&
                  !['livenet', 'mainnet'].includes(network) &&
                  chain ? (
                    buildTestBadge(network, chain, false)
                  ) : (
                    <ConfirmSubText>{fiatAmount}</ConfirmSubText>
                  )}
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
  height,
  hr,
  onPress,
}: {
  description: string;
  value: number | string;
  height?: number;
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
        <DetailContainer height={height}>
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

export const RemainingTime = ({
  invoiceExpirationTime,
  setDisableSwipeSendButton,
}: {
  invoiceExpirationTime: number;
  setDisableSwipeSendButton: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const {t} = useTranslation();

  const expirationTime = Math.floor(
    new Date(invoiceExpirationTime).getTime() / 1000,
  );

  const computeRemainingTime = useCallback(() => {
    const now = Math.floor(Date.now() / 1000);
    const totalSecs = expirationTime - now;
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
  }, [expirationTime]);

  const [remainingTime, setRemainingTime] = useState<string>(
    computeRemainingTime(),
  );

  useEffect(() => {
    let interval: any;
    if (expirationTime) {
      interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);

        if (now > expirationTime) {
          setRemainingTime('Expired');
          setDisableSwipeSendButton(true);
          clearInterval(interval);
          return;
        }

        setRemainingTime(computeRemainingTime());
      }, 1000); //each count lasts for a second
    }
    //cleanup the interval on complete
    if (interval) {
      return () => clearInterval(interval);
    }
  }, [computeRemainingTime, expirationTime, setDisableSwipeSendButton]);

  return (
    <SharedDetailRow description={t('Expires')} value={remainingTime} hr />
  );
};

export const WalletSelector = ({
  walletsAndAccounts,
  onWalletSelect,
  onCoinbaseAccountSelect,
  onBackdropPress,
  isVisible,
  setWalletSelectorVisible,
  autoSelectIfOnlyOneWallet,
  currency,
  chain,
}: {
  walletsAndAccounts: WalletsAndAccounts;
  onWalletSelect: (wallet: KeyWallet) => void;
  onCoinbaseAccountSelect: (account: WalletRowProps) => void;
  onBackdropPress: () => void;
  isVisible: boolean;
  setWalletSelectorVisible: React.Dispatch<React.SetStateAction<boolean>>;
  autoSelectIfOnlyOneWallet?: boolean;
  currency?: string;
  chain?: string;
}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [autoSelectSingleWallet, setAutoSelectSingleWallet] = useState(
    typeof autoSelectIfOnlyOneWallet === 'undefined'
      ? true
      : autoSelectIfOnlyOneWallet,
  );

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
        <WalletSelectMenuHeaderContainer currency={currency}>
          {currency ? (
            <WalletSelectMenuHeaderIconContainer>
              <CurrencyIconAndBadge
                coin={currency}
                chain={chain || ''}
                size={30}
              />
            </WalletSelectMenuHeaderIconContainer>
          ) : null}
          <H4>{t('Select a Wallet')}</H4>
        </WalletSelectMenuHeaderContainer>
        <WalletSelectMenuBodyContainer>
          <KeyWalletsRow<KeyWallet>
            currency={currency}
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

const CurrencyImageAndBadgeContainer = styled.View<{height: number}>`
  height: ${({height}) => height}px;
`;

export const CurrencyIconAndBadge = ({
  coin,
  chain,
  size,
}: {
  coin: string;
  chain: string;
  size: number;
}) => {
  const fullCurrencyAbbreviation = getCurrencyAbbreviation(coin, chain);
  const badgeImg = IsERCToken(coin, chain)
    ? getBadgeImg(coin, chain)
    : undefined;
  const CurrencyIcon =
    CurrencyListIcons[fullCurrencyAbbreviation.toLowerCase()];

  return (
    <CurrencyImageAndBadgeContainer height={size}>
      <CurrencyImage
        img={() => <CurrencyIcon height={size} />}
        badgeUri={badgeImg}
        size={size}
      />
    </CurrencyImageAndBadgeContainer>
  );
};

export const ExchangeRate = ({
  description,
  rateStr,
}: {
  description: string;
  rateStr: string;
}): JSX.Element | null => {
  return <SharedDetailRow description={description} value={rateStr} hr />;
};
