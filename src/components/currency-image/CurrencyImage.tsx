// renders svg if supported currency or cached png if custom token
import React, {ReactElement} from 'react';
import FastImage from 'react-native-fast-image';
import DefaultImage from '../../../assets/img/currencies/default.svg';
import CoinbaseSvg from '../../../assets/img/logos/coinbase.svg';
import ProfileIcon from '../avatar/ProfileIcon';
interface Props {
  img: string | ((props?: any) => ReactElement);
  size?: number;
}
export const CurrencyImage = ({img, size = 40}: Props) => {
  const style = {width: size, height: size};

  if (!img) {
    return <DefaultImage {...style} />;
  }

  if (typeof img === 'string') {
    if (img === 'coinbase') {
      return <CoinbaseSvg width="20" height="20" />;
    } else if (img === 'contact') {
      return <ProfileIcon size={20} />;
    } else {
      return (
        <FastImage
          style={style}
          source={{
            uri: img,
            priority: FastImage.priority.normal,
          }}
          resizeMode={FastImage.resizeMode.contain}
        />
      );
    }
  }

  return img(style);
};
