import React from 'react';
import {View} from 'react-native';
import {render} from '@testing-library/react-native';
import PerformanceProfiler from './PerformanceProfiler';

describe('PerformanceProfiler', () => {
  it('renders its child without profiling when performance debug is disabled', () => {
    const onRender = jest.fn();
    const {getByTestId} = render(
      <PerformanceProfiler id="test" onRender={onRender}>
        <View testID="profiled-child" />
      </PerformanceProfiler>,
    );

    expect(getByTestId('profiled-child')).toBeTruthy();
    expect(onRender).not.toHaveBeenCalled();
  });
});
