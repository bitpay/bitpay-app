import Modal from 'react-native-modal';
import React from 'react';
import styled from 'styled-components/native';
import {H5, Paragraph, TextAlign} from '../../../../components/styled/Text';
import {
  ActionContainer,
  TitleContainer,
  WIDTH,
} from '../../../../components/styled/Containers';
import Button from '../../../../components/button/Button';
import {LightBlack, White} from '../../../../styles/colors';
import ErrorSvg from '../../../../../assets/img/error.svg';
import {Linking} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {setShowKeyMigrationFailureModal} from '../../../../store/app/app.actions';
import {useTranslation} from 'react-i18next';

const KeyMigrationFailureModalContainer = styled.View`
  justify-content: center;
  width: ${WIDTH - 16}px;
  padding: 20px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 10px;
`;

const Title = styled(H5)`
  font-weight: 700;
  margin-left: 10px;
`;

const TitleRow = styled.View`
  flex-direction: row;
`;

const CtaContainer = styled.View`
  margin-top: 20px;
`;

const KeyMigrationFailureModal: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const showKeyMigrationFailureModal = useAppSelector(
    ({APP}) => APP.showKeyMigrationFailureModal,
  );

  const getHelp = () => {
    dispatch(setShowKeyMigrationFailureModal(false));
    Linking.openURL('https://bitpay.com/support');
  };

  const gotoImport = () => {
    dispatch(setShowKeyMigrationFailureModal(false));
    navigation.navigate('Import');
  };

  return (
    <Modal
      isVisible={showKeyMigrationFailureModal}
      backdropOpacity={0.4}
      animationIn={'fadeInUp'}
      animationOut={'fadeOutDown'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={{
        alignItems: 'center',
      }}>
      <KeyMigrationFailureModalContainer>
        <TitleContainer style={{marginTop: 10, marginBottom: 20}}>
          <TitleRow>
            <ErrorSvg width={25} height={25} />
            <Title>{t('Problem Importing Keys')}</Title>
          </TitleRow>
        </TitleContainer>
        <TextAlign align={'left'}>
          <Paragraph>
            {t(
              'There was a problem importing your keys. You can either import your keys with your 12-word Recovery Phrase or you can restore to the previous version of the BitPay app.',
            )}
          </Paragraph>
        </TextAlign>
        <CtaContainer>
          <ActionContainer style={{marginTop: 10, marginBottom: 15}}>
            <Button buttonStyle={'primary'} onPress={getHelp}>
              {t('Get Help')}
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button buttonStyle={'secondary'} onPress={gotoImport}>
              {t('Import Recovery Phrase')}
            </Button>
          </ActionContainer>
        </CtaContainer>
      </KeyMigrationFailureModalContainer>
    </Modal>
  );
};

export default KeyMigrationFailureModal;
