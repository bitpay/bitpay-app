import React, {memo} from 'react';
import {
  CurrencyImageContainer,
  ActiveOpacity,
  Column,
} from '../../styled/Containers';
import {H4, H5} from '../../styled/Text';
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
import {TouchableOpacity} from 'react-native-gesture-handler';

interface Props {
  isVisible: boolean;
  accounts: (AccountRowProps & {checked: boolean})[];
  onPress: (account: AccountRowProps & {checked: boolean}) => void;
  closeModal: () => void;
}

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
  accounts,
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
          <View style={{paddingBottom: 50}}>
            {accounts.map((account: AccountRowProps & {checked: boolean}) => (
              <AccountSettingsContainer
                key={account.receiveAddress}
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  if (!account.checked) {
                    onPress(account);
                  }
                }}>
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
                    radio={true}
                    checked={account.checked}
                    onPress={() => {
                      if (!account.checked) {
                        onPress(account);
                      }
                    }}
                  />
                </CheckBoxColumn>
              </AccountSettingsContainer>
            ))}
          </View>
        </ScrollView>
      </WalletSelectMenuContainer>
    </SheetModal>
  );
};

export default memo(AccountWCV2RowModal);
