import React from 'react';
import Checkbox from './Checkbox';
import {fireEvent, render} from '@test/render';
import {Action, SlateDark} from '../../styles/colors';

it('renders correctly', async () => {
  const mockFn = jest.fn();
  const {getByTestId, rerender} = render(
    <Checkbox onPress={mockFn} checked={false} />,
  );
  const checkbox = await getByTestId('checkbox');
  // On light theme (used by test render), unchecked border is SlateDark (8.6:1 on White)
  expect(getByTestId('checkboxBorder')).toHaveStyle({borderColor: SlateDark});
  fireEvent(checkbox, 'press');
  expect(mockFn).toHaveBeenCalled();

  rerender(<Checkbox onPress={mockFn} checked={true} />);
  expect(getByTestId('checkboxBorder')).toHaveStyle({borderColor: Action});
});
