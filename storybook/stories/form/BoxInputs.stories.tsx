import * as React from 'react';
import {storiesOf} from '@storybook/react-native';
import BoxInput from '../../../src/components/form/BoxInput';
import {View} from 'react-native';
import {text, withKnobs, boolean, select} from '@storybook/addon-knobs';
import styled from 'styled-components/native';

const InputContainer = styled.View`
  margin: 20% 10%;
`;

storiesOf('BoxInput', module)
  .addDecorator(story => <View>{story()}</View>)
  .addDecorator(withKnobs)
  .add('Default', () => {
    return (
      <InputContainer>
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
      </InputContainer>
    );
  });
