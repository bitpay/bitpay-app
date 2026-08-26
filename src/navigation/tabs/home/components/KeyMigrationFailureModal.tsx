import Modal from 'react-native-modal';
import React from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {H5, Paragraph, TextAlign} from '../../../../components/styled/Text';
import {
  ActionContainer,
  TitleContainer,
  WIDTH,
} from '../../../../components/styled/Containers';
import Button from '../../../../components/button/Button';
import {LightBlack, White} from '../../../../styles/colors';
import ErrorSvg from '../../../../../assets/img/error.svg';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {setShowKeyMigrationFailureModal} from '../../../../store/app/app.actions';
import {useTranslation} from 'react-i18next';

const styles = StyleSheet.create({
  keyMigrationFailureModalContainer: {
    justifyContent: 'center',
    width: WIDTH - 16,
    padding: 20,
    borderRadius: 10,
  },
  title: {
    fontWeight: '700',
    marginLeft: 10,
  },
  titleRow: {
    flexDirection: 'row',
  },
  ctaContainer: {
    marginTop: 20,
  },
});

const KeyMigrationFailureModalContainer: React.FC<{
  children?: React.ReactNode;
}> = ({children}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.keyMigrationFailureModalContainer,
        {backgroundColor: theme.dark ? LightBlack : White},
      ]}>
      {children}
    </View>
  );
};

const Title: React.FC<React.ComponentProps<typeof H5>> = ({style, ...rest}) => (
  <H5 style={[styles.title, style]} {...rest} />
);

const TitleRow: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.titleRow}>{children}</View>
);

const CtaContainer: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.ctaContainer}>{children}</View>
);

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
