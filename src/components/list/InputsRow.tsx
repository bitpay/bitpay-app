import React, {memo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {ActiveOpacity, Column} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, ListItemSubText} from '../styled/Text';
import haptic from '../haptic-feedback/haptic';
import Checkbox from '../checkbox/Checkbox';
import {UtxoWithFiatAmount} from '../../navigation/wallet/screens/SelectInputs';

interface Props {
  item: UtxoWithFiatAmount;
  unitCode?: string;
  emit: (item: UtxoWithFiatAmount, index: number) => void;
  index: number;
}

const styles = StyleSheet.create({
  checkBoxContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  inputColumn: {
    marginLeft: 16,
  },
});

const InputSelectionRow = ({item, unitCode, emit, index}: Props) => {
  const {amount, address, checked: initialCheckValue, fiatAmount} = item;
  const [checked, setChecked] = useState(!!initialCheckValue);
  const [prevInitialCheckValue, setPrevInitialCheckValue] =
    useState(initialCheckValue);

  const toggle = (): void => {
    const newCheckedState = !checked;
    setChecked(newCheckedState);
    haptic('impactLight');
    emit({...item, checked: newCheckedState}, index);
  };

  // Synchronize internal state with prop changes (adjust-state-during-render
  // pattern instead of an effect, so there is no extra commit with stale state)
  if (prevInitialCheckValue !== initialCheckValue) {
    setPrevInitialCheckValue(initialCheckValue);
    setChecked(!!initialCheckValue);
  }

  return (
    <RowContainer
      activeOpacity={ActiveOpacity}
      onPress={toggle}
      style={{paddingLeft: 0, paddingRight: 0}}>
      <View style={styles.checkBoxContainer}>
        <Checkbox checked={checked} onPress={toggle} />
      </View>
      <Column style={styles.inputColumn}>
        <H5>
          {amount} {unitCode?.toUpperCase()}{' '}
        </H5>
        {item.network !== 'testnet' ? (
          <ListItemSubText textAlign={'left'}>{fiatAmount}</ListItemSubText>
        ) : null}
        <ListItemSubText numberOfLines={1} ellipsizeMode={'middle'}>
          {address}
        </ListItemSubText>
      </Column>
    </RowContainer>
  );
};

export default memo(InputSelectionRow);
