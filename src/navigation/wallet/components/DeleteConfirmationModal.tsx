import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {SheetContainer} from '../../../components/styled/Containers';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import CautionSvg from '../../../../assets/img/error.svg';
import {H4, Link, Paragraph} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import haptic from '../../../components/haptic-feedback/haptic';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTranslation} from 'react-i18next';

interface ConfirmationModalProps {
  description: string;
  onPressOk: () => void;
  isVisible: boolean;
  onPressCancel: () => void;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    marginLeft: 10,
  },
  deleteModalParagraph: {
    marginTop: 15,
    marginBottom: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopColor: '#ebebeb',
    borderTopWidth: 1,
    paddingTop: 20,
  },
});

const DeleteConfirmationModal = ({
  description,
  onPressOk,
  isVisible,
  onPressCancel,
}: ConfirmationModalProps) => {
  const {t} = useTranslation();
  const theme = useTheme();
  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      onBackdropPress={onPressCancel}>
      <SheetContainer>
        <View style={styles.header}>
          <CautionSvg />
          <H4 style={styles.title}>{t('Warning!')}</H4>
        </View>

        <Paragraph
          style={[
            styles.deleteModalParagraph,
            {color: theme.dark ? White : SlateDark},
          ]}>
          {description}
        </Paragraph>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              onPressOk();
            }}>
            <Link>{t('DELETE')}</Link>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              onPressCancel();
            }}>
            <Link style={{color: theme.dark ? White : SlateDark}}>
              {t('NEVERMIND')}
            </Link>
          </TouchableOpacity>
        </View>
      </SheetContainer>
    </SheetModal>
  );
};

export default DeleteConfirmationModal;
