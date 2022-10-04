import Braze from 'react-native-appboy-sdk';

const flush = () => {
  Braze.requestImmediateDataFlush();
};

export default flush;
