import React from 'react';
import {StyleSheet} from 'react-native';
import {useTheme} from '../../contexts';
import {H5} from '../styled/Text';

interface TabButtonProps {
  active?: boolean;
}

const styles = StyleSheet.create({
  tabButton: {
    borderBottomWidth: 1,
    padding: 12,
  },
});

const TabButton: React.FC<TabButtonProps & React.ComponentProps<typeof H5>> = ({
  active,
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <H5
      style={[
        styles.tabButton,
        {
          borderColor: active ? theme.colors.link : 'transparent',
          color: active ? theme.colors.link : theme.colors.text,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export default TabButton;
