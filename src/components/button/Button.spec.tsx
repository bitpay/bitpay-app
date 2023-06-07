import React from 'react';
import Button from './Button';
import {fireEvent, render} from '@testing-library/react-native';

it('should render correctly', async () => {
  const mockFn = jest.fn();

  const {getByTestId} = render(<Button onPress={mockFn}>Continue</Button>);

  const button = await getByTestId('button');
  fireEvent(button, 'press');
  expect(mockFn).toHaveBeenCalled();
});
