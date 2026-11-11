import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {BaseText} from '../styled/Text';
import {useBackupColors} from './colors';
import {Caution, Success, Warning} from '../../styles/colors';
import {isCommonWeakPassword, isLowEntropy} from '../../utils/password';

const styles = StyleSheet.create({
  container: {gap: 6, marginTop: -8},
  row: {flexDirection: 'row', alignItems: 'center', gap: 10},
  track: {flex: 1, height: 4, borderRadius: 15, overflow: 'hidden'},
  fill: {height: '100%'},
  label: {fontSize: 12, fontWeight: '500', minWidth: 44, textAlign: 'right'},
  hint: {fontSize: 12, lineHeight: 16},
});

type Requirement = 'length' | 'upper' | 'lower' | 'number' | 'symbol';

const REQUIREMENTS: [Requirement, RegExp][] = [
  ['length', /^.{8,}$/],
  ['upper', /[A-Z]/],
  ['lower', /[a-z]/],
  ['number', /[0-9]/],
  ['symbol', /[^A-Za-z0-9]/],
];

export const getPasswordStrength = (value: string) => {
  if (!value) {
    return {level: 0, tooEasy: false, missing: [] as Requirement[]};
  }
  const missing = REQUIREMENTS.filter(([, rule]) => !rule.test(value)).map(
    ([name]) => name,
  );
  const tooEasy = isCommonWeakPassword(value) || isLowEntropy(value);
  const level = tooEasy ? 1 : !missing.length ? 3 : missing.length <= 2 ? 2 : 1;
  return {level, tooEasy, missing};
};

export const PasswordStrength = ({value}: {value: string}) => {
  const {t} = useTranslation();
  const colors = useBackupColors();
  const {level, tooEasy, missing} = getPasswordStrength(value);
  const tone = [colors.progressTrack, Caution, Warning, Success][level];
  const labels = ['', t('Weak'), t('Fair'), t('Strong')];
  const requirementLabels: Record<Requirement, string> = {
    length: t('8+ characters'),
    upper: t('an uppercase letter'),
    lower: t('a lowercase letter'),
    number: t('a number'),
    symbol: t('a symbol (!@#$%^&*)'),
  };
  const hint = tooEasy
    ? t('Too easy to guess.')
    : missing.length
    ? t('Add {{requirements}}.', {
        requirements: missing.map(name => requirementLabels[name]).join(', '),
      })
    : null;
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <View style={[styles.track, {backgroundColor: colors.progressTrack}]}>
          <View
            style={[
              styles.fill,
              {width: `${[0, 33, 66, 100][level]}%`, backgroundColor: tone},
            ]}
          />
        </View>
        <BaseText
          style={[
            styles.label,
            {color: level ? tone : colors.textDescription},
          ]}>
          {labels[level]}
        </BaseText>
      </View>
      {hint ? (
        <BaseText style={[styles.hint, {color: colors.textDescription}]}>
          {hint}
        </BaseText>
      ) : null}
    </View>
  );
};
