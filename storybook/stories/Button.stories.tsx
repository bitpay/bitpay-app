import {storiesOf} from '@storybook/react-native';
import {action} from '@storybook/addon-actions';
import Button from '../../src/components/button/Button';
import {View} from 'react-native';
import * as React from 'react';
import {boolean, select, withKnobs, text} from '@storybook/addon-knobs';
import styled from 'styled-components/native';
const ButtonStyle = {
  Primary: undefined,
  Secondary: 'secondary',
};
const ButtonType = {
  Pill: 'pill',
  Default: undefined,
  Link: 'link',
};

const ButtonContainer = styled.View`
  flex-direction: column;
  align-items: center;
  margin: 20% 5%;
`;

storiesOf('Button', module)
  .addDecorator(story => <View>{story()}</View>)
  .addDecorator(withKnobs)
  .add('Default', () => (
    <ButtonContainer>
      <Button
        onPress={action('on button press')}
        buttonStyle={select('Style', ButtonStyle, undefined)}
        buttonType={select('Type', ButtonType, undefined)}
        disabled={boolean('Disabled', false)}>
        {text('Button Name', 'Button')}
      </Button>
    </ButtonContainer>
  ));
