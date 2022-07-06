import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import * as Svg from 'react-native-svg';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import {CardBrand, CardProvider} from '../../../constants/card';
import {CARD_HEIGHT, CARD_WIDTH} from '../../../constants/config.card';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import {White} from '../../../styles/colors';
import {
  getCardCurrencyColorPalette,
  isVirtualDesignSupported,
} from '../../../utils/card';
import {format} from '../../../utils/currency';

interface CardFrontProps {
  brand: CardBrand;
  provider: CardProvider;
  basic?: boolean;
  balance: number;
  nickname: string;
  fiatSymbol: string;
  fiat: string;
  designCurrency: VirtualDesignCurrency;
}

const CardFrontContainer = styled.View`
  position: relative;
`;

const CardBalanceLabelRow = styled(BaseText)`
  color: ${White};
  font-size: 10px;
  font-weight: 500;
  left: 0px;
  padding: 0 20px;
  position: absolute;
  top: 80px;
`;

const CardBalanceValueRow = styled.View`
  align-items: center;
  flex-direction: row;
  height: 39px;
  left: 0px;
  max-width: 100%;
  padding: 0 20px;
  position: absolute;
  top: 94px;
`;

const CardBalance = styled(BaseText)<{balance: number}>`
  color: ${White};
  font-size: ${({balance}) =>
    balance >= 1e9 ? 21 : balance >= 1e8 ? 24 : balance >= 1e6 ? 26 : 28}px;
  font-weight: 500;
  margin-right: 20px;
  flex-shrink: 1;
`;

const BRAND_LOGOS: {[k: string]: JSX.Element} = {
  Mastercard: (
    <Svg.G
      id="mc-logo"
      transform="translate(257.000000, 156.000000)"
      fillRule="nonzero">
      <Svg.Path
        d="M22.8040396,3.06423564 C26.204245,5.78094329 28.1895291,9.93387035 28.1895291,14.3301251 C28.1895291,18.6164735 26.3022684,22.6715085 23.0563931,25.3893793 L22.8041203,25.5949176 L22.7991708,25.5957478 L22.5514985,25.3934607 C19.3032483,22.676818 17.4161268,18.6195933 17.4206066,14.3321152 C17.4172153,9.9360984 19.4023499,5.78261912 22.8040396,3.06844012 L22.7983458,3.06423564 L22.8040396,3.06423564 Z"
        id="Path"
        fill="#FF5F00"
      />
      <Svg.Path
        d="M17.4206226,14.3321152 C17.4172153,9.9360984 19.4023499,5.78261912 22.8040396,3.06844012 C17.0251041,-1.54845201 8.72632085,-0.875961742 3.73985179,4.61330283 C-1.24661727,10.1025674 -1.24661727,18.565643 3.73985179,24.0549076 C8.72632085,29.5441722 17.0251041,30.2166624 22.8040396,25.5997703 C19.4012674,22.8847294 17.4160115,18.7295286 17.4206226,14.3321152 Z"
        id="Path"
        fill="#EB001B"
      />
      <Svg.Path
        d="M44.6516518,23.1525702 L44.6516518,25.5599756 L44.4417261,25.5599756 L44.4417261,23.1525702 L43.9931752,23.1525702 L43.9931752,22.6545046 L45.128832,22.6545046 L45.128832,23.1525702 L44.6516518,23.1525702 Z M46.8561868,22.6545046 L46.8561868,25.5599756 L46.6175966,25.5599756 L46.6175966,23.3601241 L46.2454142,25.2486802 L45.9877495,25.2486802 L45.6155321,23.3601241 L45.6155321,25.5599756 L45.3674222,25.5599756 L45.3674222,22.6545046 L45.7109752,22.6545046 L46.111787,24.7298309 L46.5126338,22.6545046 L46.8561868,22.6545046 Z"
        id="Shape"
        fill="#F79E1B"
      />
      <Svg.Path
        d="M45.6101517,14.3321152 C45.6101517,19.8180345 42.5286528,24.8223182 37.6747034,27.2196276 C32.8207541,29.6169371 27.0464031,28.9863931 22.8040396,25.5957902 C26.204245,22.8793069 28.1895291,18.7263799 28.1895291,14.3301251 C28.1895291,9.93387035 26.204245,5.78094329 22.8040396,3.06446002 C27.0464031,-0.326142909 32.8207541,-0.95668686 37.6747034,1.44062261 C42.5286528,3.83793208 45.6101517,8.84221572 45.6101517,14.3281351 L45.6101517,14.3321152 Z"
        id="Path"
        fill="#F79E1B"
      />
    </Svg.G>
  ),
  Visa: (
    <Svg.Path
      id="visa-logo-front"
      d="M269,164 L264.926051,185 L260,185 L264.074513,164 L269,164 Z M293,176 L296.173655,169 L298,176 L293,176 Z M299.100377,185 L304,185 L299.724666,164 L295.20168,164 C294.185883,164 293.328206,164.606323 292.947016,165.540708 L285,185 L290.561849,185 L291.666571,181.864115 L298.462431,181.864115 L299.100377,185 Z M284.9679,177.719964 C284.991626,172.103829 277.071481,171.794449 277.126629,169.285669 C277.142981,168.522155 277.882669,167.710704 279.499595,167.502874 C280.302767,167.399748 282.51093,167.320589 285.018238,168.455611 L286,163.943592 C284.653684,163.462335 282.920371,163 280.765433,163 C275.234605,163 271.340903,165.892587 271.308199,170.034361 C271.27325,173.097249 274.087079,174.805932 276.208031,175.824582 C278.387658,176.867831 279.120292,177.535787 279.110994,178.468341 C279.096566,179.896974 277.371589,180.52614 275.762679,180.551054 C272.94853,180.594891 271.315894,179.803939 270.014145,179.207256 L269,183.869393 C270.30752,184.460399 272.720564,184.973509 275.224345,185 C281.102412,185 284.948662,182.142734 284.9679,177.719964 L284.9679,177.719964 Z M263,164 L254.035117,185 L248.185339,185 L243.774228,168.240525 C243.506024,167.208096 243.273326,166.830544 242.45825,166.395722 C241.129908,165.687308 238.932912,165.02247 237,164.610058 L237.1322,164 L246.546944,164 C247.746891,164 248.826367,164.784049 249.098693,166.140805 L251.42884,178.29372 L257.186997,164 L263,164 L263,164 Z"
      fill="#FFFFFE"
    />
  ),
};

const CardFront: React.FC<CardFrontProps> = props => {
  const {
    brand,
    provider,
    basic = false,
    balance,
    nickname,
    fiat,
    fiatSymbol,
    designCurrency,
  } = props;

  const [IDS] = useState({
    gradient: 'gradient-' + Math.floor(Math.random() * 10000) + 1,
    path: 'path-' + Math.floor(Math.random() * 10000) + 1,
  });

  const BrandLogo = BRAND_LOGOS[brand] || null;
  const virtualDesignCurrency = isVirtualDesignSupported(provider)
    ? designCurrency
    : 'bitpay-b';
  const {BackgroundShape, ...colorPalette} = getCardCurrencyColorPalette(
    virtualDesignCurrency,
  );

  const formattedBalance = format(balance, fiat);
  const {t} = useTranslation();

  return (
    <CardFrontContainer>
      <Svg.Svg
        style={{borderRadius: 10}}
        height={`${CARD_HEIGHT}px`}
        width={`${CARD_WIDTH}px`}
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}>
        <Svg.Defs>
          <Svg.RadialGradient
            id={IDS.gradient}
            cx="8.80667154%"
            cy="50%"
            fx="8.80667154%"
            fy="50%"
            r="162.896056%"
            gradientTransform="translate(0.088067,0.500000),scale(0.632716,1.000000),rotate(46.470003),translate(-0.088067,-0.500000)">
            <Svg.Stop offset="0%" stopColor={colorPalette.stopColor1} />
            <Svg.Stop offset="100%" stopColor={colorPalette.stopColor2} />
          </Svg.RadialGradient>

          <Svg.Rect
            id={IDS.path}
            data-ref="cardBackgroundColor"
            x="0"
            y="0"
            height={CARD_HEIGHT}
            width={CARD_WIDTH}
            rx="11"
            fill={`url(#${IDS.gradient})`}
          />
        </Svg.Defs>

        <Svg.G
          id="MASTERCARD-Card-Front"
          stroke="none"
          strokeWidth="1"
          fill="none"
          fillRule="evenodd">
          <Svg.G id="Group">
            <Svg.Mask id="mask-3" fill="white">
              <Svg.Use xlinkHref={`#${IDS.path}`} />
            </Svg.Mask>

            <Svg.Use id="Mask" xlinkHref={`#${IDS.path}`} />

            <BackgroundShape />
          </Svg.G>

          <Svg.G
            id="bitpay-logo-front"
            transform={{
              translateX: 5,
              translateY: 4,
              scale: 0.223,
            }}
            fill="#FFFFFF"
            fillRule="nonzero">
            <Svg.Path
              id="y_2_"
              d="M452.3,104.6L432.6,104.6L421.2,152.7L419.6,159.3C418.5,159.6 417.4,159.9 416.3,160.1C414.3,160.5 412.2,160.7 410,160.7C407.5,160.7 405.5,160.3 404,159.6C402.6,158.9 401.5,157.9 400.9,156.5C400.3,155.2 400.1,153.6 400.2,151.8C400.3,150 400.7,148 401.2,146L407.2,121L411.1,104.4L391,104.4L381.9,142.8C380.8,147.4 380.2,151.8 380,156C379.8,160.2 380.5,163.8 381.9,167.1C383.3,170.3 385.8,172.8 389.2,174.7C392.6,176.6 397.5,177.5 403.7,177.5C408,177.5 411.8,177.1 415,176.4C415.1,176.4 415.3,176.3 415.4,176.3C414.5,180.3 412.7,183.5 409.9,186C407,188.5 402.8,189.8 397.2,189.8C394.8,189.8 392.6,189.7 390.6,189.4L386.7,205.7C389.3,206 392.2,206.2 395.4,206.2C401.4,206.2 406.6,205.5 411.1,204.2C415.6,202.8 419.4,200.8 422.7,198C425.9,195.2 428.6,191.7 430.8,187.6C433,183.4 434.7,178.5 436,172.7L449.6,115.5L452.3,104.6Z"
            />
            <Svg.Path
              id="a_2_"
              d="M369.8,145.7C368.6,150.7 368.2,155.8 368.7,160.8C369.2,165.9 371.2,173.6 373.1,177.5L354.1,177.5C351.8,173.6 351.9,171.7 351.4,170.5C348.9,172.5 346.2,174.2 343.2,175.5C340.2,176.8 336.9,177.5 333.1,177.5C328.7,177.5 324.9,176.7 321.8,175.2C318.7,173.7 316.1,171.6 314.1,169C312.1,166.4 310.7,163.4 309.8,159.9C308.9,156.4 308.5,152.7 308.5,148.7C308.5,142.6 309.6,136.9 311.7,131.5C313.9,126.1 316.9,121.4 320.7,117.4C324.5,113.4 333.8,104.5 349,104.5C355.6,104.5 364.4,104.5 379.5,104.5L369.8,145.7ZM355.9,121.2C346.7,121.2 345,121.2 341.2,123.1C338.5,124.5 336.3,126.6 334.4,129C332.5,131.4 330.9,134.2 329.8,137.4C328.7,140.6 328.1,143.9 328.1,147.3C328.1,151.5 328.8,154.9 330.2,157.4C331.6,159.9 334.2,161.1 338,161.1C340,161.1 341.9,160.7 343.5,159.9C345.1,159.1 346.9,157.8 348.7,155.9C348.9,153.7 349.2,151.4 349.6,149C350,146.6 350.5,144.3 350.9,142.3L355.9,121.2"
            />
            <Svg.Path
              id="p_2_"
              d="M303.1,133.5C303.1,140 302,145.9 299.9,151.3C297.8,156.7 294.8,161.3 291,165.2C287.2,169.1 282.7,172.1 277.4,174.3C272.1,176.5 266.4,177.6 260.2,177.6C257.2,177.6 254.2,177.3 251.1,176.8L245.1,200.9L225.4,200.9L248.3,104.7C251.6,104.7 269.2,104.7 274.6,104.7C279.6,104.7 283.9,105.5 287.4,107C291,108.5 293.9,110.6 296.3,113.2C298.6,115.8 300.3,118.9 301.4,122.4C302.6,125.8 303.1,129.5 303.1,133.5ZM254.8,160.8C256.3,161.2 258.2,161.3 260.4,161.3C263.9,161.3 267,160.7 269.9,159.4C272.7,158.1 275.2,156.3 277.2,154C279.2,151.7 280.7,148.9 281.9,145.7C283,142.5 283.6,138.9 283.6,135C283.6,131.2 282.8,127.9 281.1,125.3C279.4,122.6 276.5,121.2 272.3,121.2C269.4,121.2 264.5,121.2 264.5,121.2L254.8,160.8Z"
            />
            <Svg.Path
              id="t_2_"
              d="M213.4,160.8C210.9,160.8 208.9,160.4 207.4,159.7C206,159 204.9,158 204.3,156.6C203.7,155.3 203.5,153.7 203.6,151.9C203.7,150.1 204.1,148.1 204.6,146.1L210.6,121.1L233,121.1L237.1,104.5L214.6,104.5L219.8,83.5L198.8,86.8L185.5,143C184.4,147.6 183.8,152 183.6,156.2C183.4,160.4 184.1,164 185.5,167.3C186.9,170.5 189.4,173 192.8,174.9C196.2,176.8 201.1,177.7 207.3,177.7C211.6,177.7 215.4,177.3 218.6,176.6C218.9,176.5 219.4,176.4 219.7,176.3L223.8,159.2C222.4,159.7 221,160 219.7,160.2C217.7,160.6 215.6,160.8 213.4,160.8Z"
            />
            <Svg.Path
              id="i_bottom_6_"
              d="M163.3,104.6L145.9,177.6L165.6,177.6L182.9,104.6L163.3,104.6Z"
            />
            <Svg.Path
              id="i_top_2_"
              d="M185,96.2L188,83.5L168.3,83.5L165.3,96.2L185,96.2Z"
            />
            <Svg.Path
              id="b_2_"
              d="M119.7,104.7C123.9,104.7 127.6,105.5 130.7,107C133.8,108.5 136.3,110.5 138.4,113.1C140.4,115.7 141.9,118.7 142.9,122.1C143.9,125.5 144.4,129.2 144.4,133.2C144.4,139.3 143.3,145 141,150.5C138.7,155.9 135.7,160.7 131.8,164.7C127.9,168.7 123.3,171.9 118,174.2C112.7,176.5 107,177.7 100.8,177.7C100,177.7 98.6,177.7 96.6,177.6C94.6,177.6 92.3,177.4 89.8,177C87.2,176.6 84.5,176.1 81.7,175.4C78.8,174.7 76.1,173.7 73.6,172.5L96.5,76.3L117,73.1L108.9,107.2C110.7,106.4 112.3,105.8 114.1,105.4C115.8,104.9 117.7,104.7 119.7,104.7ZM102.5,161.3C105.6,161.3 108.5,160.6 111.2,159C113.9,157.5 116.3,155.5 118.3,153C120.3,150.5 121.9,147.6 123,144.5C124.1,141.3 124.7,138 124.7,134.6C124.7,130.4 124,127.1 122.6,124.7C121.2,122.3 118.3,121.2 114.5,121.2C113.3,121.2 112,121.3 110,121.8C108,122.2 106.3,123.2 104.7,124.6L96.1,160.9C98.7,161.3 101.5,161.3 102.5,161.3Z"
            />
          </Svg.G>

          <Svg.Text
            id="card-nickname"
            fontFamily="Heebo"
            fontSize="14"
            fontWeight="400"
            fill="#FFFFFF">
            <Svg.TSpan x="20" y="178">
              {nickname || ''}
            </Svg.TSpan>
          </Svg.Text>

          {!basic && (
            <>
              <Svg.G
                id="menu-icon"
                transform="translate(271.000000, 20.000000)"
                fill="#FFFFFF">
                <Svg.Rect
                  id="Rectangle"
                  opacity="0.1"
                  x="0"
                  y="0"
                  width="33"
                  height="32"
                  rx="5"
                />
                <Svg.G id="Group-5" transform="translate(15.000000, 9.000000)">
                  <Svg.Circle id="Oval" cx="1.5" cy="1.5" r="1.5" />
                  <Svg.Circle id="Oval" cx="1.5" cy="7.5" r="1.5" />
                  <Svg.Circle id="Oval" cx="1.5" cy="13.5" r="1.5" />
                </Svg.G>
              </Svg.G>
            </>
          )}

          {BrandLogo}
        </Svg.G>
      </Svg.Svg>

      {!basic ? (
        <>
          <CardBalanceLabelRow>{t('BALANCE')}</CardBalanceLabelRow>

          <CardBalanceValueRow>
            <CardBalance
              balance={balance}
              numberOfLines={1}
              ellipsizeMode={'tail'}>
              {formattedBalance}
            </CardBalance>

            <Svg.Svg height={30} width={67} viewBox={'0 0 67 30'}>
              <Svg.G data-ref="currencyPill" id="fiat-currency-pill">
                <Svg.Rect
                  id="Rectangle"
                  fill={colorPalette.pillBackground}
                  x="0"
                  y="0"
                  width="67"
                  height="30"
                  rx="15"
                />
                <Svg.Circle
                  id="Oval"
                  fill={colorPalette.pillCircleBackground}
                  opacity="0.1"
                  cx="16"
                  cy="15"
                  r="10"
                />
                <Svg.G
                  id="Group-3"
                  transform="translate(16.000000, 18.000000)"
                  stroke={colorPalette.pillColor}
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <Svg.Text
                    textAnchor="middle"
                    id="fiatSymbol"
                    fontFamily="Heebo"
                    fontSize="11"
                    fontWeight="normal"
                    fill={colorPalette.pillColor}>
                    {fiatSymbol}
                  </Svg.Text>
                </Svg.G>
                <Svg.Text
                  id="fiatName"
                  fontFamily="Heebo"
                  fontSize="11"
                  fontWeight="normal"
                  fill={colorPalette.pillColor}>
                  <Svg.TSpan x="31" y="19">
                    {fiat}
                  </Svg.TSpan>
                </Svg.Text>
              </Svg.G>
            </Svg.Svg>
          </CardBalanceValueRow>
        </>
      ) : null}
    </CardFrontContainer>
  );
};

export default CardFront;
