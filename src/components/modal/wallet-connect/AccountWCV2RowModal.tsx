import React, {memo} from 'react';
import {
  CurrencyImageContainer,
  ActiveOpacity,
  Column,
} from '../../styled/Containers';
import {BaseText, H4, H5} from '../../styled/Text';
import Blockie from '../../blockie/Blockie';
import {StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {AccountRowProps} from '../../list/AccountListRow';
import SheetModal from '../base/sheet/SheetModal';
import {
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer as _WalletSelectMenuHeaderContainer,
} from '../../../navigation/wallet/screens/GlobalSelect';
import Checkbox from '../../checkbox/Checkbox';
import {useTheme} from '../../../contexts';
import Back from '../../back/Back';
import {ScrollView} from 'react-native-gesture-handler';
import {View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {KeyWalletsRowProps} from '../../../components/list/KeyWalletsRow';
import {SlateDark, White} from '../../../styles/colors';
import KeySvg from '../../../../assets/img/key.svg';

export type KeyWalletsRowWithChecked = Omit<KeyWalletsRowProps, 'accounts'> & {
  accounts: (AccountRowProps & {checked: boolean})[];
};
interface Props {
  isVisible: boolean;
  allKeys: KeyWalletsRowWithChecked[];
  onPress: (account: AccountRowProps & {checked: boolean}) => void;
  closeModal: () => void;
}

const styles = StyleSheet.create({
  keyNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginLeft: 10,
    marginBottom: 10,
  },
  keyName: {
    marginLeft: 10,
  },
  accountSettingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    display: 'flex',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  checkBoxColumn: {
    alignItems: 'flex-end',
  },
  closeModalButton: {
    height: 40,
    width: 40,
    borderRadius: 50,
    backgroundColor: '#9ba3ae33',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  walletSelectMenuHeaderContainer: {
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  centeredTitleContainer: {
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
  },
  invisiblePlaceholder: {
    width: 41,
  },
});

const AccountWCV2RowModal = ({
  isVisible,
  allKeys,
  onPress,
  closeModal,
}: Props) => {
  const {t} = useTranslation();
  const theme = useTheme();
  return (
    <SheetModal isVisible={isVisible} onBackdropPress={closeModal}>
      <WalletSelectMenuContainer style={{minHeight: 300}}>
        <_WalletSelectMenuHeaderContainer
          style={styles.walletSelectMenuHeaderContainer}>
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={closeModal}>
            <Back
              color={theme.dark ? 'white' : 'black'}
              background={'rgba(255, 255, 255, 0.2)'}
              opacity={1}
            />
          </TouchableOpacity>
          <View style={styles.centeredTitleContainer}>
            <H4>{t('Select Account')}</H4>
          </View>
          <View style={[styles.invisiblePlaceholder, {width: 41}]} />
        </_WalletSelectMenuHeaderContainer>
        <ScrollView>
          <View style={{paddingBottom: 50, paddingHorizontal: 10}}>
            {allKeys.map(k => (
              <React.Fragment key={k.key}>
                <View style={styles.keyNameContainer}>
                  {KeySvg({})}
                  <BaseText
                    style={[
                      styles.keyName,
                      {color: theme.dark ? White : SlateDark},
                    ]}>
                    {k.keyName || 'My Key'}
                  </BaseText>
                </View>
                {k.accounts.map(account => {
                  const handlePress = () => {
                    if (!account.checked) {
                      onPress(account);
                    }
                  };
                  return (
                    <TouchableOpacity
                      style={styles.accountSettingsContainer}
                      key={account.receiveAddress}
                      activeOpacity={ActiveOpacity}
                      onPress={handlePress}>
                      <CurrencyImageContainer style={{height: 40, width: 40}}>
                        <Blockie size={40} seed={account.receiveAddress} />
                      </CurrencyImageContainer>
                      <Column>
                        <H5 ellipsizeMode="tail" numberOfLines={1}>
                          {account.accountName}
                        </H5>
                      </Column>
                      <Column style={styles.checkBoxColumn}>
                        <Checkbox
                          radio
                          checked={account.checked}
                          onPress={handlePress}
                        />
                      </Column>
                    </TouchableOpacity>
                  );
                })}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      </WalletSelectMenuContainer>
    </SheetModal>
  );
};

export default memo(AccountWCV2RowModal);
