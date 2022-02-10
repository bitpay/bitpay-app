import React from 'react';
import {SvgProps} from 'react-native-svg';
import styled from 'styled-components/native';
import EarnCashIcon from '../../../../assets/img/card/icons/intro-earn-cash.svg';
import EnhancedSecurityIcon from '../../../../assets/img/card/icons/intro-enhanced-security.svg';
import FlexibilityIcon from '../../../../assets/img/card/icons/intro-flexibility.svg';
import InstantReloadsIcon from '../../../../assets/img/card/icons/intro-instant-reloads.svg';
import WorldwideIcon from '../../../../assets/img/card/icons/intro-worldwide.svg';
import A from '../../../components/anchor/Anchor';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, Exp, H4} from '../../../components/styled/Text';
import {URL} from '../../../constants';

interface CardHighlight {
  icon: React.FC<SvgProps>;
  title: JSX.Element;
  description: JSX.Element;
}

const Highlight = styled.View`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
`;

const HighlightIconContainer = styled.View`
  flex-shrink: 0;
  padding-right: ${ScreenGutter};
`;

const HighlightContentContainer = styled.View`
  flex-grow: 1;
  flex-shrink: 1;
  padding-bottom: 24px;
`;

const HighlightTitle = styled(H4)`
  margin-bottom: 4px;
`;

const CARD_HIGHLIGHTS: CardHighlight[] = [
  {
    icon: InstantReloadsIcon,
    title: (
      <HighlightTitle>
        Instant reloads
        <Exp i={1} />
      </HighlightTitle>
    ),
    description: (
      <BaseText>
        Reload your balance with no conversion fees. Powered by our{' '}
        <A href={URL.EXCHANGE_RATES}>competitive exchange rates</A>.
      </BaseText>
    ),
  },
  {
    icon: FlexibilityIcon,
    title: <HighlightTitle>Flexibility</HighlightTitle>,
    description: (
      <BaseText>
        View your balance, request a new PIN and reload instantly all within
        the BitPay App.
      </BaseText>
    ),
  },
  {
    icon: EnhancedSecurityIcon,
    title: <HighlightTitle>Enhanced security</HighlightTitle>,
    description: (
      <BaseText>
        Includes EMV chip and options to lock your card and control how you
        spend.
      </BaseText>
    ),
  },
  {
    icon: WorldwideIcon,
    title: <HighlightTitle>Worldwide</HighlightTitle>,
    description: (
      <BaseText>
        Ready to use in millions of locations around the world with contactless
        payment, PIN, Google Pay, Apple Pay, or by simply withdrawing cash from
        any compatible ATM
        <Exp i={2} />.
      </BaseText>
    ),
  },
  {
    icon: EarnCashIcon,
    title: <HighlightTitle>Earn cash</HighlightTitle>,
    description: (
      <BaseText>
        Refer friends and you'll each receive $10 when they load their first
        $100.
      </BaseText>
    ),
  },
];

const CardHighlights = (
  <>
    {CARD_HIGHLIGHTS.map((highlight, idx) => {
      const Icon = highlight.icon;

      return (
        <Highlight key={idx}>
          <HighlightIconContainer>
            <Icon />
          </HighlightIconContainer>

          <HighlightContentContainer>
            {highlight.title}
            {highlight.description}
          </HighlightContentContainer>
        </Highlight>
      );
    })}
  </>
);

export default CardHighlights;
