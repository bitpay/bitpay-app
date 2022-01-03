import React, {ReactElement} from 'react';
import BottomPopupModal from '../../../components/modal/base/bottom-popup/BottomPopupModal';
import {BaseText, H4, TextAlign} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {Action, SlateDark} from '../../../styles/colors';
import BackupSvg from '../../../../assets/img/wallet/backup.svg';
import EncryptSvg from '../../../../assets/img/wallet/encrypt.svg';
import SettingsSvg from '../../../../assets/img/wallet/settings.svg';
import {ModalContainer} from '../../../components/styled/Containers';
import {useNavigation} from '@react-navigation/native';
import {WalletObj} from '../../../store/wallet/wallet.models';

const WalletOptionsTitleContainer = styled.View`
  margin-bottom: 25px;
`;

const OptionContainer = styled.TouchableOpacity`
  flex-direction: row;
  padding-bottom: 31px;
  align-items: stretch;
`;

const OptionIconContainer = styled.View`
  justify-content: center;
`;

const OptionTextContainer = styled.View`
  align-items: flex-start;
  justify-content: space-around;
  flex-direction: column;
  padding-left: 19px;
`;

const OptionTitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 19px;
  color: ${Action};
`;

const OptionDescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 19px;
  color: ${SlateDark};
`;

interface Props {
  isVisible: boolean;
  wallet: WalletObj;
  closeModal: () => void;
}

interface WalletOption {
  img: ReactElement;
  title: string;
  description: string;
  onPress: () => void;
}

const WalletOptionsBottomPopupModal = ({
  isVisible,
  closeModal,
  wallet,
}: Props) => {
  const navigation = useNavigation();
  const options: Array<WalletOption> = [
    {
      img: <BackupSvg />,
      title: 'Create a Backup Phrase',
      description:
        'The only way to recover a wallet if your phone is lost or stolen.',
      onPress: () => null,
    },
    {
      img: <EncryptSvg />,
      title: 'Encrypt your wallet',
      description:
        'Prevent an unauthorized used from sending funds out of your wallet.',
      onPress: () => null,
    },
    {
      img: <SettingsSvg />,
      title: 'Wallet Settings',
      description: 'View all the ways to manage and configure your wallet.',
      onPress: () =>
        navigation.navigate('Wallet', {
          screen: 'WalletSettings',
          params: {
            wallet,
          },
        }),
    },
  ];

  return (
    <BottomPopupModal isVisible={isVisible} onBackdropPress={closeModal}>
      <ModalContainer>
        <WalletOptionsTitleContainer>
          <TextAlign align={'center'}>
            <H4>Wallet Options</H4>
          </TextAlign>
        </WalletOptionsTitleContainer>
        {options.map(({img, title, description, onPress}, index) => {
          return (
            <OptionContainer
              key={index}
              activeOpacity={0.75}
              onPress={() => {
                closeModal();
                onPress();
              }}>
              <OptionIconContainer>{img}</OptionIconContainer>
              <OptionTextContainer>
                <OptionTitleText>{title}</OptionTitleText>
                <OptionDescriptionText>{description}</OptionDescriptionText>
              </OptionTextContainer>
            </OptionContainer>
          );
        })}
      </ModalContainer>
    </BottomPopupModal>
  );
};

export default WalletOptionsBottomPopupModal;
