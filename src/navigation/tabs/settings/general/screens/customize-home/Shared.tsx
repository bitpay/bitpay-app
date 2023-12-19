import {Rect, Svg} from 'react-native-svg';
import {Theme} from '@react-navigation/native';
import {LightBlack, White} from '../../../../../../styles/colors';
import React from 'react';
import styled from 'styled-components/native';
import {H7} from '../../../../../../components/styled/Text';
import {ScreenGutter} from '../../../../../../components/styled/Containers';
import {TouchableOpacity} from 'react-native';
import {Key, Wallet} from '../../../../../../store/wallet/wallet.models';
import {HomeCarouselConfig} from '../../../../../../store/app/app.models';
import _ from 'lodash';
import {
  HeaderImg,
  Img,
  ListCard,
  RemainingAssetsLabel,
  WALLET_DISPLAY_LIMIT,
} from '../../../../home/components/Wallet';
import {getRemainingWalletCount} from '../../../../../../store/wallet/utils/wallet';
import {CurrencyImage} from '../../../../../../components/currency-image/CurrencyImage';
import CoinbaseSvg from '../../../../../../../assets/img/logos/coinbase.svg';
import {NeedBackupText} from '../../../../../../components/home-card/HomeCard';
import {useTranslation} from 'react-i18next';
import ObfuscationShow from '../../../../../../../assets/img/obfuscation-show.svg';
import ObfuscationHide from '../../../../../../../assets/img/obfuscation-hide.svg';
import {KeyName} from '../../../../../wallet/components/KeyDropdownOption';

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

export const CustomizeHomeContainer = styled.SafeAreaView`
  flex: 1;
`;

export const ListHeader = styled(H7)`
  padding: ${ScreenGutter};
`;

export const ListFooterButtonContainer = styled.View`
  padding: 0 ${ScreenGutter};
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

export const CustomizeCardContainer = styled(props => <ListCard {...props} />)`
  margin: 0 ${ScreenGutter} ${ScreenGutter} ${ScreenGutter};
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
                <CurrencyImage img={img} size={15} />
              </Img>
            )
          );
        })}
        {remainingWalletCount ? (
          <RemainingAssetsLabel>
            + {getRemainingWalletCount(wallets)} {t('more')}
          </RemainingAssetsLabel>
        ) : null}
      </HeaderImg>
    );
  };

  return (
    <>
      <Row>
        <Column>
          {key === 'coinbaseBalanceCard' ? (
            <Row>
              <HeaderImg>
                <CoinbaseSvg width="15" height="15" />
              </HeaderImg>
            </Row>
          ) : null}
          {wallets ? <Row>{header()}</Row> : null}

          <KeyName>{name}</KeyName>
        </Column>
      </Row>
      <Toggle onPress={toggle}>
        {show ? <ObfuscationShow /> : <ObfuscationHide />}
      </Toggle>
    </>
  );
};
