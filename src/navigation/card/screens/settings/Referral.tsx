import React, {useEffect, useState} from 'react';
import {Card} from '../../../../store/card/card.models';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {CardEffects} from '../../../../store/card';
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {CardStackParamList} from '../../CardStack';
import LargePresentSvg from '../../../../../assets/img/large-present.svg';
import PresentSvg from '../../assets/settings/icon-referearn.svg';
import styled from 'styled-components/native';
import {
  Air,
  Black,
  Caution25,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {
  ActiveOpacity,
  CopyImgContainer,
  CopyToClipboardContainer,
  Hr,
  ScreenGutter,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {
  CopyToClipboardText,
  H3,
  H6,
  H7,
  Smallest,
} from '../../../../components/styled/Text';
import CopySvg from '../../../../../assets/img/copy.svg';
import CopiedSvg from '../../../../../assets/img/copied-success.svg';
import GhostSvg from '../../../../../assets/img/ghost-straight-face.svg';
import haptic from '../../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-community/clipboard';
import {Share, View} from 'react-native';
import Button from '../../../../components/button/Button';
import {
  CategoryHeading,
  CategoryRow,
} from '../../components/CardSettingsList.styled';
import ReferredUsersSkeleton from '../../components/ReferredUsersSkeleton';
import ReferralCodeSkeleton from '../../components/ReferralCodeSkeleton';
import {BASE_BITPAY_URLS} from '../../../../constants/config';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../../store/analytics/analytics.effects';

export interface ReferralParamList {
  card: Card;
}

const ReferralContainer = styled.SafeAreaView`
  flex: 1;
`;

const ReferralHeroBackgroundColor = styled.View`
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom: 55%;
  background-color: ${({theme: {dark}}) => (dark ? Black : Air)};
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
`;

const ReferralHeroContainer = styled.View`
  padding: 20px ${ScreenGutter};
  height: 300px;
  justify-content: center;
`;

const DescriptionContainer = styled.View`
  padding: 5px ${ScreenGutter} 20px;
  align-items: center;
`;

const Paragraph = styled(H6)`
  text-align: center;
  margin-top: 10px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const CodeContainer = styled.View`
  padding: 20px ${ScreenGutter};
`;

const VerticalSpacing = styled.View`
  margin: 20px 0;
`;

const ReferredUsersContainer = styled.View`
  margin: 0 ${ScreenGutter};
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: flex-end;
`;

const HorizontalSpacing = styled.View`
  margin: 0 10px;
`;

const PromotionTermsContainer = styled.View`
  margin: 40px ${ScreenGutter};
`;

const ZeroReferralsContainer = styled.View`
  margin: 40px 40px 20px;
  justify-content: center;
  align-items: center;
`;

const FailedContainer = styled.View<{noHorizontalMargin?: boolean}>`
  background-color: ${({theme: {dark}}) => (dark ? '#2C0F13' : Caution25)};
  padding: ${ScreenGutter};
  margin: ${({noHorizontalMargin}) =>
    noHorizontalMargin ? `${ScreenGutter} 0` : ScreenGutter};
`;

const Referral = ({}) => {
  const {t} = useTranslation();
  const {
    params: {
      card: {id},
    },
  } = useRoute<RouteProp<CardStackParamList, 'Referral'>>();
  const [copied, setCopied] = useState(false);

  const dispatch = useAppDispatch();
  const network = useAppSelector(({APP}) => APP.network);

  const {givenName} =
    useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]) || {};
  const code = useAppSelector(({CARD}) => CARD.referralCode[id]);
  const referredUsers = useAppSelector(({CARD}) => CARD.referredUsers[id]);

  useEffect(() => {
    dispatch(CardEffects.START_FETCH_REFERRAL_CODE(id));
    dispatch(CardEffects.START_FETCH_REFERRED_USERS(id));
  }, [id]);

  const copyToClipboard = () => {
    haptic('impactLight');
    if (!copied) {
      Clipboard.setString(code);
      setCopied(true);
      dispatch(Analytics.track('Copied Share Referral Code', {}));
    }
  };

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [copied]);

  const onShareReferralCode = async () => {
    try {
      const message =
        t(
          "Hey, checkout BitPay's new card. You can convert crypto to dollars easily. Just get the app, set up a wallet, and order the card using my code .",
          {code},
        ) + `${BASE_BITPAY_URLS[network]}/card?code=${code}&ref=${givenName}`;

      await Share.share({
        message,
      });

      dispatch(Analytics.track('Clicked Share Referral Code', {}));
    } catch (e) {}
  };
  const currentDate = new Date().getTime();

  const getStatus = (status: string, expiration: number) => {
    return status === 'pending' && currentDate >= expiration
      ? t('Expired')
      : status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getInitial = (name: string) => {
    return name?.charAt(0);
  };

  return (
    <ReferralContainer>
      <ScrollView>
        <ReferralHeroContainer>
          <ReferralHeroBackgroundColor />
          <LargePresentSvg height={275} width={275} />
        </ReferralHeroContainer>

        <DescriptionContainer>
          <H3> {t('Refer a friend and get $10')}</H3>
          <Paragraph medium={true}>
            {t(
              "Share the referral code below and we'll load $10 on your card and your friend's card after they sign up and load their first $100.",
            )}
          </Paragraph>
        </DescriptionContainer>

        {code && code !== 'failed' && code !== 'loading' ? (
          <CodeContainer>
            <CopyToClipboardContainer
              onPress={copyToClipboard}
              activeOpacity={ActiveOpacity}>
              <CopyImgContainer>
                {!copied ? <CopySvg width={17} /> : <CopiedSvg width={17} />}
              </CopyImgContainer>
              <CopyToClipboardText numberOfLines={1} ellipsizeMode={'tail'}>
                {code}
              </CopyToClipboardText>
            </CopyToClipboardContainer>

            <VerticalSpacing>
              <Button onPress={onShareReferralCode}>{t('Share')}</Button>
            </VerticalSpacing>
          </CodeContainer>
        ) : code === 'failed' ? (
          <FailedContainer>
            <H7>
              {t(
                'Uh oh, something went wrong retrieving your referral code. Please try again later.',
              )}
            </H7>
          </FailedContainer>
        ) : (
          <CodeContainer>
            <ReferralCodeSkeleton />
          </CodeContainer>
        )}

        <ReferredUsersContainer>
          <CategoryRow>
            <CategoryHeading>{t('My Referrals')}</CategoryHeading>

            <CategoryHeading style={{textAlign: 'right'}}>
              {t('Status')}
            </CategoryHeading>
          </CategoryRow>

          <Hr />

          {typeof referredUsers === 'string' ? (
            <>
              {referredUsers === 'failed' ? (
                <FailedContainer noHorizontalMargin={true}>
                  <H7>
                    {t('Uh oh, something went wrong. Please try again later')}.
                  </H7>
                </FailedContainer>
              ) : null}

              {referredUsers === 'loading' ? <ReferredUsersSkeleton /> : null}
            </>
          ) : (
            <>
              {referredUsers && referredUsers.length ? (
                referredUsers!.map(
                  (
                    {givenName: name, familyName, status, expiration},
                    index,
                  ) => (
                    <View key={index}>
                      <CategoryRow>
                        <SettingTitle>
                          {name} {getInitial(familyName)}.
                        </SettingTitle>

                        {status === 'paid' ? (
                          <View>
                            <Row>
                              <HorizontalSpacing>
                                <PresentSvg />
                              </HorizontalSpacing>

                              <SettingTitle>{t('$10 Earned')}</SettingTitle>
                            </Row>
                          </View>
                        ) : (
                          <SettingTitle style={{textAlign: 'right'}}>
                            {getStatus(status, +expiration)}
                          </SettingTitle>
                        )}
                      </CategoryRow>
                      <Hr />
                    </View>
                  ),
                )
              ) : (
                <ZeroReferralsContainer>
                  <GhostSvg height={50} />
                  <VerticalSpacing>
                    <H6>{t('It looks like you have no referrals')}.</H6>
                    <H6 style={{textAlign: 'center'}}>
                      {' '}
                      {t('Go refer someone')}!
                    </H6>
                  </VerticalSpacing>
                </ZeroReferralsContainer>
              )}
            </>
          )}
        </ReferredUsersContainer>

        <PromotionTermsContainer>
          <Smallest>
            {t(
              'Promotion Terms: BitPay Cardholders may refer others to become new Cardholders. If a referred person acquires a Card and loads at least US$100 within 30 days of signing up for the Card, then BitPay will provide an incentive US$10 Card load to both the referring Cardholder and new Cardholder. The new Cardholder must not previously have signed up for a virtual or physical BitPay Card. The referred person must sign up using the referring Cardholder’s referral code. BitPay reserves the right to modify this promotion or discontinue eligibility for the promotion at any time and in its sole discretion.',
            )}
          </Smallest>
        </PromotionTermsContainer>
      </ScrollView>
    </ReferralContainer>
  );
};

export default Referral;
