import React from 'react';
import {Linking} from 'react-native';
import {openUrlWithInAppBrowser} from '../../store/app/app.effects';
import {Link} from '../styled/Text';
import {useAppDispatch} from '../../utils/hooks';

interface AnchorProps {
  href?: string;
  download?: boolean;
}

const A: React.FC<React.PropsWithChildren<AnchorProps>> = props => {
  const {href, download, children} = props;
  const dispatch = useAppDispatch();

  const onPress = async () => {
    if (href) {
      const canHrefBeHandled = await Linking.canOpenURL(href).catch(
        () => false,
      );

      if (download && canHrefBeHandled) {
        Linking.openURL(href);
        return;
      }

      dispatch(openUrlWithInAppBrowser(href));
    }
  };

  return <Link onPress={() => (href ? onPress() : null)}>{children}</Link>;
};

export default A;
