import {useDispatch} from 'react-redux';
import {AnyAction} from 'redux';
import {ThunkDispatch} from 'redux-thunk';
import {RootState} from '../../store';

type AppDispatch = ThunkDispatch<RootState, unknown, AnyAction>;

export const useAppDispatch = () => {
  return useDispatch<AppDispatch>();
};

export default useAppDispatch;
