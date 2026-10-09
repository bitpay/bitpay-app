import React, {ReactElement, memo} from 'react';
import {BaseText, ListItemSubText} from '../styled/Text';
import {useTranslation} from 'react-i18next';
import {GetContactName} from '../../store/wallet/effects/transactions/transactions';
import {ContactRowProps} from './ContactRow';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {Dimensions, StyleSheet, View} from 'react-native';
import {useIsLargeFont} from '../../utils/hooks/useFontScale';

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  transactionContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  iconContainer: {
    marginRight: 8,
  },
  description: {
    overflow: 'hidden',
    fontSize: 16,
    maxWidth: 150,
  },
  creator: {
    overflow: 'hidden',
    maxWidth: 150,
  },
  tailContainer: {
    marginLeft: 'auto' as any,
    display: 'flex',
    justifyContent: 'center',
  },
  stackedFull: {
    maxWidth: '100%',
  },
  valueStacked: {
    textAlign: 'left',
  },
  stackedTail: {
    alignSelf: 'stretch',
    marginTop: 6,
    marginLeft: 0,
  },
  value: {
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 16,
  },
});

interface Props {
  icon?: ReactElement;
  creator?: string;
  value?: string;
  time?: string;
  message?: string;
  onPressTransaction?: () => void;
  hideIcon?: boolean;
  recipientCount?: number;
  toAddress?: string;
  tokenAddress?: string;
  contactList?: ContactRowProps[];
  chain?: string;
  withCheckBox?: boolean;
}

const TransactionProposalRow = ({
  icon,
  creator,
  value,
  time,
  message,
  onPressTransaction,
  hideIcon,
  recipientCount,
  toAddress,
  tokenAddress,
  contactList,
  chain,
  withCheckBox,
}: Props) => {
  const {t} = useTranslation();
  let label: string = t('Sending');
  let labelLines: number = 1;

  if (recipientCount && recipientCount > 1) {
    label = t('Sending to multiple recipients (recipientCount)', {
      recipientCount,
    });
    labelLines = 2;
  } else if (toAddress && chain && contactList) {
    const contactName = GetContactName(toAddress, tokenAddress, contactList);
    if (contactName) {
      label = t('Sending to contactName', {contactName});
      labelLines = 2;
    }
  }

  const stacked = useIsLargeFont();
  return (
    <TouchableOpacity
      style={[
        styles.transactionContainer,
        stacked && {flexDirection: 'column'},
        {width: withCheckBox ? width - 80 : '100%'},
      ]}
      onPress={onPressTransaction}>
      {icon && !hideIcon && <View style={styles.iconContainer}>{icon}</View>}

      <View>
        <BaseText
          style={[styles.description, stacked && styles.stackedFull]}
          numberOfLines={stacked ? undefined : message ? 2 : labelLines}
          ellipsizeMode={'tail'}>
          {message ? message : label}
        </BaseText>
        {creator && (
          <ListItemSubText
            style={[styles.creator, stacked && styles.stackedFull]}
            numberOfLines={stacked ? 2 : 1}
            ellipsizeMode={'tail'}>
            {t('Created by ', {creator})}
          </ListItemSubText>
        )}
      </View>

      <View style={[styles.tailContainer, stacked && styles.stackedTail]}>
        {value && (
          <BaseText style={[styles.value, stacked && styles.valueStacked]}>
            {value}
          </BaseText>
        )}
        {time && (
          <ListItemSubText textAlign={stacked ? 'left' : 'right'}>
            {time}
          </ListItemSubText>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default memo(TransactionProposalRow);
