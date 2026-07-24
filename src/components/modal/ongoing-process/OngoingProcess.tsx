import React, {useMemo, useRef} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {useTheme} from '../../../contexts';
import {LightBlack, SlateDark, White} from '../../../styles/colors';
import {useAppSelector} from '../../../utils/hooks';
import {BlurContainer} from '../../blur/Blur';
import {BaseText} from '../../styled/Text';
import BaseModal from '../base/BaseModal';
import {HEIGHT, WIDTH} from '../../styled/Containers';
import {useOngoingProcessState} from '../../../contexts';

// Get full screen dimensions (includes navigation bar on Android)
const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get(
  Platform.OS === 'android' ? 'screen' : 'window',
);

const styles = StyleSheet.create({
  row: {
    borderRadius: 10,
    flexDirection: 'row',
    padding: 20,
    maxWidth: '60%',
    paddingRight: 47,
  },
  activityIndicatorContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  message: {
    fontWeight: '700',
    flexWrap: 'wrap',
    lineHeight: 22,
  },
  modalWrapper: {
    height: HEIGHT,
    width: WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -20,
  },
});

const OnGoingProcessModalContent: React.FC = React.memo(() => {
  const {message, isVisible} = useOngoingProcessState();
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);
  const theme = useTheme();

  const modalContent = useMemo(
    () => (
      <View
        style={[
          styles.row,
          {backgroundColor: theme.dark ? LightBlack : White},
        ]}>
        <View style={styles.activityIndicatorContainer}>
          <ActivityIndicator color={SlateDark} />
        </View>
        <BaseText style={styles.message}>{message}</BaseText>
        <BlurContainer />
      </View>
    ),
    [message, theme.dark],
  );

  return (
    <BaseModal
      id={'ongoingProcess'}
      deviceHeight={SCREEN_HEIGHT}
      deviceWidth={SCREEN_WIDTH}
      presentationStyle="overFullScreen"
      isVisible={appWasInit && isVisible}
      backdropOpacity={0.4}
      coverScreen={true}
      statusBarTranslucent={true}
      animationIn={'fadeInRight'}
      animationOut={'fadeOutLeft'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}>
      <View style={styles.modalWrapper}>{modalContent}</View>
    </BaseModal>
  );
});

const OnGoingProcessModal: React.FC = React.memo(() => {
  const {isVisible} = useOngoingProcessState();
  const appWasInit = useAppSelector(({APP}) => APP.appWasInit);
  const hasMountedRef = useRef(false);

  if (isVisible && appWasInit) {
    hasMountedRef.current = true;
  }

  return hasMountedRef.current ? <OnGoingProcessModalContent /> : null;
});

export default OnGoingProcessModal;
