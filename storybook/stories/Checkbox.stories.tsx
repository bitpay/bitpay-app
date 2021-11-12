import * as React from 'react';
import {View} from 'react-native';
import Checkbox from '../../src/components/checkbox/Checkbox';
import {storiesOf} from '@storybook/react-native';
import {action} from '@storybook/addon-actions';
import {boolean, withKnobs} from '@storybook/addon-knobs';
import styled from 'styled-components/native';

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  margin: 20% 10%;
`;

const TextField = styled.Text`
  padding-left: 2%;
`;

storiesOf('Checkbox', module)
  .addDecorator(story => <View>{story()}</View>)
  .addDecorator(withKnobs)
  .add('Default', () => (
    <Row>
      <Checkbox
        onPress={action('checkbox press')}
        checked={boolean('Toggle Check box', false)}
        disabled={boolean('Disabled', false)}
      />
      <TextField>Toggle me</TextField>
    </Row>
  ));
