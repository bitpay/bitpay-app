import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export default (feedbackType: HapticFeedbackTypes) => {
  ReactNativeHapticFeedback.trigger(feedbackType, options);
};
