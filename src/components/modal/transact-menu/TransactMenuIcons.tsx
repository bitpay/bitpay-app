import React from 'react';
import * as Svg from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {Action, LinkBlue, White} from '../../../styles/colors';
import {changeOpacity} from '../../../utils/helper-methods';
import {BitPayTheme} from '../../../themes/bitpay';

const getIconStateColor = (color: string, disabled: boolean) =>
  disabled ? changeOpacity(color, 0.5) : color;

const BuyCrypto = ({disabled = false}) => {
  return (
    <Svg.Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Svg.Circle
        cx="20"
        cy="20"
        r="20"
        fill={getIconStateColor(Action, disabled)}
      />
      <Svg.Path
        d="M8 18V10H0V8H8V0H10V8H18V10H10V18H8Z"
        fill={getIconStateColor(White, disabled)}
        transform="translate(11 11)"
      />
    </Svg.Svg>
  );
};

const SellCrypto = ({disabled = false}) => {
  return (
    <Svg.Svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <Svg.Rect
        width="44"
        height="44"
        rx="11"
        fill={getIconStateColor(Action, disabled)}
      />
      <Svg.Path
        fill={getIconStateColor(White, disabled)}
        d="M0 2V0H14V2H0Z"
        transform="translate(15 21)"
      />
    </Svg.Svg>
  );
};

const BuyGiftCard = ({disabled = false}) => {
  return (
    <Svg.Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Svg.Circle
        cx="20"
        cy="20"
        r="20"
        fill={getIconStateColor(Action, disabled)}
      />
      <Svg.G transform="translate(10.3 10.3)">
        <Svg.Path
          fill={getIconStateColor(White, disabled)}
          d="M2 13.7888V15.6925C2 15.7695 2.03208 15.84 2.09625 15.904C2.16025 15.9682 2.23075 16.0003 2.30775 16.0003H17.6923C17.7693 16.0003 17.8398 15.9682 17.9038 15.904C17.9679 15.84 18 15.7695 18 15.6925V13.7888H2ZM2.30775 3.51953H5.075C4.99167 3.36953 4.9295 3.2112 4.8885 3.04453C4.8475 2.87786 4.827 2.70286 4.827 2.51953C4.827 1.82086 5.069 1.22953 5.553 0.745531C6.037 0.261531 6.62833 0.0195312 7.327 0.0195312C7.74017 0.0195312 8.13392 0.128448 8.49025 0.340281C8.84058 0.564115 9.1575 0.834097 9.423 1.15803L9.98075 1.90428L10.5385 1.15803C10.7937 0.822197 11.1025 0.548448 11.405 0.336781C11.8277 0.125281 12.2182 0.0195312 12.6367 0.0195312C13.3341 0.0195312 13.9247 0.261531 14.4085 0.745531C14.8925 1.22953 15.1345 1.82086 15.1345 2.51953C15.1345 2.70286 15.1156 2.87786 15.0778 3.04453C15.0399 3.2112 14.9762 3.36953 14.8865 3.51953H17.6923C18.1974 3.51953 18.625 3.69453 18.975 4.04453C19.325 4.39453 19.5 4.82211 19.5 5.32728V15.6925C19.5 16.1977 19.325 16.6253 18.975 16.9753C18.625 17.3253 18.1974 17.5003 17.6923 17.5003H2.30775C1.80258 17.5003 1.375 17.3253 1.025 16.9753C0.675 16.6253 0.5 16.1977 0.5 15.6925V5.32728C0.5 4.82211 0.675 4.39453 1.025 4.04453C1.375 3.69453 1.80258 3.51953 2.30775 3.51953ZM2 11.2118H18V5.32728C18 5.25028 17.9679 5.17978 17.9038 5.11578C17.8398 5.05161 17.7693 5.01953 17.6923 5.01953H12.2268L14.2693 7.81178L13.073 8.67328L9.98075 4.47728L6.8885 8.67328L5.69225 7.81178L7.704 5.01953H2.30775C2.23075 5.01953 2.16025 5.05161 2.09625 5.11578C2.03208 5.17978 2 5.25028 2 5.32728V11.2118ZM7.327 3.51953C7.61033 3.51953 7.84783 3.4237 8.0395 3.23203C8.23117 3.04036 8.327 2.80286 8.327 2.51953C8.327 2.2362 8.23117 1.9987 8.0395 1.80703C7.84783 1.61536 7.61033 1.51953 7.327 1.51953C7.04367 1.51953 6.80617 1.61536 6.6145 1.80703C6.42283 1.9987 6.327 2.2362 6.327 2.51953C6.327 2.80286 6.42283 3.04036 6.6145 3.23203C6.80617 3.4237 7.04367 3.51953 7.327 3.51953ZM12.6345 3.51953C12.9178 3.51953 13.1553 3.4237 13.347 3.23203C13.5387 3.04036 13.6345 2.80286 13.6345 2.51953C13.6345 2.2362 13.5387 1.9987 13.347 1.80703C13.1553 1.61536 12.9178 1.51953 12.6345 1.51953C12.3512 1.51953 12.1137 1.61536 11.922 1.80703C11.7303 1.9987 11.6345 2.2362 11.6345 2.51953C11.6345 2.80286 11.7303 3.04036 11.922 3.23203C12.1137 3.4237 12.3512 3.51953 12.6345 3.51953Z"
        />
      </Svg.G>
    </Svg.Svg>
  );
};

const Close = () => {
  return (
    <Svg.Svg width="37" height="37" viewBox="0 0 37 37" fill="none">
      <Svg.Rect
        width="36.2319"
        height="36.2319"
        rx="18.1159"
        fill={getIconStateColor(Action, false)}
      />
      <Svg.Path
        fill={getIconStateColor(White, false)}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.9919 11.7109L24.5209 23.2399L23.2399 24.5208L11.711 12.9919L12.9919 11.7109Z"
      />
      <Svg.Path
        fill={getIconStateColor(White, false)}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.7109 23.2397L23.2399 11.7108L24.5208 12.9918L12.9919 24.5207L11.7109 23.2397Z"
      />
    </Svg.Svg>
  );
};

const Exchange = ({disabled = false}) => {
  return (
    <Svg.Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Svg.Circle
        cx="20"
        cy="20"
        r="20"
        fill={getIconStateColor(Action, disabled)}
      />
      <Svg.Path
        fill={getIconStateColor(White, disabled)}
        d="M11.05 16C8.81667 16 6.91667 15.225 5.35 13.675C3.78333 12.125 3 10.2333 3 8V7.825L1.4 9.425L0 8.025L4 4.025L8 8.025L6.6 9.425L5 7.825V8C5 9.66667 5.5875 11.0833 6.7625 12.25C7.9375 13.4167 9.36667 14 11.05 14C11.4833 14 11.9083 13.95 12.325 13.85C12.7417 13.75 13.15 13.6 13.55 13.4L15.05 14.9C14.4167 15.2667 13.7667 15.5417 13.1 15.725C12.4333 15.9083 11.75 16 11.05 16ZM18 11.975L14 7.975L15.4 6.575L17 8.175V8C17 6.33333 16.4125 4.91667 15.2375 3.75C14.0625 2.58333 12.6333 2 10.95 2C10.5167 2 10.0917 2.05 9.675 2.15C9.25833 2.25 8.85 2.4 8.45 2.6L6.95 1.1C7.58333 0.733333 8.23333 0.458333 8.9 0.275C9.56667 0.0916667 10.25 0 10.95 0C13.1833 0 15.0833 0.775 16.65 2.325C18.2167 3.875 19 5.76667 19 8V8.175L20.6 6.575L22 7.975L18 11.975Z"
        transform="translate(9 12)"
      />
    </Svg.Svg>
  );
};

const Receive = ({disabled = false}) => {
  return (
    <Svg.Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Svg.Circle
        cx="20"
        cy="20"
        r="20"
        fill={getIconStateColor(Action, disabled)}
      />
      <Svg.Path
        fill={getIconStateColor(White, disabled)}
        d="M9.24506 10.6595L0.636039 2.05048L2.05025 0.636271L10.6593 9.2453L10.6593 1.3257L12.6569 1.34338V12.6571H1.34315L1.32547 10.6595L9.24506 10.6595Z"
        transform="translate(13.5 13.5)"
      />
    </Svg.Svg>
  );
};

const Scan = () => {
  const theme = useTheme() as BitPayTheme;

  return (
    <Svg.Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Svg.G transform="translate(10 10)">
        <Svg.Path
          d="M0.5 5.01925V0.5H5.01925V2H2V5.01925H0.5ZM0.5 19.5V14.9808H2V18H5.01925V19.5H0.5ZM14.9808 19.5V18H18V14.9808H19.5V19.5H14.9808ZM18 5.01925V2H14.9808V0.5H19.5V5.01925H18ZM15.2212 15.2212H16.577V16.577H15.2212V15.2212ZM15.2212 12.5095H16.577V13.8652H15.2212V12.5095ZM13.8652 13.8652H15.2212V15.2212H13.8652V13.8652ZM12.5095 15.2212H13.8652V16.577H12.5095V15.2212ZM11.1538 13.8652H12.5095V15.2212H11.1538V13.8652ZM13.8652 11.1538H15.2212V12.5095H13.8652V11.1538ZM12.5095 12.5095H13.8652V13.8652H12.5095V12.5095ZM11.1538 11.1538H12.5095V12.5095H11.1538V11.1538ZM16.577 3.423V8.84625H11.1538V3.423H16.577ZM8.84625 11.1538V16.577H3.423V11.1538H8.84625ZM8.84625 3.423V8.84625H3.423V3.423H8.84625ZM7.65375 15.3845V12.3463H4.6155V15.3845H7.65375ZM7.65375 7.65375V4.6155H4.6155V7.65375H7.65375ZM15.3845 7.65375V4.6155H12.3462V7.65375H15.3845Z"
          fill={getIconStateColor(theme.dark ? LinkBlue : Action, false)}
        />
      </Svg.G>
    </Svg.Svg>
  );
};

const Send = ({disabled = false}) => {
  return (
    <Svg.Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <Svg.Circle
        cx="20"
        cy="20"
        r="20"
        fill={getIconStateColor(Action, disabled)}
      />
      <Svg.Path
        fill={getIconStateColor(White, disabled)}
        d="M10.6593 3.75494L2.05024 12.364L0.636027 10.9497L9.24505 2.34072L1.3254 2.34072L1.34313 0.34314H12.6568V11.6569L10.6593 11.6745L10.6593 3.75494Z"
        transform="translate(13.5 13.5)"
      />
    </Svg.Svg>
  );
};

export default {
  BuyCrypto,
  SellCrypto,
  BuyGiftCard,
  Close,
  Exchange,
  Receive,
  Scan,
  Send,
};
