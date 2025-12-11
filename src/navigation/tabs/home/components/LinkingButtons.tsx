import React, {ReactNode} from 'react';
import styled from 'styled-components/native';
import {Action, Midnight, White} from '../../../../styles/colors';
import Haptic from '../../../../components/haptic-feedback/haptic';
import {BaseText} from '../../../../components/styled/Text';
import {titleCasing} from '../../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {ActiveOpacity, WIDTH} from '../../../../components/styled/Containers';
import {useNavigation} from '@react-navigation/native';
import {Path, Svg} from 'react-native-svg';
import {useRequireKeyAndWalletRedirect} from '../../../../utils/hooks/useRequireKeyAndWalletRedirect';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {ExternalServicesScreens} from '../../../services/ExternalServicesGroup';

const ButtonsRow = styled.View`
  justify-content: space-between;
  flex-direction: row;
  align-self: center;
  width: ${WIDTH - 24}px;
  max-width: 340px;
`;

const ButtonContainer = styled.View`
  align-items: center;
  margin: 0;
`;

const ButtonText = styled(BaseText)`
  font-size: 13px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? White : Midnight)};
  margin-top: 3px;
`;

const LinkButton = styled(TouchableOpacity)`
  height: 40px;
  width: 40px;
  border-radius: 30px;
  align-items: center;
  justify-content: center;
  background: ${({theme: {dark}, disabled}) =>
    disabled ? (dark ? '#223358' : '#546acb') : dark ? Midnight : Action};
  margin: 11px 0 8px;
`;

const BuySvg = () => {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path d="M11 21V13H3V11H11V3H13V11H21V13H13V21H11Z" fill={White} />
    </Svg>
  );
};

const SellSvg = () => {
  return (
    <Svg width="25" height="24" viewBox="0 0 25 24" fill="none">
      <Path d="M5.25 13V11H19.25V13H5.25Z" fill={White} />
    </Svg>
  );
};

const SwapSvg = () => {
  return (
    <Svg width="23" height="16" viewBox="0 0 23 16" fill="none">
      <Path
        d="M11.55 16C9.31667 16 7.41667 15.225 5.85 13.675C4.28333 12.125 3.5 10.2333 3.5 8V7.825L1.9 9.425L0.5 8.025L4.5 4.025L8.5 8.025L7.1 9.425L5.5 7.825V8C5.5 9.66667 6.0875 11.0833 7.2625 12.25C8.4375 13.4167 9.86667 14 11.55 14C11.9833 14 12.4083 13.95 12.825 13.85C13.2417 13.75 13.65 13.6 14.05 13.4L15.55 14.9C14.9167 15.2667 14.2667 15.5417 13.6 15.725C12.9333 15.9083 12.25 16 11.55 16ZM18.5 11.975L14.5 7.975L15.9 6.575L17.5 8.175V8C17.5 6.33333 16.9125 4.91667 15.7375 3.75C14.5625 2.58333 13.1333 2 11.45 2C11.0167 2 10.5917 2.05 10.175 2.15C9.75833 2.25 9.35 2.4 8.95 2.6L7.45 1.1C8.08333 0.733333 8.73333 0.458333 9.4 0.275C10.0667 0.0916667 10.75 0 11.45 0C13.6833 0 15.5833 0.775 17.15 2.325C18.7167 3.875 19.5 5.76667 19.5 8V8.175L21.1 6.575L22.5 7.975L18.5 11.975Z"
        fill={White}
      />
    </Svg>
  );
};

const ReceiveSvg = () => {
  return (
    <Svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <Path
        d="M8.99506 10.6593L0.386039 2.05024L1.80025 0.636027L10.4093 9.24505L10.4093 1.32546L12.4069 1.34313V12.6568H1.09315L1.07547 10.6593L8.99506 10.6593Z"
        fill={White}
      />
    </Svg>
  );
};

const SendSvg = () => {
  return (
    <Svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <Path
        d="M10.6593 3.75494L2.05024 12.364L0.636027 10.9497L9.24505 2.34072L1.32546 2.34072L1.34313 0.343146H12.6568V11.6569L10.6593 11.6745L10.6593 3.75494Z"
        fill={White}
      />
    </Svg>
  );
};

interface ButtonListProps {
  key: 'buy' | 'sell' | 'swap' | 'receive' | 'send';
  label: string;
  img: ReactNode;
  cta: () => void;
  hide: boolean;
}

interface Props {
  send: {
    label?: string;
    hide?: boolean;
    cta: () => void;
  };
  receive: {
    label?: string;
    hide?: boolean;
    cta: () => void;
  };
  buy?: {
    hide?: boolean;
    cta: () => void;
  };
  sell?: {
    hide?: boolean;
    cta: () => void;
  };
  swap?: {
    hide?: boolean;
    cta: () => void;
  };
}

const LinkingButtons = ({buy, sell, receive, send, swap}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);
  const tokensDataLoaded = useAppSelector(({APP}) => APP.tokensDataLoaded);

  const buyCryptoCta = useRequireKeyAndWalletRedirect(
    buy && buy.cta
      ? buy.cta
      : () => {
          dispatch(
            Analytics.track('Clicked Buy Crypto', {
              context: 'LinkingButtons',
            }),
          );
          navigation.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
            context: 'buyCrypto',
          });
        },
  );
  const sellCryptoCta = useRequireKeyAndWalletRedirect(
    sell && sell.cta
      ? sell.cta
      : () => {
          dispatch(
            Analytics.track('Clicked Sell Crypto', {
              context: 'LinkingButtons',
            }),
          );
          navigation.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
            context: 'sellCrypto',
          });
        },
  );
  const swapCryptoCta = useRequireKeyAndWalletRedirect(
    swap && swap.cta
      ? swap.cta
      : () => {
          dispatch(
            Analytics.track('Clicked Swap Crypto', {
              context: 'LinkingButtons',
            }),
          );
          navigation.navigate('SwapCryptoRoot');
        },
  );
  const buttonsList: Array<ButtonListProps> = [
    {
      key: 'buy',
      label: t('buy'),
      img: <BuySvg />,
      cta: buyCryptoCta,
      hide: !!buy?.hide,
    },
    {
      key: 'sell',
      label: t('sell'),
      img: <SellSvg />,
      cta: sellCryptoCta,
      hide: !!sell?.hide,
    },
    {
      key: 'swap',
      label: t('swap'),
      img: <SwapSvg />,
      cta: swapCryptoCta,
      hide: !!swap?.hide,
    },
    {
      key: 'receive',
      label: receive.label || t('receive'),
      img: <ReceiveSvg />,
      cta: receive.cta,
      hide: !!receive?.hide,
    },
    {
      key: 'send',
      label: send.label || t('send'),
      img: <SendSvg />,
      cta: send.cta,
      hide: !!send?.hide,
    },
  ];
  return (
    <ButtonsRow>
      {buttonsList.map(({key, label, cta, img, hide}: ButtonListProps) =>
        hide ? null : (
          <ButtonContainer key={key}>
            <LinkButton
              activeOpacity={ActiveOpacity}
              disabled={
                ['buy', 'sell', 'swap'].includes(key) &&
                (!appWasInit || !tokensDataLoaded)
              }
              onPress={() => {
                Haptic('impactLight');
                cta();
              }}>
              {img}
            </LinkButton>
            <ButtonText>{titleCasing(label)}</ButtonText>
          </ButtonContainer>
        ),
      )}
    </ButtonsRow>
  );
};

export default LinkingButtons;
