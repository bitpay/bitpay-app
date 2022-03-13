import ReactNative from 'react-native';
import {IDosh} from './types';

export * from './types';

const Dosh = ReactNative.NativeModules.Dosh as IDosh;

export default Dosh;
