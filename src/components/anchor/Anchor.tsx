import React from 'react';
import {Linking} from 'react-native';
import {useDispatch} from 'react-redux';
import {AppEffects} from '../../store/app';
import {Link} from '../styled/Text';

interface AnchorProps {
  href?: string;
  download?: boolean;
}

const A: React.FC<AnchorProps> = props => {
  const {href, download, children} = props;
  const dispatch = useDispatch();

  const onPress = async () => {
    if (href) {
      const canHrefBeHandled = await Linking.canOpenURL(href).catch(
        () => false,
      );

      if (download && canHrefBeHandled) {
        Linking.openURL(href);
        return;
      }

      dispatch(AppEffects.openUrlWithInAppBrowser(href));
    }
  };

  return <Link onPress={() => (href ? onPress() : null)}>{children}</Link>;
};

export default A;
