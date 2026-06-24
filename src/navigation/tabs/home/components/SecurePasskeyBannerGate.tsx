import React from 'react';
import {useAppSelector} from '../../../../utils/hooks';
import HomeSection from './HomeSection';
import SecurePasskeyBanner from './SecurePasskeyBanner';

const SecurePasskeyBannerGate = () => {
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const passkeyCredentials = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.passkeyCredentials,
  );

  const shouldShowBanner =
    !!user &&
    !!user.verified &&
    !(passkeyCredentials && passkeyCredentials.length > 0);

  if (!shouldShowBanner) {
    return null;
  }

  return (
    <HomeSection>
      <SecurePasskeyBanner />
    </HomeSection>
  );
};

export default React.memo(SecurePasskeyBannerGate);
