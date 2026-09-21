import * as React from 'react';
import {storiesOf} from '@storybook/react-native';
import BoxInput from '../../../src/components/form/BoxInput';
import {StyleSheet, View} from 'react-native';
import {text, withKnobs, boolean, select} from '@storybook/addon-knobs';
const styles = StyleSheet.create({
  inputContainer: {marginVertical: '20%', marginHorizontal: '10%'},
});

storiesOf('BoxInput', module)
  .addDecorator(story => <View>{story()}</View>)
  .addDecorator(withKnobs)
  .add('Default', () => {
    return (
      <View style={styles.inputContainer}>
        <BoxInput
          label={text('Label', 'Email')}
          placeholder={text('Placeholder', 'satoshi@nakamoto.com')}
          error={boolean('Error', false)}
          type={select(
            'Type',
            {Password: 'password', Text: undefined},
            undefined,
          )}
        />
      </View>
    );
  });
