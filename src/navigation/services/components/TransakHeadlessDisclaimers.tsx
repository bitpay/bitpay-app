import React from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';
import {BaseText} from '../../../components/styled/Text';
import {
  Action,
  LightBlack,
  LinkBlue,
  NeutralSlate,
  Slate30,
  SlateDark,
} from '../../../styles/colors';
import {useTheme} from '../../../contexts';
import {useAppDispatch} from '../../../utils/hooks';
import {AppEffects} from '../../../store/app';
import {TransakHeadlessPaymentMethod} from '../../../store/buy-crypto/buy-crypto.models';

const TRANSAK_TERMS_OF_SERVICE_URL = 'https://transak.com/terms-of-service-us';
const TRANSAK_REGULATORY_DISCLOSURES_URL = 'https://transak.com/compliance';
const TRANSAK_PRIVACY_POLICY_URL = 'https://transak.com/privacy-policy';
const TRANSAK_US_PRIVACY_NOTICE_URL = 'https://transak.com/privacy-notice-us';
const TRANSAK_CRYPTO_RISK_SUMMARY_URL =
  'https://transak.com/crypto-risk-summary';
const COINME_LICENSING_URL =
  'https://help.coinme.com/en/articles/9039706-licensing';
const COINME_TERMS_OF_SERVICE_URL =
  'https://help.coinme.com/en/articles/9039676-terms-of-service';
const COINME_PRIVACY_POLICY_URL =
  'https://help.coinme.com/en/articles/9039704-privacy-policy';
const COINME_DISCLOSURES_URL =
  'https://help.coinme.com/en/articles/10535881-disclosures';
const ZEROHASH_USER_AGREEMENT_URL = 'https://www.zerohash.com/transak';
const ZEROHASH_REGULATORY_DISCLOSURES_URL =
  'https://docs.zerohash.com/page/us-licenses-and-disclosures';
const ZEROHASH_PRIVACY_NOTICE_URL =
  'https://docs.zerohash.com/page/privacy-policy';
const ZEROHASH_PRIVACY_EMAIL_URL = 'mailto:privacy@zerohash.com';

const BANNER_TERMS_IDS = ['GB_INVESTMENT_RISK_WARNING'];

// Apple Pay and Google Pay have no confirm button of ours: the first-order
// texts name their own button instead.
const AGREEMENT_ACTION: {[method in TransakHeadlessPaymentMethod]: string} = {
  credit_debit_card: 'By clicking “Agree and Confirm Order,”',
  apple_pay: 'By clicking on the Apple Pay button,',
  google_pay: 'By clicking on the Google Pay button,',
};

export type TransakHeadlessDisclaimerSegment =
  | string
  | {text: string; url: string};

const styles = StyleSheet.create({
  aboveButton: {
    marginBottom: 12,
  },
  banner: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },
});

export const getTransakHeadlessDisclaimerParagraphs = (
  termsId: string,
  paymentMethod: TransakHeadlessPaymentMethod,
): TransakHeadlessDisclaimerSegment[][] => {
  switch (termsId) {
    case 'TRANSAK_TERMS_OF_SERVICE':
      return [
        [
          `${AGREEMENT_ACTION[paymentMethod]} I confirm I have read, understand, and agree to Transak’s `,
          {text: 'Terms of Service', url: TRANSAK_TERMS_OF_SERVICE_URL},
          ', ',
          {
            text: 'Regulatory Disclosures',
            url: TRANSAK_REGULATORY_DISCLOSURES_URL,
          },
          ', ',
          {text: 'Privacy Policy', url: TRANSAK_PRIVACY_POLICY_URL},
          ', and ',
          {text: 'US Privacy Notice', url: TRANSAK_US_PRIVACY_NOTICE_URL},
          '.',
        ],
      ];
    case 'COINME_USER_AGREEMENT':
      return [
        [
          'Your transactions are executed by Coinme Inc. a ',
          {text: 'licensed money transmitter', url: COINME_LICENSING_URL},
          '.',
        ],
        [
          `${AGREEMENT_ACTION[paymentMethod]} I confirm I have read, understand, and agree to Coinme’s `,
          {text: 'Terms of Service', url: COINME_TERMS_OF_SERVICE_URL},
          ', ',
          {text: 'Privacy Policy', url: COINME_PRIVACY_POLICY_URL},
          ', and ',
          {text: 'Disclosures', url: COINME_DISCLOSURES_URL},
          ', and to Transak’s ',
          {text: 'Terms of Service', url: TRANSAK_TERMS_OF_SERVICE_URL},
          ', ',
          {text: 'Privacy Policy', url: TRANSAK_PRIVACY_POLICY_URL},
          ', and ',
          {text: 'US Privacy Notice', url: TRANSAK_US_PRIVACY_NOTICE_URL},
          '.',
        ],
      ];
    case 'US_TERMS_RETURNING':
      return [
        [
          'You cannot cancel or reverse this order once confirmed. Check the destination address; funds sent to a wrong address cannot be recovered.',
        ],
      ];
    case 'ZEROHASH_USER_AGREEMENT':
      return [
        [
          'I have read, understand, and agree to the: (1) ',
          {
            text: 'zerohash and zerohash Liquidity Services User Agreement',
            url: ZEROHASH_USER_AGREEMENT_URL,
          },
          '; (2) ',
          {
            text: 'zerohash Regulatory Disclosures',
            url: ZEROHASH_REGULATORY_DISCLOSURES_URL,
          },
          '; and (3) ',
          {
            text: 'zerohash Privacy Notice',
            url: ZEROHASH_PRIVACY_NOTICE_URL,
          },
          '.',
        ],
        [
          'I further consent to zerohash sharing my data or information with Transak. The data or information shared may include, without limitation, the personal information I provide to zerohash during the application and onboarding process. I understand that I may review how zerohash utilizes or shares my data in the Privacy Notice referenced above, and that I may contact zerohash at ',
          {text: 'privacy@zerohash.com', url: ZEROHASH_PRIVACY_EMAIL_URL},
          ' if I have any questions or wish to amend my consent.',
        ],
        [
          'I also understand that the value of any cryptocurrency, including digital assets pegged to fiat currency, commodities, or any other asset, are not guaranteed and may go to zero at any time and without warning. Orders may not be canceled or reversed once submitted by you. If a withdrawal request is being made, you are requesting an on-chain transaction that is not reversible or recallable. You are responsible for reviewing the recipient address and ensuring it is the correct address for the selected asset for withdrawal. The estimated network fee is an approximation and the actual network fee applied on a withdrawal may differ. Fraudulent transactions may result in the loss of money with no recourse.',
        ],
      ];
    case 'MICA_EEA_BUY':
      return [
        [
          'The exchange rate is an estimate and may change. You may receive more or less crypto. Your order and exchange rate become final when we receive your payment.',
        ],
      ];
    case 'MICA_EEA_SELL':
      return [
        [
          'The exchange rate is an estimate and may change. You may receive more or less money. Your order and exchange rate become final when we receive your crypto.',
        ],
      ];
    case 'GB_INVESTMENT_RISK_WARNING':
      return [
        [
          'Don’t invest unless you’re prepared to lose all the money you invest. This is a high-risk investment and you should not expect to be protected if something goes wrong.',
        ],
        [
          {
            text: 'Take 2 mins to learn more',
            url: TRANSAK_CRYPTO_RISK_SUMMARY_URL,
          },
        ],
      ];
    default:
      return [];
  }
};

interface TransakHeadlessDisclaimersProps {
  termsIds: string[] | undefined;
  paymentMethod: TransakHeadlessPaymentMethod;
  placement: 'banner' | 'aboveButton';
}

const TransakHeadlessDisclaimers = ({
  termsIds,
  paymentMethod,
  placement,
}: TransakHeadlessDisclaimersProps) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const ids = (termsIds ?? []).filter(termsId =>
    placement === 'banner'
      ? BANNER_TERMS_IDS.includes(termsId)
      : !BANNER_TERMS_IDS.includes(termsId),
  );
  if (!ids.length) {
    return null;
  }

  const openLink = (url: string) => {
    if (url.startsWith('mailto:')) {
      Linking.openURL(url);
      return;
    }
    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  const textColor = theme.dark ? Slate30 : SlateDark;
  const linkColor = theme.dark ? LinkBlue : Action;

  return (
    <View
      style={
        placement === 'banner'
          ? [
              styles.banner,
              {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
            ]
          : styles.aboveButton
      }>
      {ids.map(termsId =>
        getTransakHeadlessDisclaimerParagraphs(termsId, paymentMethod).map(
          (paragraph, paragraphIndex) => (
            <BaseText
              key={`${termsId}-${paragraphIndex}`}
              style={[styles.paragraph, {color: textColor}]}>
              {paragraph.map((segment, segmentIndex) =>
                typeof segment === 'string' ? (
                  segment
                ) : (
                  <Text
                    key={segmentIndex}
                    style={{color: linkColor}}
                    onPress={() => openLink(segment.url)}>
                    {segment.text}
                  </Text>
                ),
              )}
            </BaseText>
          ),
        ),
      )}
    </View>
  );
};

export default TransakHeadlessDisclaimers;
