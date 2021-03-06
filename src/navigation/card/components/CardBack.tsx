import React from 'react';
import * as Svg from 'react-native-svg';
import styled from 'styled-components/native';
import {CardBrand} from '../../../constants/card';
import {CARD_HEIGHT, CARD_WIDTH} from '../../../constants/config.card';
import {Card} from '../../../store/card/card.models';

interface CardBackProps {
  card: Card;
}

const CardBackContainer = styled.View`
  position: relative;
`;

// SVG can't truncate dynamic text, so we overlay a Text element on top of the SVG
const TruncatedNickname = styled.Text`
  color: #ffffff;
  font-size: 16.8px;
  font-weight: 700;
  left: 19.6450617px;
  max-width: 180px;
  position: absolute;
  top: 173.65px;
`;

const BRAND_LOGOS: {[k: string]: JSX.Element} = {
  Mastercard: (
    <Svg.G
      id="mc-logo"
      transform="translate(263.000000, 22.000000)"
      fillRule="nonzero">
      <Svg.Path
        id="Path"
        fill="#FF5F00"
        d="M22.8040396,3.06423564 C26.204245,5.78094329 28.1895291,9.93387035 28.1895291,14.3301251 C28.1895291,18.6164735 26.3022684,22.6715085 23.0563931,25.3893793 L22.8041203,25.5949176 L22.7991708,25.5957478 L22.5514985,25.3934607 C19.3032483,22.676818 17.4161268,18.6195933 17.4206066,14.3321152 C17.4172153,9.9360984 19.4023499,5.78261912 22.8040396,3.06844012 L22.7983458,3.06423564 L22.8040396,3.06423564 Z"
      />
      <Svg.Path
        id="Path"
        fill="#EB001B"
        d="M17.4206226,14.3321152 C17.4172153,9.9360984 19.4023499,5.78261912 22.8040396,3.06844012 C17.0251041,-1.54845201 8.72632085,-0.875961742 3.73985179,4.61330283 C-1.24661727,10.1025674 -1.24661727,18.565643 3.73985179,24.0549076 C8.72632085,29.5441722 17.0251041,30.2166624 22.8040396,25.5997703 C19.4012674,22.8847294 17.4160115,18.7295286 17.4206226,14.3321152 Z"
      />
      <Svg.Path
        id="Shape"
        fill="#F79E1B"
        d="M44.6516518,23.1525702 L44.6516518,25.5599756 L44.4417261,25.5599756 L44.4417261,23.1525702 L43.9931752,23.1525702 L43.9931752,22.6545046 L45.128832,22.6545046 L45.128832,23.1525702 L44.6516518,23.1525702 Z M46.8561868,22.6545046 L46.8561868,25.5599756 L46.6175966,25.5599756 L46.6175966,23.3601241 L46.2454142,25.2486802 L45.9877495,25.2486802 L45.6155321,23.3601241 L45.6155321,25.5599756 L45.3674222,25.5599756 L45.3674222,22.6545046 L45.7109752,22.6545046 L46.111787,24.7298309 L46.5126338,22.6545046 L46.8561868,22.6545046 Z"
      />
      <Svg.Path
        id="Path"
        fill="#F79E1B"
        d="M45.6101517,14.3321152 C45.6101517,19.8180345 42.5286528,24.8223182 37.6747034,27.2196276 C32.8207541,29.6169371 27.0464031,28.9863931 22.8040396,25.5957902 C26.204245,22.8793069 28.1895291,18.7263799 28.1895291,14.3301251 C28.1895291,9.93387035 26.204245,5.78094329 22.8040396,3.06446002 C27.0464031,-0.326142909 32.8207541,-0.95668686 37.6747034,1.44062261 C42.5286528,3.83793208 45.6101517,8.84221572 45.6101517,14.3281351 L45.6101517,14.3321152 Z"
      />
    </Svg.G>
  ),
  Visa: (
    <Svg.Path
      id="visa-logo"
      d="M285.606702,27.6803351 L281.996192,45.2279541 L277.630511,45.2279541 L281.241522,27.6803351 L285.606702,27.6803351 Z M304.749559,38.8470018 L307.280927,32.4660494 L308.737654,38.8470018 L304.749559,38.8470018 Z M310.207269,45.2279541 L314.320988,45.2279541 L310.731422,27.6803351 L306.933927,27.6803351 C306.081065,27.6803351 305.36096,28.1869791 305.040914,28.9677518 L298.368607,45.2279541 L303.03833,45.2279541 L303.965853,42.6076061 L309.67165,42.6076061 L310.207269,45.2279541 Z M298.343003,39.1573184 C298.361927,34.4741664 292.044669,34.2161828 292.088656,32.1241751 C292.101699,31.4874999 292.691688,30.8108518 293.981379,30.6375478 C294.622004,30.5515533 296.383277,30.4855452 298.383154,31.4320111 L299.166226,27.6695529 C298.092379,27.2682451 296.709855,26.882716 294.991035,26.882716 C290.579542,26.882716 287.47385,29.2947707 287.447765,32.7484902 C287.41989,35.3025542 289.664253,36.7273811 291.355965,37.5768072 C293.094477,38.4467458 293.67884,39.003738 293.671423,39.7813705 C293.659915,40.972671 292.28404,41.4973166 291.000743,41.518092 C288.756125,41.5546462 287.453903,40.8950918 286.415604,40.3975332 L285.606702,44.28517 C286.649605,44.777995 288.574294,45.2058638 290.571358,45.2279541 C295.259816,45.2279541 298.327658,42.8453532 298.343003,39.1573184 L298.343003,39.1573184 Z M280.023369,27.6803351 L272.597785,45.2279541 L267.752434,45.2279541 L264.098725,31.2237219 C263.876572,30.3610227 263.683829,30.0455406 263.008705,29.682203 C261.908443,29.0902514 260.088679,28.5347116 258.487654,28.1901001 L258.597155,27.6803351 L266.395357,27.6803351 C267.389268,27.6803351 268.283395,28.3354871 268.508962,29.469194 L270.439015,39.6241806 L275.208477,27.6803351 L280.023369,27.6803351 L280.023369,27.6803351 Z"
      fill="#FFFFFE"
    />
  ),
};

const CardBack: React.FC<CardBackProps> = props => {
  const {card} = props;
  const BrandLogo = BRAND_LOGOS[card.brand || CardBrand.Visa] || null;

  return (
    <CardBackContainer>
      <Svg.Svg
        width={`${CARD_WIDTH}px`}
        height={`${CARD_HEIGHT}px`}
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
        style={{borderRadius: 10}}>
        <Svg.G
          id="MASTERCARD-back"
          stroke="none"
          strokeWidth="1"
          fill="none"
          fillRule="evenodd">
          <Svg.Rect
            id="Rectangle"
            fill="#012351"
            x="0"
            y="0"
            rx="10"
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
          />

          <Svg.Text
            id="CARD-NUMBER-LABEL"
            fontFamily="Heebo"
            fontSize="9"
            fontWeight="700"
            data-lineSpacing="10.3395062"
            fill="#96A8EF">
            <Svg.TSpan x="20.6790123" y="95.7839506">
              CARD NUMBER
            </Svg.TSpan>
          </Svg.Text>

          <Svg.Text
            id="card-number"
            fill="#FFFFFF"
            fontFamily="Heebo"
            fontSize="26"
            fontWeight="700">
            <Svg.TSpan x="19.6450617" y="128.29321">
              {`**** **** **** ${card.lastFourDigits || '****'}`}
            </Svg.TSpan>
          </Svg.Text>

          <Svg.Text
            id="CARD-HOLDER-LABEL"
            fontFamily="Heebo"
            fontSize="9"
            fontWeight="700"
            data-lineSpacing="10.3395062"
            fill="#96A8EF">
            <Svg.TSpan x="20.6790123" y="170.228395">
              CARD HOLDER
            </Svg.TSpan>
          </Svg.Text>

          {/* <Svg.Text
            id="nickname"
            fontFamily="Heebo"
            fontSize="17"
            fontWeight="700"
            data-lineSpacing="16.5432099"
            fill="#FFFFFF">
            <Svg.TSpan x="19.6450617" y="191.737654">
              {card.nickname || ''}
            </Svg.TSpan>
          </Svg.Text> */}

          <Svg.Text
            id="CVV-LABEL"
            fontFamily="Heebo"
            fontSize="9"
            fontWeight="700"
            data-lineSpacing="10.3395062"
            fill="#96A8EF">
            <Svg.TSpan x="286.404321" y="170.228395">
              CVV
            </Svg.TSpan>
          </Svg.Text>

          <Svg.Text
            id="cvv"
            fontFamily="Heebo"
            fontSize="17"
            fontWeight="700"
            data-lineSpacing="16.5432099"
            fill="#FFFFFF">
            <Svg.TSpan x="286.404321" y="191.737654">
              {'***'}
            </Svg.TSpan>
          </Svg.Text>

          <Svg.Text
            id="EXPIRATION-LABEL"
            fontFamily="Heebo"
            fontSize="9"
            fontWeight="700"
            data-lineSpacing="10.3395062"
            fill="#96A8EF">
            <Svg.TSpan x="214.027778" y="170.228395">
              EXPIRES
            </Svg.TSpan>
          </Svg.Text>

          <Svg.Text
            id="expiration"
            fontFamily="Heebo"
            fontSize="17"
            fontWeight="700"
            data-lineSpacing="16.5432099"
            fill="#FFFFFF">
            <Svg.TSpan x="214.027778" y="191.737654">
              {'**/**'}
            </Svg.TSpan>
          </Svg.Text>

          <Svg.G
            id="bitpay-logo"
            transform="translate(20.679012, 20.679012)"
            fill="#FFFFFF"
            fillRule="nonzero">
            <Svg.Path
              id="y_2_"
              d="M85.8179012,7.28234374 L81.3123716,7.28234374 L78.7051108,18.0301487 L78.3391795,19.5048995 C78.0876017,19.5719336 77.8360239,19.6389677 77.5844461,19.6836571 C77.1270319,19.773036 76.6467471,19.8177254 76.1435915,19.8177254 C75.5718237,19.8177254 75.1144096,19.7283466 74.7713489,19.5719336 C74.451159,19.4155206 74.1995812,19.1920735 74.062357,18.8792476 C73.9251327,18.5887664 73.8793913,18.2312511 73.902262,17.8290463 C73.9251327,17.4268415 74.0166156,16.9799474 74.1309691,16.5330532 L75.5032116,10.946876 L76.3951693,7.23765432 L71.7981568,7.23765432 L69.7169223,15.8180225 C69.4653445,16.8458791 69.3281203,17.8290463 69.2823789,18.7675241 C69.2366374,19.7060018 69.3967324,20.5104114 69.7169223,21.2477868 C70.0371123,21.9628174 70.60888,22.5214352 71.3864841,22.9459846 C72.1640882,23.3705341 73.2847529,23.5716365 74.7027368,23.5716365 C75.6861773,23.5716365 76.5552642,23.4822576 77.2871269,23.3258447 C77.3099976,23.3258447 77.355739,23.3035 77.3786097,23.3035 C77.1727734,24.1972883 76.7611006,24.912319 76.1207208,25.4709367 C75.4574702,26.0295544 74.4969004,26.3200357 73.2161408,26.3200357 C72.6672437,26.3200357 72.1640882,26.2976909 71.706674,26.2306568 L70.8147163,29.8728444 C71.4093548,29.9398785 72.0726053,29.9845679 72.804468,29.9845679 C74.1767105,29.9845679 75.3659874,29.8281549 76.3951693,29.5376737 C77.4243512,29.2248478 78.2934381,28.7779536 79.0481715,28.1523018 C79.7800341,27.5266499 80.3975433,26.7445851 80.9006989,25.8284521 C81.4038545,24.8899743 81.7926565,23.7950836 82.0899757,22.4990904 L85.2003921,9.717917 L85.8179012,7.28234374 Z"
            />
            <Svg.Path
              id="a_2_"
              d="M68.0485133,16.57437 C67.7689098,17.7074666 67.6757086,18.8632251 67.7922101,19.9963217 C67.9087115,21.1520802 68.3747174,22.8970489 68.8174231,23.7808642 L64.3903669,23.7808642 C63.8544601,22.8970489 63.8777604,22.4664722 63.7612589,22.194529 C63.1787515,22.6477676 62.5496435,23.0330205 61.8506347,23.3276256 C61.1516258,23.6222307 60.382716,23.7808642 59.4973048,23.7808642 C58.4720918,23.7808642 57.5866806,23.5995687 56.8643714,23.2596398 C56.1420623,22.9197108 55.5362546,22.4438102 55.0702487,21.8546 C54.6042427,21.2653898 54.2780386,20.5855319 54.0683359,19.7923643 C53.8586333,18.9991967 53.7654321,18.1607052 53.7654321,17.254228 C53.7654321,15.8718502 54.0217354,14.5801201 54.5110416,13.3563758 C55.0236481,12.1326315 55.7226569,11.0675207 56.6080682,10.1610435 C57.4934794,9.25456621 59.6604069,7.23765432 63.2020518,7.23765432 C64.7398713,7.23765432 66.7902973,7.23765432 70.308642,7.23765432 L68.0485133,16.57437 Z M64.8097722,11.0221969 C62.666145,11.0221969 62.27004,11.0221969 61.3846288,11.4527735 C60.7555208,11.7700406 60.2429143,12.2459411 59.8002087,12.7898275 C59.357503,13.3337139 58.9846983,13.9682479 58.7283951,14.6934297 C58.4720918,15.4186115 58.33229,16.1664553 58.33229,16.9369609 C58.33229,17.888762 58.4953921,18.6592677 58.8215962,19.225816 C59.1478004,19.7923643 59.7536081,20.0643075 60.6390193,20.0643075 C61.1050252,20.0643075 61.5477308,19.9736597 61.9205356,19.7923643 C62.2933403,19.6110688 62.7127456,19.3164637 63.1321509,18.885887 C63.1787515,18.3873245 63.2486524,17.8661001 63.3418536,17.3222138 C63.4350548,16.7783274 63.5515563,16.257103 63.6447574,15.8038644 L64.8097722,11.0221969 L64.8097722,11.0221969 Z"
            />
            <Svg.Path
              id="p_2_"
              d="M52.7314815,13.7380008 C52.7314815,15.2050929 52.4826414,16.5367611 52.007583,17.7555761 C51.5325246,18.9743911 50.8538697,20.0126408 49.9942403,20.8928961 C49.1346108,21.7731514 48.1166285,22.4502708 46.9176716,22.946825 C45.7187147,23.4433793 44.4292705,23.6916564 43.0267172,23.6916564 C42.3480623,23.6916564 41.6694075,23.6239445 40.9681308,23.5110912 L39.6108211,28.9506173 L35.154321,28.9506173 L40.3347196,7.23765432 C41.08124,7.23765432 45.0626817,7.23765432 46.2842605,7.23765432 C47.4153519,7.23765432 48.3880905,7.4182195 49.1798545,7.75677922 C49.9942403,8.09533893 50.6502733,8.56932253 51.1931972,9.15615936 C51.7134992,9.7429962 52.0980703,10.4426863 52.3469104,11.2326589 C52.6183723,12.000061 52.7314815,12.8351749 52.7314815,13.7380008 Z M41.8051385,19.8997876 C42.1444659,19.9900702 42.5742806,20.0126408 43.0719608,20.0126408 C43.8637248,20.0126408 44.5650015,19.877217 45.2210345,19.5837985 C45.8544457,19.2903801 46.4199914,18.8841085 46.872428,18.3649836 C47.3248645,17.8458587 47.664192,17.2138805 47.9356539,16.4916198 C48.184494,15.7693591 48.320225,14.9568158 48.320225,14.0765605 C48.320225,13.2188759 48.1392504,12.4740446 47.7546793,11.8872077 C47.3701082,11.2778002 46.7140752,10.9618112 45.7639584,10.9618112 C45.1079254,10.9618112 43.9994558,10.9618112 43.9994558,10.9618112 L41.8051385,19.8997876 Z"
            />
            <Svg.Path
              id="t_2_"
              d="M31.7293078,19.8854388 C31.1498864,19.8854388 30.6863493,19.7932394 30.3386965,19.6318904 C30.0142206,19.4705414 29.7592752,19.2400429 29.620214,18.9173449 C29.4811529,18.6176968 29.4347992,18.2488991 29.4579761,17.8340017 C29.4811529,17.4191043 29.5738603,16.9581073 29.6897446,16.4971102 L31.0803559,10.7346465 L36.2719712,10.7346465 L37.2222222,6.90837068 L32.00743,6.90837068 L33.2126264,2.06790123 L28.3454871,2.82854643 L25.2629655,15.7825647 C25.0080201,16.842858 24.8689589,17.8570516 24.8226052,18.8251455 C24.7762515,19.7932394 24.9384895,20.6230341 25.2629655,21.3836793 C25.5874414,22.1212747 26.1668628,22.697521 26.9548758,23.1354683 C27.7428889,23.5734155 28.8785547,23.7808642 30.3155197,23.7808642 C31.3121244,23.7808642 32.1928449,23.6886648 32.9345042,23.5273158 C33.0040348,23.5042659 33.119919,23.4812161 33.1894496,23.4581662 L34.1397006,19.5166411 C33.8152247,19.6318904 33.4907487,19.7010399 33.1894496,19.7471397 C32.7259125,19.8393391 32.2391986,19.8854388 31.7293078,19.8854388 Z"
            />
            <Svg.Polygon
              id="i_bottom_6_"
              points="20.4330998 7.23765432 16.5432099 23.7808642 20.9472806 23.7808642 24.8148148 7.23765432"
            />
            <Svg.Polygon
              id="i_top_2_"
              points="25.1655382 5.16975309 25.8487654 2.06790123 21.3622396 2.06790123 20.6790123 5.16975309"
            />
            <Svg.Path
              id="b_2_"
              d="M10.7717793,7.18427637 C11.7531562,7.18427637 12.6177024,7.36615679 13.342052,7.70718256 C14.0664016,8.04820834 14.6505545,8.50290938 15.1412429,9.09402073 C15.6085653,9.68513207 15.959057,10.3671836 16.1927181,11.1401754 C16.4263793,11.9131672 16.5432099,12.7543641 16.5432099,13.6637661 C16.5432099,15.0506043 16.2861826,16.3465023 15.7487619,17.5969301 C15.2113413,18.8246229 14.5103578,19.9159054 13.5990793,20.8253075 C12.6878008,21.7347095 11.6129595,22.4622312 10.3745553,22.9851374 C9.13615122,23.5080436 7.80428263,23.7808642 6.35558346,23.7808642 C6.16865453,23.7808642 5.84152891,23.7808642 5.3742066,23.7581291 C4.90688429,23.7581291 4.36946363,23.712659 3.78531073,23.6217188 C3.17779173,23.5307786 2.54690661,23.4171034 1.89265537,23.257958 C1.21503801,23.0988126 0.584152891,22.8714621 0,22.5986415 L5.35084048,0.727521658 L10.1408942,0 L8.24823882,7.75265267 C8.6688289,7.57077225 9.04268675,7.43436194 9.46327684,7.34342174 C9.8605008,7.22974648 10.304457,7.18427637 10.7717793,7.18427637 Z M6.75280742,20.0523157 C7.47715701,20.0523157 8.15477436,19.8931703 8.78565948,19.5294095 C9.4165446,19.1883837 9.97733138,18.7336827 10.4446537,18.1653064 C10.911976,17.5969301 11.2858339,16.9376136 11.5428611,16.232827 C11.7998884,15.5053053 11.9400851,14.7550486 11.9400851,13.9820569 C11.9400851,13.0271847 11.7765223,12.276928 11.4493967,11.7312867 C11.122271,11.1856455 10.4446537,10.9355599 9.5567413,10.9355599 C9.27634791,10.9355599 8.97258841,10.958295 8.50526609,11.0719702 C8.03794378,11.1629104 7.64071982,11.390261 7.26686197,11.7085517 L5.25737602,19.9613755 C5.86489503,20.0523157 6.51914626,20.0523157 6.75280742,20.0523157 Z"
            />
          </Svg.G>

          {BrandLogo}
        </Svg.G>
      </Svg.Svg>

      <TruncatedNickname numberOfLines={1} ellipsizeMode={'tail'}>
        {card.nickname || ''}
      </TruncatedNickname>
    </CardBackContainer>
  );
};

export default CardBack;
