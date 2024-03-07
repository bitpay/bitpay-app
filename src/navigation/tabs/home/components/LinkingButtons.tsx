import React, {ReactNode} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {Action, White} from '../../../../styles/colors';
import Haptic from '../../../../components/haptic-feedback/haptic';
import {BaseText} from '../../../../components/styled/Text';
import {titleCasing} from '../../../../utils/helper-methods';
import {useAppDispatch} from '../../../../utils/hooks';
import {ActiveOpacity} from '../../../../components/styled/Containers';
import {useNavigation} from '@react-navigation/native';
import {Path, Rect, Svg} from 'react-native-svg';
import {useRequireKeyAndWalletRedirect} from '../../../../utils/hooks/useRequireKeyAndWalletRedirect';
import {useTranslation} from 'react-i18next';
import {WalletScreens} from '../../../wallet/WalletGroup';
import {Analytics} from '../../../../store/analytics/analytics.effects';

const ButtonsRow = styled.View`
  justify-content: center;
  flex-direction: row;
  align-self: center;
`;

const ButtonContainer = styled.View`
  align-items: center;
  margin: 0 16px;
`;

const ButtonText = styled(BaseText)`
  font-size: 12px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? White : Action)};
  margin-top: 5px;
`;

const LinkButton = styled.TouchableOpacity`
  height: 43px;
  width: 43px;
  border-radius: 11px;
  align-items: center;
  justify-content: center;
  background: ${({theme: {dark}}) => (dark ? '#0C204E' : Action)};
  margin: 11px 0 8px;
`;

const BuySvg = () => {
  const theme = useTheme();
  return (
    <Svg width="9" height="21" viewBox="0 0 9 21" fill="none">
      <Path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M4.80223 0.805603L4.79692 0.805615L4.79275 0.805603C4.7812 0.805603 4.7697 0.80587 4.75828 0.806399C4.12091 0.829525 3.6113 1.35352 3.6113 1.99653L3.6113 3.65842C2.7443 3.82869 2.03432 4.20006 1.48137 4.77254C0.841615 5.435 0.521739 6.29936 0.521739 7.3656C0.521739 8.15425 0.68323 8.81355 1.00621 9.34352C1.3354 9.87349 1.79503 10.3183 2.38509 10.6779C2.97516 11.0375 3.67081 11.3593 4.47205 11.6432C5.28571 11.9334 5.85714 12.252 6.18634 12.599C6.51553 12.946 6.68012 13.3908 6.68012 13.9334C6.68012 14.4886 6.5 14.9397 6.13975 15.2867C5.7795 15.6337 5.25776 15.8072 4.57453 15.8072C4.20807 15.8072 3.85093 15.7347 3.50311 15.5896C3.15528 15.4382 2.86957 15.1826 2.64596 14.823C2.42236 14.4571 2.31056 13.9524 2.31056 13.3088H0C0 14.2994 0.186335 15.1038 0.559006 15.7221C0.931677 16.3404 1.41304 16.8072 2.00311 17.1227C2.51151 17.3891 3.04757 17.5664 3.6113 17.6548L3.6113 19.0035C3.6113 19.3705 3.77735 19.6988 4.03842 19.9173C4.17198 20.0861 4.37865 20.1944 4.61063 20.1944C4.639 20.1944 4.667 20.1928 4.69453 20.1896C4.73 20.1928 4.76593 20.1944 4.80223 20.1944C5.45997 20.1944 5.99316 19.6612 5.99316 19.0035V17.584C6.80457 17.4034 7.47455 17.0572 8.00311 16.5454C8.6677 15.8956 9 15.0186 9 13.9145C9 13.1259 8.83851 12.4697 8.51553 11.946C8.19876 11.4224 7.74534 10.9807 7.15528 10.6211C6.57143 10.2552 5.87888 9.92396 5.07764 9.62743C4.2205 9.31198 3.63043 8.98705 3.30745 8.65267C2.99068 8.31828 2.8323 7.88611 2.8323 7.35614C2.8323 6.81355 2.98137 6.3656 3.2795 6.01229C3.58385 5.65267 4.05901 5.47286 4.70497 5.47286C5.30745 5.47286 5.7795 5.69683 6.12112 6.14478C6.46894 6.59273 6.64286 7.21103 6.64286 7.99967H8.9441C8.9441 6.73153 8.63665 5.72207 8.02174 4.97128C7.50604 4.32986 6.82985 3.9058 5.99316 3.69912V1.99653C5.99316 1.3388 5.45997 0.805603 4.80223 0.805603Z"
        fill={theme.dark ? '#4989FF' : White}
      />
    </Svg>
  );
};

const SellSvg = () => {
  const theme = useTheme();
  return (
    <Svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <Rect
        width="44"
        height="44"
        rx="11"
        fill={theme.dark ? '#0C204E' : '#2240C4'}
      />
      <Path
        d="M23.8871 12C23.0221 12 22.1765 12.2565 21.4573 12.7371C20.738 13.2176 20.1775 13.9007 19.8465 14.6998C19.5154 15.499 19.4288 16.3784 19.5976 17.2267C19.7663 18.0751 20.1829 18.8544 20.7945 19.466C21.4062 20.0777 22.1855 20.4942 23.0338 20.663C23.8822 20.8317 24.7616 20.7451 25.5607 20.4141C26.3599 20.0831 27.0429 19.5225 27.5235 18.8033C28.0041 18.0841 28.2606 17.2385 28.2606 16.3735C28.2594 15.2139 27.7983 14.1022 26.9783 13.2822C26.1584 12.4623 25.0466 12.0012 23.8871 12ZM24.5081 18.2541H23.2573V14.5016H24.5081V18.2541Z"
        fill={theme.dark ? '#4989FF' : White}
      />
      <Path
        d="M31.9563 25.9548C31.8661 25.5447 31.6385 25.1778 31.3113 24.9147C30.9841 24.6517 30.5768 24.5082 30.157 24.5082H26.2907C26.3531 24.8043 26.3845 25.1062 26.3845 25.4088V26.0342C26.3845 26.2001 26.3186 26.3592 26.2013 26.4765C26.084 26.5937 25.9249 26.6596 25.7591 26.6596H18.2541V25.4088H25.1336C25.1336 24.5795 24.8042 23.7841 24.2178 23.1976C23.6313 22.6112 22.8359 22.2818 22.0066 22.2818H17.9652C17.5263 21.7998 16.9914 21.4151 16.3949 21.1523C15.7984 20.8894 15.1535 20.7544 14.5016 20.7557H12V27.6353L17.7475 30.5122C18.8771 31.0771 20.1785 31.1939 21.3906 30.8393L30.6742 28.1218C31.123 27.9908 31.5053 27.694 31.7433 27.2916C31.9814 26.8892 32.0576 26.4113 31.9563 25.9548Z"
        fill={theme.dark ? '#4989FF' : White}
      />
    </Svg>
  );
};

const SwapSvg = () => {
  const theme = useTheme();
  return (
    <Svg width="21" height="21" viewBox="0 0 21 21" fill="none">
      <Path
        d="M0.989399 10L0.989401 9.99335L0.989258 9.97468L0.989538 9.94858C1.00119 7.7932 1.74472 5.70511 3.09907 4.02705C4.4642 2.33564 6.36752 1.16289 8.49211 0.704062C10.6167 0.245236 12.8344 0.528027 14.7758 1.50535C15.8658 2.05401 16.8317 2.80298 17.6281 3.70473V2.84084C17.6281 2.1831 18.1613 1.64991 18.819 1.64991C19.4767 1.64991 20.0099 2.1831 20.0099 2.84084V6.64198C20.0099 7.0124 19.8408 7.34331 19.5756 7.56174C19.4287 7.68268 19.2524 7.76914 19.059 7.80871C18.9815 7.82457 18.9012 7.83291 18.819 7.83291L15.0178 7.83291C14.3601 7.83291 13.8269 7.29971 13.8269 6.64198C13.8269 5.98425 14.3601 5.45105 15.0178 5.45105H15.9741C15.3528 4.70334 14.5804 4.08554 13.7001 3.64236C12.247 2.91091 10.5873 2.69926 8.99715 3.04266C7.40705 3.38606 5.98255 4.26378 4.96085 5.52967C3.93915 6.79557 3.38191 8.37325 3.38191 10H3.3744C3.36091 10.647 2.8322 11.1674 2.18196 11.1674C1.53172 11.1674 1.00288 10.647 0.989399 10Z"
        fill={theme.dark ? '#4989FF' : White}
      />
      <Path
        d="M2.18031 13.1404L2.1925 13.1404H5.98148C6.63921 13.1404 7.17241 13.6736 7.17241 14.3314C7.17241 14.9891 6.63921 15.5223 5.98148 15.5223H5.00301C5.62808 16.282 6.40826 16.9092 7.29911 17.3577C8.75215 18.0891 10.4119 18.3008 12.002 17.9574C13.5921 17.614 15.0166 16.7363 16.0383 15.4704C17.06 14.2045 17.6173 12.6268 17.6173 11H17.6248C17.6382 10.353 18.167 9.83261 18.8172 9.83261C19.4675 9.83261 19.9962 10.353 20.0097 11L20.0098 11.0066L20.0099 11.0253L20.0096 11.0514C19.998 13.2068 19.2545 15.2949 17.9001 16.973C16.535 18.6644 14.6317 19.8372 12.5071 20.296C10.3825 20.7548 8.16481 20.472 6.22335 19.4947C5.13349 18.9461 4.16759 18.1972 3.37124 17.2955V18.1324C3.37124 18.7902 2.83805 19.3234 2.18031 19.3234C1.52258 19.3234 0.989384 18.7902 0.989384 18.1324L0.989384 14.3313C0.989384 13.6736 1.52258 13.1404 2.18031 13.1404Z"
        fill={theme.dark ? '#4989FF' : White}
      />
    </Svg>
  );
};

const ReceiveSvg = () => {
  const theme = useTheme();
  return (
    <Svg width="13" height="17" viewBox="0 0 13 17" fill="none">
      <Path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M7.86536 12.7592L10.4752 10.1493C10.9423 9.68222 11.6997 9.68222 12.1668 10.1493C12.6339 10.6164 12.6339 11.3738 12.1668 11.8409L7.52223 16.4855C7.49556 16.5126 7.46761 16.5385 7.43848 16.5629C7.35839 16.6304 7.27154 16.6856 7.18038 16.7287C7.02539 16.802 6.8521 16.8431 6.66924 16.8431C6.49542 16.8431 6.33026 16.806 6.18124 16.7393C6.0654 16.6876 5.95609 16.6166 5.85822 16.5261C5.84522 16.5142 5.8325 16.5019 5.82004 16.4893L1.17162 11.8409C0.704511 11.3738 0.704511 10.6164 1.17162 10.1493C1.63874 9.68222 2.39608 9.68222 2.86319 10.1493L5.47312 12.7593V1.69154C5.47312 1.03094 6.00864 0.495422 6.66924 0.495422C7.32984 0.495422 7.86535 1.03094 7.86536 1.69154V12.7592Z"
        fill={theme.dark ? '#4989FF' : White}
      />
    </Svg>
  );
};

const SendSvg = () => {
  const theme = useTheme();
  return (
    <Svg width="13" height="17" viewBox="0 0 13 17" fill="none">
      <Path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M5.47327 4.57932L2.86339 7.1892C2.39627 7.65631 1.63893 7.65631 1.17182 7.1892C0.704706 6.72209 0.704706 5.96475 1.17182 5.49763L5.81631 0.853139C5.84375 0.825228 5.87254 0.798659 5.90259 0.773535C5.98103 0.707867 6.0659 0.653832 6.15494 0.611428C6.31077 0.537076 6.48522 0.495453 6.66938 0.495453C6.8432 0.495453 7.00836 0.532528 7.15738 0.599202C7.27322 0.650919 7.38253 0.721983 7.4804 0.812388C7.4934 0.824381 7.50613 0.836661 7.51858 0.849213L12.167 5.49763C12.6341 5.96475 12.6341 6.72208 12.167 7.1892C11.6999 7.65631 10.9425 7.65631 10.4754 7.1892L7.8655 4.57927L7.8655 15.647C7.8655 16.3076 7.32998 16.8431 6.66938 16.8431C6.00879 16.8431 5.47327 16.3076 5.47327 15.647L5.47327 4.57932Z"
        fill={theme.dark ? '#4989FF' : White}
      />
    </Svg>
  );
};

interface ButtonListProps {
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

  const buyCryptoCta = useRequireKeyAndWalletRedirect(
    buy && buy.cta
      ? buy.cta
      : () => {
          dispatch(
            Analytics.track('Clicked Buy Crypto', {
              context: 'LinkingButtons',
            }),
          );
          navigation.navigate(WalletScreens.AMOUNT, {
            onAmountSelected: async (amount: string) => {
              navigation.navigate('BuyCryptoRoot', {
                amount: Number(amount),
              });
            },
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
          navigation.navigate('SellCryptoRoot');
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
      label: t('buy'),
      img: <BuySvg />,
      cta: buyCryptoCta,
      hide: !!buy?.hide,
    },
    {
      label: t('sell'),
      img: <SellSvg />,
      cta: sellCryptoCta,
      hide: !!sell?.hide,
    },
    {
      label: t('swap'),
      img: <SwapSvg />,
      cta: swapCryptoCta,
      hide: !!swap?.hide,
    },
    {
      label: receive.label || t('receive'),
      img: <ReceiveSvg />,
      cta: receive.cta,
      hide: !!receive?.hide,
    },
    {
      label: send.label || t('send'),
      img: <SendSvg />,
      cta: send.cta,
      hide: !!send?.hide,
    },
  ];
  return (
    <ButtonsRow>
      {buttonsList.map(({label, cta, img, hide}: ButtonListProps) =>
        hide ? null : (
          <ButtonContainer key={label}>
            <LinkButton
              activeOpacity={ActiveOpacity}
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
