import React, {memo} from 'react';
import {StyleSheet, TouchableHighlight, View} from 'react-native';
import {useTheme} from '../../contexts';
import {Column} from '../styled/Containers';
import {H5, ListItemSubText} from '../styled/Text';
import {Black, GhostWhite, SlateDark, White} from '../../styles/colors';
import AngleRight from '../../../assets/img/angle-right.svg';
import ContactIcon from '../../navigation/tabs/contacts/components/ContactIcon';
import {getCurrencyAbbreviation} from '../../utils/helper-methods';

const styles = StyleSheet.create({
  contactContainer: {
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  contactColumn: {
    marginLeft: 24,
    marginRight: 8,
  },
  contactImageContainer: {
    height: 35,
    width: 35,
    display: 'flex',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 8,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export interface ContactRowProps {
  address: string;
  coin: string;
  chain: string;
  network: string;
  name: string;
  tag?: number; // backward compatibility
  destinationTag?: number;
  email?: string;
  tokenAddress?: string;
  notes?: string;
}

interface Props {
  contact: ContactRowProps;
  onPress: () => void;
}

const ContactRow = ({contact, onPress}: Props) => {
  const theme = useTheme();
  const underlayColor = theme.dark ? '#121212' : GhostWhite;
  const {coin: _coin, name, email, address, chain, tokenAddress} = contact;
  const coin = getCurrencyAbbreviation(_coin, chain);
  return (
    <TouchableHighlight
      style={styles.contactContainer}
      underlayColor={underlayColor}
      onPress={onPress}>
      <View style={styles.rowContainer}>
        <View style={styles.contactImageContainer}>
          <ContactIcon
            name={name}
            coin={coin}
            size={45}
            chain={chain}
            address={address}
            tokenAddress={tokenAddress}
          />
        </View>
        <Column style={styles.contactColumn}>
          <H5 numberOfLines={2} ellipsizeMode={'tail'}>
            {name}
          </H5>
          <ListItemSubText numberOfLines={1} ellipsizeMode={'tail'}>
            {email ? email : address}
          </ListItemSubText>
        </Column>
        <AngleRight />
      </View>
    </TouchableHighlight>
  );
};

export default memo(ContactRow);
