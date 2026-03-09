import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import * as Svg from 'react-native-svg';
import {HeaderButtonContainer} from './Styled';
import {
  Action,
  LightBlue,
  LinkBlue,
  Midnight,
  NeutralSlate,
} from '../../../../styles/colors';
import {useTheme} from 'styled-components/native';
import {useAppDispatch} from '../../../../utils/hooks';
import {Analytics} from '../../../../store/analytics/analytics.effects';

const ScanIcon = () => {
  const theme = useTheme();
  const background = theme.dark ? Midnight : LightBlue;
  const fill = theme.dark ? LinkBlue : Action;

  return (
    <Svg.Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Svg.Circle cx="20" cy="20" r="20" fill={background} />
      <Svg.Path
        d="M2.5 7.01925V2.5H7.01925V4H4V7.01925H2.5ZM2.5 21.5V16.9808H4V20H7.01925V21.5H2.5ZM16.9808 21.5V20H20V16.9808H21.5V21.5H16.9808ZM20 7.01925V4H16.9808V2.5H21.5V7.01925H20ZM17.2212 17.2212H18.577V18.577H17.2212V17.2212ZM17.2212 14.5095H18.577V15.8652H17.2212V14.5095ZM15.8652 15.8652H17.2212V17.2212H15.8652V15.8652ZM14.5095 17.2212H15.8652V18.577H14.5095V17.2212ZM13.1538 15.8652H14.5095V17.2212H13.1538V15.8652ZM15.8652 13.1538H17.2212V14.5095H15.8652V13.1538ZM14.5095 14.5095H15.8652V15.8652H14.5095V14.5095ZM13.1538 13.1538H14.5095V14.5095H13.1538V13.1538ZM18.577 5.423V10.8462H13.1538V5.423H18.577ZM10.8463 13.1538V18.577H5.423V13.1538H10.8463ZM10.8463 5.423V10.8462H5.423V5.423H10.8463ZM9.65375 17.3845V14.3463H6.6155V17.3845H9.65375ZM9.65375 9.65375V6.6155H6.6155V9.65375H9.65375ZM17.3845 9.65375V6.6155H14.3462V9.65375H17.3845Z"
        fill={fill}
        transform="translate(8 8)"
      />
    </Svg.Svg>
  );
};

const ScanButton: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  return (
    <HeaderButtonContainer>
      <TouchableOpacity
        onPress={() => {
          dispatch(
            Analytics.track('Open Scanner', {
              context: 'HeaderScanButton',
            }),
          );
          navigation.navigate('ScanRoot');
        }}>
        <ScanIcon />
      </TouchableOpacity>
    </HeaderButtonContainer>
  );
};

export default ScanButton;
