import React from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {BaseText, H3, Paragraph} from '../../../styled/Text';
import Button from '../../../button/Button';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  Wrapper,
} from '../import-ledger-wallet.styled';
import {
  Action,
  LightBlue,
  NeutralSlate,
  SlateDark,
} from '../../../../styles/colors';

interface Props {
  onContinue: () => void;
}

const styles = StyleSheet.create({
  instructionsCard: {
    borderRadius: 12,
    padding: 24,
    marginTop: 32,
  },
  instructionsRow: {
    display: 'flex',
    flexDirection: 'row',
  },
  instructionNumberColumn: {
    flexGrow: 0,
  },
  instructionNumberIcon: {
    backgroundColor: LightBlue,
    borderRadius: 40,
    minHeight: 25,
    minWidth: 25,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    color: Action,
  },
  instructionsTextColumn: {
    flex: 1,
  },
  instructionsText: {
    fontSize: 16,
    fontWeight: '400',
  },
});

export const LearnHow: React.FC<Props> = props => {
  const {t} = useTranslation();
  const theme = useTheme();
  const instructions = [
    t('Connect and unlock your Ledger device.'),
    t('Open your preferred compatible wallet.'),
    t('Navigate to Settings, then Blind Signing.'),
    t('Toggle settings so Blind Signing is Enabled.'),
  ];

  return (
    <Wrapper>
      <Header>
        <H3>{t('Enable Blind Signing')}</H3>
      </Header>

      <DescriptionRow>
        <Paragraph>
          {t(
            'Enabling blind signing allows you to manage and sign transactions from your Ledger wallet using the BitPay app.',
          )}
        </Paragraph>
      </DescriptionRow>

      <View
        style={[
          styles.instructionsCard,
          {backgroundColor: theme.dark ? SlateDark : NeutralSlate},
        ]}>
        {instructions.map((inst, idx) => (
          <View
            key={idx}
            style={[styles.instructionsRow, idx <= 0 ? null : {marginTop: 24}]}>
            <View style={styles.instructionNumberColumn}>
              <View style={styles.instructionNumberIcon}>
                <BaseText style={styles.instructionNumberText}>
                  {idx + 1}
                </BaseText>
              </View>
            </View>

            <View style={styles.instructionsTextColumn}>
              <BaseText style={styles.instructionsText}>{inst}</BaseText>
            </View>
          </View>
        ))}
      </View>

      <ActionsRow>
        <Button onPress={props.onContinue}>{t('Continue')}</Button>
      </ActionsRow>
    </Wrapper>
  );
};
