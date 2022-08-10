import {useFocusEffect} from '@react-navigation/native';
import throttle from 'lodash.throttle';
import {useMemo} from 'react';
import {AppEffects} from '../../store/app';
import useAppDispatch from './useAppDispatch';

export const useBrazeRefreshOnFocus = () => {
  const dispatch = useAppDispatch();

  useFocusEffect(
    useMemo(
      () =>
        throttle(
          () => {
            dispatch(AppEffects.requestBrazeContentRefresh());
          },
          10 * 1000,
          {leading: true, trailing: false},
        ),
      [dispatch],
    ),
  );
};

export default useBrazeRefreshOnFocus;
