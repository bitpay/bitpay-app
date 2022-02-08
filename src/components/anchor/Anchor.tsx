import React from 'react';
import {useDispatch} from 'react-redux';
import {AppEffects} from '../../store/app';
import {Link} from '../styled/Text';

interface AnchorProps {
  href?: string;
}

const A: React.FC<AnchorProps> = props => {
  const {href, children} = props;
  const dispatch = useDispatch();

  const onPress = () => {
    if (href) {
      dispatch(AppEffects.openUrlWithInAppBrowser(href));
    }
  };

  return <Link onPress={() => (href ? onPress() : null)}>{children}</Link>;
};

export default A;
