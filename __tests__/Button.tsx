import React from 'react';
import Button from '../src/components/button/Button';
import {fireEvent, render} from './render';

jest.mock('react-native-haptic-feedback', () => {
  return {
    trigger: jest.fn(),
  };
});

it('should render correctly', async () => {
  const mockFn = jest.fn();

  const {getByTestId} = render(<Button onPress={mockFn}>Continue</Button>);

  const button = await getByTestId('button');
  fireEvent(button, 'press');
  expect(mockFn).toHaveBeenCalled();
});
