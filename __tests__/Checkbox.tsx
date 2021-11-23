import React from 'react';
import Checkbox from '../src/components/checkbox/Checkbox';
import {fireEvent, render} from '@testing-library/react-native';
import {SlateDark, Action} from '../src/styles/colors';

it('renders correctly', async () => {
  const mockFn = jest.fn();
  const {toJSON, getByTestId, rerender} = render(
    <Checkbox onPress={mockFn} checked={false} />,
  );
  const checkbox = await getByTestId('checkbox');
  expect(getByTestId('checkboxBorder')).toHaveStyle({borderColor: SlateDark});
  fireEvent(checkbox, 'press');
  expect(mockFn).toHaveBeenCalled();
  expect(toJSON()).toMatchSnapshot();

  rerender(<Checkbox onPress={mockFn} checked={true} />);
  expect(getByTestId('checkboxBorder')).toHaveStyle({borderColor: Action});
  expect(toJSON()).toMatchSnapshot();
});
