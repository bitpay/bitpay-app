import React, {useEffect, useState} from 'react';
import {AppState, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import haptic from '../haptic-feedback/haptic';
import BoxInput from '../form/BoxInput';
import {BaseText} from '../styled/Text';
import {
  AdvancedOptions,
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptionsContainer,
} from '../styled/Containers';
import {useTheme} from '../../contexts';
import ChevronDownSvg from '../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../assets/img/chevron-up.svg';

const styles = StyleSheet.create({
  input: {padding: 18},
  paragraph: {marginTop: 0, marginRight: 20, marginBottom: 20, marginLeft: 20},
});

export const PassphraseOptions = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'inactive' || state === 'background') {
        onChange('');
      }
    });
    return () => sub.remove();
  }, [onChange]);

  return (
    <AdvancedOptionsContainer>
      <AdvancedOptionsButton
        testID="show-advanced-options"
        accessibilityLabel={
          open ? t('Hide Advanced Options') : t('Show Advanced Options')
        }
        onPress={() => {
          haptic('impactLight');
          setOpen(!open);
        }}>
        <AdvancedOptionsButtonText>
          {open ? t('Hide Advanced Options') : t('Show Advanced Options')}
        </AdvancedOptionsButtonText>
        {open ? <ChevronUpSvg /> : <ChevronDownSvg />}
      </AdvancedOptionsButton>
      {open ? (
        <AdvancedOptions>
          <View style={styles.input}>
            <BoxInput
              testID="passphrase-input"
              accessibilityLabel={t('Wallet password')}
              placeholder={'strongPassword123'}
              type={'password'}
              textContentType={'none'}
              autoComplete={'off'}
              value={value}
              onChangeText={onChange}
            />
          </View>
          <BaseText
            style={[styles.paragraph, {color: theme.colors.description}]}>
            {t(
              "This field is only for users who, in previous versions (it's not supported anymore), set a password to protect their recovery phrase. This field is not for your encrypt password.",
            )}
          </BaseText>
        </AdvancedOptions>
      ) : null}
    </AdvancedOptionsContainer>
  );
};
