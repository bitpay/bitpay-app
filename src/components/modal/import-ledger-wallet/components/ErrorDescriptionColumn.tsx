import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Black, Warning25} from '../../../../styles/colors';
import {Paragraph as _Paragraph} from '../../../styled/Text';
import WarningBrownSvg from '../../../../../assets/img/warning-brown.svg';

const styles = StyleSheet.create({
  paragraph: {flex: 1, color: Black},
  descriptionColumn: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Warning25,
    borderRadius: 12,
    padding: 12,
    marginTop: 32,
  },
  warningImageContainer: {paddingRight: 8},
});

const Paragraph: React.FC<React.ComponentProps<typeof _Paragraph>> = ({
  style,
  ...rest
}) => <_Paragraph style={[styles.paragraph, style]} {...rest} />;

export const ErrorDescriptionColumn = ({error}: {error: string}) => {
  return (
    <View style={styles.descriptionColumn}>
      <View style={styles.warningImageContainer}>
        <WarningBrownSvg />
      </View>
      <Paragraph>{error}</Paragraph>
    </View>
  );
};
