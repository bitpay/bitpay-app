import React from 'react';
import renderer from 'react-test-renderer';
import Checkbox from '../src/components/checkbox/Checkbox';
import { Text } from 'react-native';

it('renders correctly', () => {
  const tree = renderer
    .create(<Checkbox onPress={(): void => {}} checked={true}>
      <Text>toggle</Text>
    </Checkbox>)
    .toJSON();
  expect(tree).toMatchSnapshot();
});
