import React from 'react';
import Checkbox from '../src/components/checkbox/Checkbox';
import {render} from '@testing-library/react-native';

it('renders correctly', async () => {
  const mockFn = jest.fn();
  const {toJSON} = render(
    <Checkbox onPress={() => mockFn} checked={false} data-testID={'testId'} />,
  );

  expect(toJSON()).toMatchSnapshot();
});
