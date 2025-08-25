import {
  FeeOptions,
  TxDetailsAmount,
  TxDetailsFee,
  TxDetailsSendingFrom,
  TxDetailsSendingTo,
  Wallet,
} from '../../../../../store/wallet/wallet.models';
import {H4, H5, H6, H7} from '../../../../../components/styled/Text';
import SendToPill from '../../../components/SendToPill';
import {
  Column,
  Hr,
  Row,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import React, {ReactNode, useCallback, useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {Pressable, ScrollView, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';
import ChevronRightSvg from '../../../../../../assets/img/angle-right.svg';
import InfoSvg from '../../../../../../assets/img/info.svg';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
  formatCryptoAddress,
} from '../../../../../utils/helper-methods';
import {
  findWalletById,
  WalletsAndAccounts,
} from '../../../../../store/wallet/utils/wallet';
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
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {showNoWalletsModal} from '../../../../../store/wallet/effects/send/send';
import Clipboard from '@react-native-clipboard/clipboard';
import CopiedSvg from '../../../../../../assets/img/copied-success.svg';

import {useTranslation} from 'react-i18next';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import AddressCard from '../../../components/AddressCard';
import {LuckySevens} from '../../../../../styles/colors';
import {IsERCToken} from '../../../../../store/wallet/utils/currency';
import {CurrencyListIcons} from '../../../../../constants/SupportedCurrencyOptions';
import ContactIcon from '../../../../tabs/contacts/components/ContactIcon';
import CoinbaseSvg from '../../../../../../assets/img/wallet/transactions/coinbase.svg';
import {SupportedTransactionCurrencies} from '../../../../../store/wallet/effects/paypro/paypro';

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
  minHeight?: number;
}

export const DetailContainer = styled.View<DetailContainerParams>`
  ${({minHeight}) =>
    minHeight ? `min-height: ${minHeight}px;` : 'min-height: 60px'}
  ${({minHeight}) => (minHeight ? 'padding: 0;' : 'padding: 20px 0;')}
  justify-content: center;
  ${({height}) => (height ? `height: ${height}px;` : '')}
`;

export const PressableDetailContainer = styled(
  TouchableOpacity,
)<DetailContainerParams>`
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

export const DetailsListNoScroll = styled.View`
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
  children: ReactNode;
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

export const SendingTo: React.FC<SendingToProps> = ({
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
    recipientEmail,
    img,
    recipientFullAddress,
    recipientCoin,
    recipientChain,
    recipientType,
  } = recipient;

  let {badgeImg} = recipient;

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
    description =
      recipientName ||
      recipientEmail ||
      formatCryptoAddress(
        (recipientFullAddress || '').replace('bitcoincash:', ''),
      );
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
              ) : recipientType === 'coinbase' ||
                recipientType === 'coinbaseDeposit' ? (
                <CoinbaseSvg width={18} height={18} />
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
    const {feeLevel, cryptoAmount, fiatAmount, percentageOfTotalAmountStr} =
      fee;
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
                  ~
                  {t(' ( of total amount)', {
                    fiatAmount,
                    percentageOfTotalAmountStr,
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

export const SendingFrom: React.FC<SendingFromProps> = ({
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
  showInfoIcon,
  infoIconOnPress,
}: {
  description: string | undefined;
  amount: TxDetailsAmount | undefined;
  fiatOnly?: boolean;
  height?: number;
  hr?: boolean;
  chain?: string | undefined;
  network?: string | undefined;
  showInfoIcon?: boolean;
  infoIconOnPress?: () => void;
}): JSX.Element | null => {
  if (amount && description) {
    const {cryptoAmount, fiatAmount} = amount;
    return (
      <>
        <DetailContainer height={height}>
          <DetailRow>
            {fiatOnly ? (
              <>
                <H7>{description}</H7>
                {showInfoIcon ? (
                  <TouchableOpacity
                    onPress={infoIconOnPress}
                    style={{marginLeft: 6}}>
                    <InfoSvg width={22} height={22} />
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <>
                <H6>{description.toUpperCase()}</H6>
                {showInfoIcon ? (
                  <TouchableOpacity
                    onPress={infoIconOnPress}
                    style={{marginLeft: 8}}>
                    <InfoSvg width={25} height={25} />
                  </TouchableOpacity>
                ) : null}
              </>
            )}
            <DetailColumn>
              {fiatOnly ? (
                <H7>{fiatAmount}</H7>
              ) : (
                <>
                  <H4 style={{textAlign: 'right'}}>{cryptoAmount}</H4>
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
  minHeight,
  hr,
  secondary,
  onPress,
}: {
  description: string;
  value?: number | string;
  height?: number;
  minHeight?: number;
  hr?: boolean;
  secondary?: boolean;
  onPress?: () => void;
}): JSX.Element | null => {
  return (
    <>
      {onPress ? (
        <>
          <PressableDetailContainer onPress={onPress}>
            <DetailRow>
              <H7>{description}</H7>
              {!secondary ? <H7>{value}</H7> : null}
            </DetailRow>
          </PressableDetailContainer>
          {secondary ? <ConfirmSubText>{value}</ConfirmSubText> : null}
        </>
      ) : (
        <>
          <DetailContainer height={height} minHeight={minHeight}>
            <DetailRow>
              <H7>{description}</H7>
              {!secondary ? <H7>{value}</H7> : null}
            </DetailRow>
          </DetailContainer>
          {secondary ? <ConfirmSubText>{value}</ConfirmSubText> : null}
        </>
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
  supportedTransactionCurrencies,
}: {
  walletsAndAccounts: WalletsAndAccounts;
  onWalletSelect: (wallet: Wallet) => void;
  onCoinbaseAccountSelect: (account: WalletRowProps) => void;
  onBackdropPress: () => void;
  isVisible: boolean;
  setWalletSelectorVisible: React.Dispatch<React.SetStateAction<boolean>>;
  autoSelectIfOnlyOneWallet?: boolean;
  currency?: string;
  chain?: string;
  supportedTransactionCurrencies?: SupportedTransactionCurrencies;
}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {hideAllBalances} = useAppSelector(({APP}) => APP);
  const {keys} = useAppSelector(({WALLET}) => WALLET);
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
    async (autoSelect: boolean) => {
      const {keyWallets, coinbaseWallets} = walletsAndAccounts;
      if (keyWallets.length || coinbaseWallets.length) {
        if (autoSelect) {
          if (
            keyWallets.length === 1 &&
            keyWallets[0].accounts.length === 1 &&
            keyWallets[0].accounts[0].wallets.length === 1 &&
            coinbaseWallets.length === 0
          ) {
            const wallet = keyWallets[0].accounts[0].wallets[0];
            const fullWalletObj = findWalletById(
              keys[wallet.keyId].wallets,
              wallet.id,
            ) as Wallet;
            return selectOption(() => onWalletSelect(fullWalletObj));
          } else if (
            coinbaseWallets.length === 1 &&
            coinbaseWallets[0]?.coinbaseAccounts?.length === 1 &&
            keyWallets.length === 0
          ) {
            return selectOption(() =>
              onCoinbaseAccountSelect(coinbaseWallets[0].coinbaseAccounts[0]),
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

  const hasWallets = (wa: WalletsAndAccounts) => {
    let hasWallets: boolean = false;
    let hasCoinbase: boolean = false;

    const {keyWallets, coinbaseWallets} = wa;
    for (const keyWallet of keyWallets) {
      const accountWallets = keyWallet.accounts.map(account => account.wallets);
      const utxoAndEvmWallets = Object.values(
        keyWallet.mergedUtxoAndEvmAccounts,
      );
      if (accountWallets.length > 0 || utxoAndEvmWallets.length > 0) {
        hasWallets = true;
        break;
      }
    }
    if (
      coinbaseWallets.length > 0 &&
      coinbaseWallets[0].coinbaseAccounts &&
      coinbaseWallets[0].coinbaseAccounts.length > 0
    ) {
      hasCoinbase = true;
    }

    return hasWallets || hasCoinbase;
  };

  useEffect(() => {
    const noWalletsOrCoinbase = !hasWallets(walletsAndAccounts);
    isVisible
      ? noWalletsOrCoinbase
        ? dispatch(showNoWalletsModal({navigation}))
        : showSelector(autoSelectSingleWallet)
      : setSelectorVisible(false);
  }, [isVisible, walletsAndAccounts, autoSelectSingleWallet]);

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
            keyAccounts={walletsAndAccounts.keyWallets}
            hideBalance={hideAllBalances}
            supportedTransactionCurrencies={supportedTransactionCurrencies}
            onPress={wallet => selectOption(() => onWalletSelect(wallet), true)}
          />
          <KeyWalletsRow<WalletRowProps>
            keyAccounts={walletsAndAccounts.coinbaseWallets}
            keySvg={CoinbaseSmall}
            hideBalance={hideAllBalances}
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
  margin-left: 13px;
  margin-right: 12px;
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
  const badgeImg = getBadgeImg(coin, chain);
  const CurrencyIcon =
    CurrencyListIcons[fullCurrencyAbbreviation.toLowerCase()];

  return (
    <CurrencyImageAndBadgeContainer height={size}>
      <CurrencyImage
        img={() => <CurrencyIcon height={size} width={size} />}
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
