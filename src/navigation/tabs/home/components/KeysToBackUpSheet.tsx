import React from 'react';
import {StyleSheet, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import Button from '../../../../components/button/Button';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {BaseText} from '../../../../components/styled/Text';
import {LightBlack, White} from '../../../../styles/colors';
import {useTheme} from '../../../../contexts';
import {Key} from '../../../../store/wallet/wallet.models';
import {filterTestnetWallets} from '../../../../store/wallet/utils/testnet';

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    flexGrow: 0,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  row: {paddingLeft: 0, paddingRight: 0},
  walletCount: {flexShrink: 0},
});

export const KeysToBackUpSheet = ({
  isVisible,
  keys,
  onClose,
  onSelectKey,
}: {
  isVisible: boolean;
  keys: Key[];
  onClose: () => void;
  onSelectKey: (key: Key) => void;
}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const {height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const backgroundColor = theme.dark ? LightBlack : White;
  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      onBackdropPress={onClose}
      backgroundColor={backgroundColor}>
      <BottomSheetScrollView
        style={[
          styles.container,
          {
            backgroundColor,
            maxHeight: height - insets.top - insets.bottom - 20,
          },
        ]}
        contentContainerStyle={{
          paddingHorizontal: 30,
          paddingTop: 30,
          paddingBottom: Math.max(30, insets.bottom),
        }}>
        <BaseText style={styles.title}>{t('Choose a Key to Back Up')}</BaseText>
        {keys.map((key, i) => {
          const select = () => {
            onClose();
            onSelectKey(key);
          };
          return (
            <React.Fragment key={key.id}>
              <Setting
                testID={`key-to-back-up-${key.id}`}
                style={styles.row}
                onPress={select}>
                <SettingTitle>{key.keyName}</SettingTitle>
                <Button
                  buttonType={'pill'}
                  style={styles.walletCount}
                  onPress={select}>
                  {t('{{count}} wallet', {
                    count: filterTestnetWallets(key.wallets).length,
                  })}
                </Button>
              </Setting>
              {i < keys.length - 1 ? <Hr /> : null}
            </React.Fragment>
          );
        })}
      </BottomSheetScrollView>
    </SheetModal>
  );
};
