import React from 'react';
import Button from '../src/components/button/Button';
import {fireEvent, render} from '@testing-library/react-native';

jest.mock('react-native-haptic-feedback', () => {
  return {
    trigger: jest.fn(),
  };
});

it('should render correctly', async () => {
  const mockFn = jest.fn();

  const {getByText, toJSON} = render(
    <Button onPress={mockFn}>Continue</Button>,
  );

  fireEvent(getByText('Continue'), 'press');

  expect(mockFn).toHaveBeenCalled();
  expect(toJSON()).toMatchSnapshot();
});
