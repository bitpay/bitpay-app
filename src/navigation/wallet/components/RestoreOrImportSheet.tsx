import React from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {
  Hr,
  Setting,
  SettingTitle,
  SheetContainer,
} from '../../../components/styled/Containers';
import {BaseText} from '../../../components/styled/Text';
import AngleRight from '../../../../assets/img/angle-right.svg';

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  row: {paddingLeft: 0, paddingRight: 0},
});

export const RestoreOrImportSheet = ({
  isVisible,
  onClose,
  context,
}: {
  isVisible: boolean;
  onClose: () => void;
  context?: string;
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const options = [
    {
      id: 'restore-or-import-phrase',
      label: t('Recovery Phrase'),
      onPress: () =>
        navigation.navigate('Import', {context, importTab: 'phrase'}),
    },
    {
      id: 'restore-or-import-file',
      label: t('Keyshare / File'),
      onPress: () =>
        navigation.navigate('Import', {context, importTab: 'file'}),
    },
  ];
  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      onBackdropPress={onClose}>
      <SheetContainer>
        <BaseText style={styles.title}>{t('Restore or Import')}</BaseText>
        {options.map(({id, label, onPress}, i) => (
          <React.Fragment key={id}>
            <Setting
              testID={id}
              style={styles.row}
              onPress={() => {
                onClose();
                onPress();
              }}>
              <SettingTitle>{label}</SettingTitle>
              <AngleRight />
            </Setting>
            {i < options.length - 1 ? <Hr /> : null}
          </React.Fragment>
        ))}
      </SheetContainer>
    </SheetModal>
  );
};
