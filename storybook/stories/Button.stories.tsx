import {storiesOf} from '@storybook/react-native';
import {action} from '@storybook/addon-actions';
import Button from '../../src/components/button/Button';
import {StyleSheet, View} from 'react-native';
import * as React from 'react';
import {boolean, select, withKnobs, text} from '@storybook/addon-knobs';
const ButtonStyle = {
  Primary: undefined,
  Secondary: 'secondary',
};
const ButtonType = {
  Pill: 'pill',
  Default: undefined,
  Link: 'link',
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: '20%',
    marginHorizontal: '5%',
  },
});

storiesOf('Button', module)
  .addDecorator(story => <View>{story()}</View>)
  .addDecorator(withKnobs)
  .add('Default', () => (
    <View style={styles.buttonContainer}>
      <Button
        onPress={action('on button press')}
        buttonStyle={select('Style', ButtonStyle, undefined)}
        buttonType={select('Type', ButtonType, undefined)}
        disabled={boolean('Disabled', false)}>
        {text('Button Name', 'Button')}
      </Button>
    </View>
  ));
