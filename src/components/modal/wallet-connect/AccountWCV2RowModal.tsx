import React, {memo} from 'react';
import {
  CurrencyImageContainer,
  ActiveOpacity,
  Column,
} from '../../styled/Containers';
import {H4, H5, TextAlign} from '../../styled/Text';
import Blockie from '../../blockie/Blockie';
import styled from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {AccountRowProps} from '../../list/AccountListRow';
import SheetModal from '../base/sheet/SheetModal';
import {
  WalletSelectMenuContainer,
  WalletSelectMenuHeaderContainer,
} from '../../../navigation/wallet/screens/GlobalSelect';
import Checkbox from '../../checkbox/Checkbox';
import CloseModal from '../../../assets/img/close-modal-icon.svg';
import {useTheme} from 'styled-components/native';
import Back from '../../back/Back';

interface Props {
  isVisible: boolean;
  accounts: (AccountRowProps & {checked: boolean})[];
  onPress: (account: AccountRowProps & {checked: boolean}) => void;
  closeModal: () => void;
}

const AccountSettingsContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  display: flex;
  padding: 8px 16px;
  gap: 8px;
`;

const CheckBoxColumn = styled(Column)`
  align-items: flex-end;
`;

const CloseModalButton = styled.TouchableOpacity`
  height: 40px;
  width: 40px;
  border-radius: 50px;
  background-color: #9ba3ae33;
  position: absolute;
  top: 10px;
  left: 16px;
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
        <WalletSelectMenuHeaderContainer
          style={{
            marginBottom: 30,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
          <CloseModalButton onPress={closeModal}>
            <Back
              color={theme.dark ? 'white' : 'black'}
              background={'rgba(255, 255, 255, 0.2)'}
              opacity={1}
            />
          </CloseModalButton>
          <TextAlign align={'center'}>
            <H4>{t('Select Account')}</H4>
          </TextAlign>
        </WalletSelectMenuHeaderContainer>
        {accounts.map((account: AccountRowProps & {checked: boolean}) => (
          <AccountSettingsContainer
            key={account.receiveAddress}
            activeOpacity={ActiveOpacity}
            onPress={() => onPress(account)}>
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
                checked={account.checked}
                onPress={() => onPress(account)}
              />
            </CheckBoxColumn>
          </AccountSettingsContainer>
        ))}
      </WalletSelectMenuContainer>
    </SheetModal>
  );
};

export default memo(AccountWCV2RowModal);
