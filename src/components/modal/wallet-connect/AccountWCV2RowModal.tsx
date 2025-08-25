import React, {memo} from 'react';
import {
  CurrencyImageContainer,
  ActiveOpacity,
  Column,
} from '../../styled/Containers';
import {BaseText, H4, H5} from '../../styled/Text';
import Blockie from '../../blockie/Blockie';
import styled from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {AccountRowProps} from '../../list/AccountListRow';
import SheetModal from '../base/sheet/SheetModal';
import {
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer as _WalletSelectMenuHeaderContainer,
} from '../../../navigation/wallet/screens/GlobalSelect';
import Checkbox from '../../checkbox/Checkbox';
import {useTheme} from 'styled-components/native';
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

const KeyNameContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 20px;
  margin-left: 10px;
  margin-bottom: 10px;
`;

const KeyName = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 10px;
`;

const AccountSettingsContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  display: flex;
  padding: 8px 16px;
  gap: 8px;
`;

const CheckBoxColumn = styled(Column)`
  align-items: flex-end;
`;

const CloseModalButton = styled(TouchableOpacity)`
  height: 40px;
  width: 40px;
  border-radius: 50px;
  background-color: #9ba3ae33;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: 8px;
`;

const WalletSelectMenuHeaderContainer = styled(
  _WalletSelectMenuHeaderContainer,
)`
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  position: relative;
`;

const CenteredTitleContainer = styled.View`
  align-items: center;
  position: absolute;
  left: 0;
  right: 0;
  top: 20px;
`;

const InvisiblePlaceholder = styled.View`
  width: 41px;
`;

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
        <WalletSelectMenuHeaderContainer>
          <CloseModalButton onPress={closeModal}>
            <Back
              color={theme.dark ? 'white' : 'black'}
              background={'rgba(255, 255, 255, 0.2)'}
              opacity={1}
            />
          </CloseModalButton>
          <CenteredTitleContainer>
            <H4>{t('Select Account')}</H4>
          </CenteredTitleContainer>
          <InvisiblePlaceholder style={{width: 41}} />
        </WalletSelectMenuHeaderContainer>
        <ScrollView>
          <View style={{paddingBottom: 50, paddingHorizontal: 10}}>
            {allKeys.map(k => (
              <React.Fragment key={k.key}>
                <KeyNameContainer>
                  {KeySvg({})}
                  <KeyName>{k.keyName || 'My Key'}</KeyName>
                </KeyNameContainer>
                {k.accounts.map(account => {
                  const handlePress = () => {
                    if (!account.checked) {
                      onPress(account);
                    }
                  };
                  return (
                    <AccountSettingsContainer
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
                      <CheckBoxColumn>
                        <Checkbox
                          radio
                          checked={account.checked}
                          onPress={handlePress}
                        />
                      </CheckBoxColumn>
                    </AccountSettingsContainer>
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
