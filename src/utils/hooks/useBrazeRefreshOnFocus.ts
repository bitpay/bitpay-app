import {useFocusEffect} from '@react-navigation/native';
import throttle from 'lodash.throttle';
import {useCallback} from 'react';
import {AppEffects} from '../../store/app';
import useAppDispatch from './useAppDispatch';

export const useBrazeRefreshOnFocus = () => {
  const dispatch = useAppDispatch();

  useFocusEffect(
    useCallback(
      throttle(
        () => {
          dispatch(AppEffects.requestBrazeContentRefresh());
        },
        10 * 1000,
        {leading: true, trailing: false},
      ),
      [],
    ),
  );
};

export default useBrazeRefreshOnFocus;
