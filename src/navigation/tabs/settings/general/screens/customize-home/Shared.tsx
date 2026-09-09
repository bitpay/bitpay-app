import {Rect, Svg} from 'react-native-svg';
import {Theme} from '@react-navigation/native';
import {LightBlack, SlateDark, White} from '../../../../../../styles/colors';
import React from 'react';
import {SafeAreaView, StyleSheet, View, ViewProps} from 'react-native';
import {useTheme} from '../../../../../../contexts';
import {H7} from '../../../../../../components/styled/Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
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
import {OptionName} from '../../../../../wallet/components/DropdownOption';

export const CarouselSvg = ({
  focused,
  theme,
}: {
  focused: boolean;
  theme: Theme;
}) => {
  const stroke = focused ? White : theme?.dark ? White : SlateDark;
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
  const fill = focused ? White : theme?.dark ? White : SlateDark;
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

const styles = StyleSheet.create({
  customizeHomeContainer: {
    flex: 1,
  },
  listHeader: {
    padding: 12,
  },
  listFooterButtonContainer: {
    paddingHorizontal: 12,
  },
  column: {
    flexDirection: 'column',
    flex: 1,
    maxWidth: '75%',
    marginVertical: 3,
  },
  row: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  draggableContentContainer: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hideImgContainer: {
    alignItems: 'flex-end',
    marginRight: -5,
  },
  toggle: {
    right: 10,
    width: 50,
  },
  customizeCardContainer: {
    marginTop: 0,
    marginRight: 12,
    marginBottom: 12,
    marginLeft: 12,
    overflow: 'hidden',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  hamburgerContainer: {
    marginRight: 15,
  },
  layoutToggleContainer: {
    minHeight: 120,
    marginTop: 30,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  needsBackupContainer: {
    minHeight: 22,
  },
});

export const CustomizeHomeContainer = React.forwardRef<
  React.ComponentRef<typeof SafeAreaView>,
  React.ComponentProps<typeof SafeAreaView>
>(({style, ...rest}, ref) => (
  <SafeAreaView
    ref={ref}
    style={[styles.customizeHomeContainer, style]}
    {...rest}
  />
));
CustomizeHomeContainer.displayName = 'CustomizeHomeContainer';

export const ListHeader = React.forwardRef<
  React.ComponentRef<typeof H7>,
  React.ComponentProps<typeof H7>
>(({style, ...rest}, ref) => (
  <H7 ref={ref} style={[styles.listHeader, style]} {...rest} />
));
ListHeader.displayName = 'ListHeader';

export const ListFooterButtonContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View
      ref={ref}
      style={[styles.listFooterButtonContainer, style]}
      {...rest}
    />
  ),
);
ListFooterButtonContainer.displayName = 'ListFooterButtonContainer';

export const Column = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.column, style]} {...rest} />
  ),
);
Column.displayName = 'Column';

export const Row = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.row, style]} {...rest} />
  ),
);
Row.displayName = 'Row';

const DraggableContentContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View
      ref={ref}
      style={[styles.draggableContentContainer, style]}
      {...rest}
    />
  ),
);
DraggableContentContainer.displayName = 'DraggableContentContainer';

const HideImgContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.hideImgContainer, style]} {...rest} />
  ),
);
HideImgContainer.displayName = 'HideImgContainer';

export const Toggle: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.toggle, style]} {...rest} />
);

export const CustomizeCardContainer: React.FC<
  React.ComponentProps<typeof ListCard>
> = ({style, ...rest}) => (
  <ListCard style={[styles.customizeCardContainer, style]} {...rest} />
);

export const HamburgerContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.hamburgerContainer, style]} {...rest} />
  ),
);
HamburgerContainer.displayName = 'HamburgerContainer';

export const LayoutToggleContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <View
        ref={ref}
        style={[
          styles.layoutToggleContainer,
          {borderBottomColor: theme.dark ? LightBlack : '#ebecee'},
          style,
        ]}
        {...rest}
      />
    );
  },
);
LayoutToggleContainer.displayName = 'LayoutToggleContainer';

const NeedsBackupContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.needsBackupContainer, style]} {...rest} />
  ),
);
NeedsBackupContainer.displayName = 'NeedsBackupContainer';

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
          <NeedBackupText style={{marginTop: 0}}>
            {t('Needs Backup')}
          </NeedBackupText>
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
    <DraggableContentContainer>
      <Column>
        {key === 'coinbaseBalanceCard' ? (
          <Row>
            <HeaderImg>
              <CoinbaseSvg width="15" height="15" />
            </HeaderImg>
          </Row>
        ) : null}
        {wallets ? <Row>{header()}</Row> : null}
        <OptionName numberOfLines={1} ellipsizeMode={'tail'}>
          {name}
        </OptionName>
      </Column>
      <Toggle
        onPressOut={toggle}
        hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
        {show ? (
          <ObfuscationShow />
        ) : (
          <HideImgContainer>
            <ObfuscationHide />
          </HideImgContainer>
        )}
      </Toggle>
    </DraggableContentContainer>
  );
};
