import * as React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Checkbox from '../../src/components/checkbox/Checkbox';
import {storiesOf} from '@storybook/react-native';
import {action} from '@storybook/addon-actions';
import {boolean, withKnobs} from '@storybook/addon-knobs';
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: '20%',
    marginHorizontal: '10%',
  },
  textField: {paddingLeft: '2%'},
});

storiesOf('Checkbox', module)
  .addDecorator(story => <View>{story()}</View>)
  .addDecorator(withKnobs)
  .add('Default', () => (
    <View style={styles.row}>
      <Checkbox
        onPress={action('checkbox press')}
        checked={boolean('Toggle Check box', false)}
        disabled={boolean('Disabled', false)}
      />
      <Text style={styles.textField}>Toggle me</Text>
    </View>
  ));
