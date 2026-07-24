import React from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import SearchSvg from '../../../../../assets/img/search.svg';
import {Slate30, SlateDark, White} from '../../../../styles/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
});

const Container: React.FC<{
  height?: number;
  children?: React.ReactNode;
}> = ({height, children}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        height ? {height} : null,
        {
          borderColor: theme.dark ? SlateDark : Slate30,
          backgroundColor: theme.dark ? 'transparent' : White,
        },
      ]}>
      {children}
    </View>
  );
};

const IconContainer: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.iconContainer}>{children}</View>
);

const Input: React.FC<React.ComponentProps<typeof TextInput>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <TextInput
      style={[styles.input, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  height?: number;
}

const AssetsSearchPill: React.FC<Props> = ({
  value,
  onChangeText,
  placeholder = 'Search',
  height,
}) => {
  return (
    <Container height={height}>
      <IconContainer>
        <SearchSvg width={20} height={20} />
      </IconContainer>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={'#6F7782'}
        testID="assets-search-input"
        accessibilityLabel="Search assets"
      />
    </Container>
  );
};

export default AssetsSearchPill;
