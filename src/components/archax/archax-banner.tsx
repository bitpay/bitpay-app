import React from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SubText, UnderlineLink} from '../styled/Text';
import {openUrlWithInAppBrowser} from '../../store/app/app.effects';
import {useAppDispatch} from '../../utils/hooks';
import {ArchaxBannerContainer} from '../../components/styled/Containers';

const ArchaxBanner: React.FC<{removeMarginTop?: boolean}> = ({
  removeMarginTop,
}) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  return (
    <ArchaxBannerContainer removeMarginTop={removeMarginTop} inset={insets}>
      <SubText>
        Don't invest unless you're prepared to lose all the money you invest.
        This is a high-risk investment and you should not expect to be protected
        if something goes worng.
        <UnderlineLink
          onPress={() => {
            dispatch(openUrlWithInAppBrowser('http://localhost:8080')); // TODO: Update URL
          }}>
          Take 2 mins to learn more.
        </UnderlineLink>
      </SubText>
    </ArchaxBannerContainer>
  );
};

export default ArchaxBanner;
