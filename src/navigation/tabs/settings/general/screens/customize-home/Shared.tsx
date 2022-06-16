import {Path, Rect, Svg} from 'react-native-svg';
import {Theme} from '@react-navigation/native';
import {Feather, LightBlack, White} from '../../../../../../styles/colors';
import React from 'react';
import styled from 'styled-components/native';
import {H5, H7} from '../../../../../../components/styled/Text';
import {ScreenGutter} from '../../../../../../components/styled/Containers';
import {TouchableOpacity} from 'react-native';
import {Key, Wallet} from '../../../../../../store/wallet/wallet.models';
import {HomeCarouselConfig} from '../../../../../../store/app/app.models';
import _ from 'lodash';
import {
  HeaderImg,
  Img,
  RemainingAssetsLabel,
  WALLET_DISPLAY_LIMIT,
} from '../../../../home/components/Wallet';
import {getRemainingWalletCount} from '../../../../../../store/wallet/utils/wallet';
import {CurrencyImage} from '../../../../../../components/currency-image/CurrencyImage';
import CoinbaseSvg from '../../../../../../../assets/img/logos/coinbase.svg';
import {NeedBackupText} from '../../../../../../components/home-card/HomeCard';
import {useTranslation} from 'react-i18next';

export const StarSvg = ({favorited}: {favorited: boolean}) => {
  return (
    <Svg width="25" height="25" viewBox="0 0 16 15" fill="none">
      {favorited ? (
        <Path
          d="M14.8717 4.96525L10.6329 4.34863L8.74077 0.508474C8.65086 0.353793 8.52192 0.225421 8.36685 0.136192C8.21177 0.046962 8.03599 0 7.85708 0C7.67816 0 7.50238 0.046962 7.34731 0.136192C7.19223 0.225421 7.06329 0.353793 6.97338 0.508474L5.08129 4.34961L0.842489 4.96525C0.660973 4.99128 0.490375 5.06763 0.350016 5.18563C0.209658 5.30364 0.10515 5.45859 0.0483286 5.63294C-0.00849266 5.80728 -0.015356 5.99406 0.028516 6.17211C0.0723879 6.35015 0.165242 6.51236 0.296561 6.64035L3.36299 9.63019L2.63934 13.8523C2.6084 14.0329 2.6286 14.2185 2.69764 14.3882C2.76669 14.5579 2.88184 14.7049 3.03006 14.8125C3.17828 14.9202 3.35367 14.9843 3.5364 14.9975C3.71913 15.0106 3.9019 14.9725 4.06405 14.8872L7.85708 12.893L11.6481 14.8852C11.8103 14.9705 11.9931 15.0087 12.1758 14.9955C12.3585 14.9823 12.5339 14.9182 12.6821 14.8106C12.8304 14.7029 12.9455 14.5559 13.0145 14.3862C13.0836 14.2165 13.1038 14.0309 13.0729 13.8503L12.3492 9.62822L15.4176 6.64035C15.5486 6.51245 15.6412 6.35047 15.685 6.17271C15.7288 5.99496 15.722 5.80849 15.6655 5.63437C15.6089 5.46026 15.5048 5.30543 15.3648 5.18736C15.2249 5.0693 15.0548 4.99271 14.8736 4.96623L14.8717 4.96525Z"
          fill="#FDB455"
        />
      ) : (
        <Path
          d="M10.1844 4.56961L10.3006 4.80555L10.5609 4.84342L14.72 5.44846L14.7219 5.44936L14.8013 5.46098C14.8902 5.47397 14.9737 5.51156 15.0424 5.5695C15.1111 5.62744 15.1622 5.70343 15.1899 5.78888C15.2177 5.87434 15.221 5.96585 15.1995 6.05309L15.6673 6.16834L15.1995 6.05309C15.1781 6.14023 15.1327 6.21965 15.0685 6.28239C15.0684 6.28246 15.0684 6.28253 15.0683 6.28259L12.0004 9.27L11.812 9.45348L11.8564 9.71269L12.58 13.9348C12.58 13.9348 12.58 13.9348 12.58 13.9348C12.5952 14.0234 12.5853 14.1145 12.5514 14.1978L13.0145 14.3862L12.5514 14.1978C12.5175 14.2811 12.461 14.3532 12.3883 14.406C12.3155 14.4589 12.2295 14.4903 12.1398 14.4968C12.0501 14.5033 11.9604 14.4845 11.8808 14.4427L11.8807 14.4426L8.08967 12.4504L7.85702 12.3281L7.6244 12.4504L3.83137 14.4446L4.05665 14.8731L3.83137 14.4446C3.75179 14.4865 3.66209 14.5052 3.57241 14.4987C3.48274 14.4923 3.39666 14.4608 3.32391 14.408C3.25117 14.3552 3.19466 14.283 3.16077 14.1997C3.12689 14.1165 3.11697 14.0254 3.13215 13.9368C3.13215 13.9368 3.13216 13.9367 3.13216 13.9367L3.8558 9.71465L3.90019 9.45564L3.71204 9.27219L0.645615 6.28235L0.645545 6.28228C0.581096 6.21947 0.535526 6.13986 0.513995 6.05248C0.492464 5.9651 0.495832 5.87344 0.523718 5.78787L0.0494452 5.6333L0.523719 5.78787C0.551605 5.7023 0.602895 5.62626 0.671779 5.56834C0.740664 5.51043 0.824389 5.47296 0.913472 5.46019L0.914355 5.46006L5.15315 4.84442L5.41355 4.8066L5.52982 4.57055L7.41304 0.747433C7.45853 0.67391 7.5216 0.612764 7.59667 0.569571C7.67589 0.52399 7.76568 0.5 7.85708 0.5C7.94847 0.5 8.03827 0.52399 8.11748 0.56957C8.19256 0.612768 8.25564 0.673924 8.30113 0.747456L10.1844 4.56961Z"
          stroke="#FDB455"
        />
      )}
    </Svg>
  );
};

export const CarouselSvg = ({
  focused,
  theme,
}: {
  focused: boolean;
  theme: Theme;
}) => {
  const stroke = focused ? White : theme?.dark ? White : '#434D5A';
  return (
    <Svg width="17" height="10" viewBox="0 0 17 10" fill="none">
      <Rect
        x="0.75"
        y="0.75"
        width="4.5"
        height="8.5"
        rx="1.25"
        stroke={stroke}
        stroke-width="1.5"
      />
      <Rect
        x="8.75"
        y="0.75"
        width="7.5"
        height="8.5"
        rx="1.25"
        stroke={stroke}
        stroke-width="1.5"
      />
    </Svg>
  );
};

export const ListViewSvg = ({
  focused,
  theme,
}: {
  focused: boolean;
  theme: Theme;
}) => {
  const fill = focused ? White : theme?.dark ? White : '#434D5A';
  return (
    <Svg width="15" height="10" viewBox="0 0 15 10" fill="none">
      <Rect x="3" width="12" height="1.5" rx="0.75" fill={fill} />
      <Rect width="1.5" height="1.5" rx="0.75" fill={fill} />
      <Rect x="3" y="4" width="12" height="1.5" rx="0.75" fill={fill} />
      <Rect y="4" width="1.5" height="1.5" rx="0.75" fill={fill} />
      <Rect x="3" y="8" width="12" height="1.5" rx="0.75" fill={fill} />
      <Rect y="8" width="1.5" height="1.5" rx="0.75" fill={fill} />
    </Svg>
  );
};

export const CustomizeHomeContainer = styled.View`
  flex: 1;
`;

export const ListHeader = styled(H7)`
  padding: ${ScreenGutter};
`;

export const ListFooterButtonContainer = styled.View`
  padding: 0 ${ScreenGutter};
`;

export const CustomizeCardTitle = styled(H5)`
  color: ${({theme}) => theme.colors.text};
`;

export const Column = styled.View`
  flex-direction: column;
  flex: 1;
`;

export const Row = styled.View`
  flex-direction: row;
  margin: 3px 0;
`;

export const Toggle = styled(TouchableOpacity)`
  justify-content: center;
  position: absolute;
  right: 10px;
  width: 50px;
`;

export const CustomizeCardContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? '#343434' : Feather)};
  border-radius: 12px;
  margin: 0 ${ScreenGutter} ${ScreenGutter} ${ScreenGutter};
  min-height: 100px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  padding: 15px 20px;
`;

export const HamburgerContainer = styled.View`
  margin-right: 15px;
`;

export const LayoutToggleContainer = styled.View`
  min-height: 120px;
  margin-top: 30px;
  padding: 0 ${ScreenGutter};
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ebecee')};
  border-bottom-width: 1px;
`;

const NeedsBackupContainer = styled.View`
  min-height: 22px;
`;

export const createCustomizeCardList = ({
  keys,
  hasCoinbase,
  homeCarouselConfig,
}: {
  keys: Key[];
  hasCoinbase: boolean;
  homeCarouselConfig: HomeCarouselConfig[];
}) => {
  let list: CustomizeItem[] = [];
  const hasKeys = keys.length;
  if (hasKeys) {
    const walletCards = keys.map(
      ({id, keyName, wallets, backupComplete}): CustomizeItem => {
        const {show} = homeCarouselConfig?.find(item => item.id === id) || {};

        return {
          key: id,
          name: keyName!,
          wallets: wallets,
          show: show!,
          needsBackup: !backupComplete,
        };
      },
    );

    list.push(...walletCards);
  }

  if (hasCoinbase) {
    const {show} =
      homeCarouselConfig?.find(item => item.id === 'coinbaseBalanceCard') || {};
    list.push({
      key: 'coinbaseBalanceCard',
      name: 'Coinbase',
      show: show!,
    });
  }

  const order = homeCarouselConfig.map(item => item.id);
  list = _.sortBy(list, item => _.indexOf(order, item.key));

  return [list.filter(i => i.show), list.filter(i => !i.show)];
};

export interface CustomizeItem {
  key: string;
  name: string;
  wallets?: Wallet[];
  show: boolean;
  needsBackup?: boolean;
}

export const CustomizeCard = ({
  item: {wallets, name, show, key, needsBackup},
  toggle,
}: {
  item: CustomizeItem;
  toggle: () => void;
}) => {
  const {t} = useTranslation();
  const walletInfo = wallets?.slice(0, WALLET_DISPLAY_LIMIT);
  const remainingWalletCount = getRemainingWalletCount(wallets);

  const header = () => {
    if (needsBackup) {
      return (
        <NeedsBackupContainer>
          <NeedBackupText>{t('Needs Backup')}</NeedBackupText>
        </NeedsBackupContainer>
      );
    }

    return (
      <HeaderImg>
        {walletInfo?.map((wallet: Wallet, index: number) => {
          const {id, img} = wallet;
          return (
            wallet && (
              <Img key={id} isFirst={index === 0}>
                <CurrencyImage img={img} size={25} />
              </Img>
            )
          );
        })}
        {remainingWalletCount ? (
          <RemainingAssetsLabel>
            + {getRemainingWalletCount(wallets)} more
          </RemainingAssetsLabel>
        ) : null}
      </HeaderImg>
    );
  };

  return (
    <>
      <Row>
        <Column>
          <Row>
            <CustomizeCardTitle>{name}</CustomizeCardTitle>
          </Row>
          {key === 'coinbaseBalanceCard' ? (
            <Row>
              <HeaderImg>
                <CoinbaseSvg width="25" height="25" />
              </HeaderImg>
            </Row>
          ) : null}
          {wallets ? <Row>{header()}</Row> : null}
        </Column>
      </Row>
      <Toggle onPress={toggle}>
        <StarSvg favorited={show} />
      </Toggle>
    </>
  );
};
