import React from 'react';
import {StyleSheet, View} from 'react-native';
import BaseModal from '../../../../../components/modal/base/BaseModal';
import Button from '../../../../../components/button/Button';
import {useTheme} from '@react-navigation/native';
import {
  ActiveOpacity,
  WIDTH,
} from '../../../../../components/styled/Containers';
import {BaseText, Paragraph} from '../../../../../components/styled/Text';
import {
  Action,
  CharcoalBlack,
  GhostWhite,
  LightBlack,
  NeutralSlate,
  SlateDark,
  Black,
  White,
} from '../../../../../styles/colors';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {Trans, useTranslation} from 'react-i18next';
import CloseModal from '../../../../../../assets/img/close-modal-icon.svg';

const CARD_WIDTH = 343;

interface EnableLockWarningModalProps {
  isVisible: boolean;
  onBackdropPress: () => void;
  onConfirm: () => void;
}

const styles = StyleSheet.create({
  modalBackdropContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: CARD_WIDTH,
    maxWidth: WIDTH - 32,
    minHeight: 540,
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    gap: 32,
    width: '100%',
  },
  contentSection: {
    width: '100%',
  },
  title: {
    fontSize: 51,
    lineHeight: 48,
    letterSpacing: -0.34,
    fontWeight: '400',
  },
  subheading: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600',
  },
  description: {
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});

const EnableLockWarningModal: React.FC<EnableLockWarningModalProps> = ({
  isVisible,
  onBackdropPress,
  onConfirm,
}) => {
  const {t} = useTranslation();
  const {dark} = useTheme();

  return (
    <BaseModal
      id={'inAppMessage'}
      isVisible={isVisible}
      backdropOpacity={0.6}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={{margin: 0, alignItems: 'center', justifyContent: 'center'}}
      onBackdropPress={onBackdropPress}>
      <View style={styles.modalBackdropContainer}>
        <View
          style={[
            styles.modalCard,
            {backgroundColor: dark ? CharcoalBlack : GhostWhite},
          ]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[
                styles.closeButton,
                {backgroundColor: dark ? LightBlack : NeutralSlate},
              ]}
              activeOpacity={ActiveOpacity}
              onPress={onBackdropPress}>
              <CloseModal width={24} height={24} color={dark ? White : Black} />
            </TouchableOpacity>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.topSection}>
              <BaseText
                style={[styles.title, {color: dark ? White : CharcoalBlack}]}>
                <Trans
                  i18nKey="EnableBiometricsTitle"
                  components={[
                    <BaseText style={[styles.title, {color: Action}]} />,
                  ]}
                />
              </BaseText>
              <View style={styles.contentSection}>
                <BaseText
                  style={[
                    styles.subheading,
                    {color: dark ? White : CharcoalBlack},
                  ]}>
                  {t('Use with care.')}
                </BaseText>
                <Paragraph
                  style={[
                    styles.description,
                    {color: dark ? White : SlateDark},
                  ]}>
                  {t(
                    'Device passcode may also unlock the app, depending on your device settings. Anyone with biometric credentials enrolled on your device can also access the app. If your device passcode is known, that person can access it as well.',
                  )}
                </Paragraph>
              </View>
            </View>
            <View style={styles.footerRow}>
              <Button
                onPress={onConfirm}
                backgroundColor={Action}
                borderRadius={8}
                height={50}
                style={{minWidth: 154}}>
                {t('I understand')}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </BaseModal>
  );
};

export default EnableLockWarningModal;
