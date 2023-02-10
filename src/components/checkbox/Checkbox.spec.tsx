import React from 'react';
import Checkbox from './Checkbox';
import {fireEvent, render} from '@testing-library/react-native';
import {SlateDark, Action} from '../../styles/colors';

it('renders correctly', async () => {
  const mockFn = jest.fn();
  const {getByTestId, rerender} = render(
    <Checkbox onPress={mockFn} checked={false} />,
  );
  const checkbox = await getByTestId('checkbox');
  expect(getByTestId('checkboxBorder')).toHaveStyle({borderColor: SlateDark});
  fireEvent(checkbox, 'press');
  expect(mockFn).toHaveBeenCalled();

  rerender(<Checkbox onPress={mockFn} checked={true} />);
  expect(getByTestId('checkboxBorder')).toHaveStyle({borderColor: Action});
});
