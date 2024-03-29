import React from 'react';
import Checkbox from './Checkbox';
import {fireEvent, render} from '@test/render';
import {Action} from '../../styles/colors';

it('renders correctly', async () => {
  const mockFn = jest.fn();
  const {getByTestId, rerender} = render(
    <Checkbox onPress={mockFn} checked={false} />,
  );
  const checkbox = await getByTestId('checkbox');
  expect(getByTestId('checkboxBorder')).toHaveStyle({borderColor: '#E5E5F2'});
  fireEvent(checkbox, 'press');
  expect(mockFn).toHaveBeenCalled();

  rerender(<Checkbox onPress={mockFn} checked={true} />);
  expect(getByTestId('checkboxBorder')).toHaveStyle({borderColor: Action});
});
