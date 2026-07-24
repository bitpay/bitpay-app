import React, {useState} from 'react';
import {TouchableOpacity, View, StyleSheet} from 'react-native';
import {useTheme} from '../../../contexts';
import haptic from '../../../components/haptic-feedback/haptic';
import Checkbox from '../../../components/checkbox/Checkbox';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {TermsOfUseModel} from '../screens/TermsOfUse';

interface Props {
  emit: (id: number) => void;
  term: TermsOfUseModel;
}

const styles = StyleSheet.create({
  termsBoxContainer: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderRadius: 11,
    marginVertical: 10,
  },
  checkBoxContainer: {
    flexDirection: 'column',
    marginTop: 10,
    marginRight: 20,
  },
  termTextContainer: {
    flexDirection: 'column',
    flexShrink: 1,
  },
});

const TermsBoxContainer = ({
  activeOpacity,
  onPressIn,
  testID,
  children,
}: {
  activeOpacity?: number;
  onPressIn?: () => void;
  testID?: string;
  children: React.ReactNode;
}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPressIn={onPressIn}
      testID={testID}
      style={[
        styles.termsBoxContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
      ]}>
      {children}
    </TouchableOpacity>
  );
};

const CheckBoxContainer = ({children}: {children: React.ReactNode}) => (
  <View style={styles.checkBoxContainer}>{children}</View>
);

const TermTextContainer = ({children}: {children: React.ReactNode}) => (
  <View style={styles.termTextContainer}>{children}</View>
);

const TermsBox = ({term, emit}: Props) => {
  const {statement} = term;
  const [checked, setChecked] = useState(false);

  const toggleCheck = (): void => {
    haptic('impactLight');
    const newChecked = !checked;
    setChecked(newChecked);
    if (newChecked) {
      emit(term.id);
    } else {
      emit(-term.id);
    }
  };

  return (
    <TermsBoxContainer
      activeOpacity={1.0}
      onPressIn={toggleCheck}
      testID={term.accessibilityLabel}>
      <CheckBoxContainer>
        <Checkbox
          checked={checked}
          onPress={toggleCheck}
          testID={term.accessibilityLabel}
        />
      </CheckBoxContainer>
      <TermTextContainer>{statement}</TermTextContainer>
    </TermsBoxContainer>
  );
};

export default TermsBox;
