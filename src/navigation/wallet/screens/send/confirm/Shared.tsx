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
  ImportTextInput,
  Row,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import React, {
  ReactChild,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import {useNavigation, useTheme} from '@react-navigation/native';
import {useAppDispatch} from '../../../../../utils/hooks';
import {showNoWalletsModal} from '../../../../../store/wallet/effects/send/send';
import Clipboard from '@react-native-community/clipboard';
import CopiedSvg from '../../../../../../assets/img/copied-success.svg';
import CheckSvg from '../../../../../../assets/img/check.svg';
import ClearSvg from '../../../../../../assets/img/clear.svg';
import ClearDarkSvg from '../../../../../../assets/img/clear-dark.svg';
import PencilSvg from '../../../../../../assets/img/pencil.svg';
import PencilDarkSvg from '../../../../../../assets/img/pencil-dark.svg';

import {useTranslation} from 'react-i18next';
import {
  Action,
  Black,
  LightBlack,
  NeutralSlate,
  Slate,
  White,
} from '../../../../../styles/colors';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {TextInput, TouchableOpacity} from 'react-native-gesture-handler';

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

const MemoRow = styled.View`
  margin: 10px 0 20px;
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
          <DetailContainer height={84}>
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
  height,
  hr,
}: {
  description: string | undefined;
  amount: TxDetailsAmount | undefined;
  fiatOnly?: boolean;
  height?: number;
  hr?: boolean;
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

const memoBorderRadius = 4;
const memoBorderWidth = 1;
const memoInputHeight = 72;

interface MemoColor {
  dark: string;
  light: string;
}
interface MemoColors {
  border: MemoColor;
  unfocusedBorder: MemoColor;
  focusedInputBg: MemoColor;
  unfocusedInputBg: MemoColor;
  inputEditModeFont: MemoColor;
  inputNonEditModeFont: MemoColor;
}
const memoColors: MemoColors = {
  border: {
    dark: White,
    light: '#e1e4e7',
  },
  unfocusedBorder: {
    dark: Black,
    light: '#e1e4e7',
  },
  focusedInputBg: {
    dark: 'transparent',
    light: '#fafbff',
  },
  unfocusedInputBg: {
    dark: LightBlack,
    light: NeutralSlate,
  },
  inputEditModeFont: {
    dark: White,
    light: Black,
  },
  inputNonEditModeFont: {
    dark: Slate,
    light: '#6a727d',
  },
};

const getMemoColor = (name: keyof MemoColors, isDark: boolean) => {
  const color = memoColors[name];
  return isDark ? color.dark : color.light;
};

const getMemoInputColor = (
  {hasFocus, isEditMode, isEmpty}: MemoInputContainerParams,
  darkTheme: boolean,
) => {
  if (hasFocus) {
    return getMemoColor('focusedInputBg', darkTheme);
  }
  return isEditMode || isEmpty
    ? 'transparent'
    : getMemoColor('unfocusedInputBg', darkTheme);
};

const getMemoBorderColor = (
  {hasFocus, isEditMode, isEmpty}: MemoInputContainerParams,
  darkTheme: boolean,
) => {
  return hasFocus || isEditMode || isEmpty
    ? getMemoColor('border', darkTheme)
    : getMemoColor('unfocusedBorder', darkTheme);
};

export interface MemoInputContainerParams {
  hasFocus?: boolean;
  isEmpty?: boolean;
  isEditMode?: boolean;
}

const MemoContainer = styled.View`
  flex-direction: row;
  margin-top: 9px;
`;

const MemoInput = styled(ImportTextInput)<MemoInputContainerParams>`
  flex: 1;
  background-color: ${({isEditMode, hasFocus, isEmpty, theme}) =>
    getMemoInputColor({hasFocus, isEditMode, isEmpty}, theme.dark)};
  border: 0;
  border-top-right-radius: 0;
  border-top-left-radius: ${memoBorderRadius}px;
  font-size: 12px;
  font-weight: 500;
  padding: 12px;
  color: ${({isEditMode, theme}) =>
    isEditMode
      ? getMemoColor('inputEditModeFont', theme.dark)
      : getMemoColor('inputNonEditModeFont', theme.dark)};
  height: ${({hasFocus, isEmpty}) =>
    !hasFocus && isEmpty ? 40 : memoInputHeight}px;
`;

const MemoInputContainer = styled.View<MemoInputContainerParams>`
  flex-grow: 1;
  border-color: ${({hasFocus, isEditMode, isEmpty, theme}) =>
    getMemoBorderColor({hasFocus, isEditMode, isEmpty}, theme.dark)};
  border-width: ${memoBorderWidth}px;
  border-top-left-radius: ${memoBorderRadius}px;
  border-top-right-radius: ${({isEditMode, isEmpty}) =>
    isEditMode || !isEmpty ? 0 : memoBorderRadius}px;
  border-bottom-color: ${({hasFocus, isEditMode, isEmpty, theme}) =>
    hasFocus
      ? Action
      : getMemoBorderColor({hasFocus, isEditMode, isEmpty}, theme.dark)};
  border-right-width: ${({isEmpty}) => (isEmpty ? memoBorderWidth : 0)}px;
  flex-direction: row;
`;

const memoOuterButtonHeight = memoInputHeight + memoBorderWidth * 2;
const MemoOuterButtonContainer = styled.View<MemoInputContainerParams>`
  background-color: ${({isEditMode, theme}) =>
    isEditMode || theme.dark ? Action : White};
  border-color: ${({isEditMode, hasFocus, isEmpty, theme}) =>
    isEditMode
      ? Action
      : getMemoBorderColor({hasFocus, isEditMode, isEmpty}, theme.dark)};
  border-width: ${memoBorderWidth}px;
  border-left-width: 0;
  border-top-right-radius: ${memoBorderRadius}px;
  height: ${memoOuterButtonHeight}px;
  width: 39px;
  justify-content: center;
  align-items: center;
`;

const MemoOuterButton = styled.TouchableOpacity`
  height: ${memoOuterButtonHeight}px;
  width: 39px;
  justify-content: center;
  align-items: center;
`;

const MemoClearButtonContainer = styled.View<MemoInputContainerParams>`
  height: ${memoInputHeight}px;
  width: 33px;
  background-color: ${({hasFocus, isEditMode, isEmpty, theme}) =>
    getMemoInputColor({hasFocus, isEditMode, isEmpty}, theme.dark)}
  justify-content: center;
`;

export const Memo = ({
  memo,
  onChange,
}: {
  memo: string;
  onChange: (memo: string) => void;
}) => {
  const {t} = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [draftMemo, setDraftMemo] = useState(memo);
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  return (
    <>
      <MemoRow>
        <H7>{t('Memo')}</H7>
        <MemoContainer>
          <MemoInputContainer
            hasFocus={hasFocus}
            isEmpty={!draftMemo}
            isEditMode={isEditMode}>
            <MemoInput
              hasFocus={hasFocus}
              isEditMode={isEditMode}
              isEmpty={!draftMemo}
              editable={isEditMode || !draftMemo}
              multiline
              numberOfLines={3}
              selectTextOnFocus={false}
              value={draftMemo}
              onChangeText={text => {
                setDraftMemo(text);
                if (text) {
                  setIsEditMode(true);
                }
              }}
              ref={inputRef}
              onFocus={() => setHasFocus(true)}
              onBlur={() => {
                setHasFocus(false);
                if (!draftMemo) {
                  onChange('');
                  setIsEditMode(false);
                }
              }}
            />
            {draftMemo && isEditMode ? (
              <MemoClearButtonContainer
                hasFocus={hasFocus}
                isEditMode={isEditMode}
                isEmpty={!draftMemo}>
                <TouchableOpacity
                  onPress={() => {
                    setDraftMemo('');
                    onChange('');
                    inputRef.current?.focus();
                  }}>
                  {theme.dark ? <ClearDarkSvg /> : <ClearSvg />}
                </TouchableOpacity>
              </MemoClearButtonContainer>
            ) : null}
          </MemoInputContainer>
          {draftMemo || isEditMode ? (
            <MemoOuterButtonContainer isEditMode={isEditMode}>
              <MemoOuterButton
                onPress={async () => {
                  setIsEditMode(!isEditMode);
                  await sleep(0);
                  isEditMode ? onChange(draftMemo) : inputRef.current?.focus();
                }}>
                {isEditMode ? (
                  <CheckSvg width={14} />
                ) : theme.dark ? (
                  <PencilDarkSvg />
                ) : (
                  <PencilSvg />
                )}
              </MemoOuterButton>
            </MemoOuterButtonContainer>
          ) : null}
        </MemoContainer>
      </MemoRow>
      <Hr />
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
    <SharedDetailRow
      description={t('Expires')}
      height={60}
      value={remainingTime}
      hr
    />
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
