import * as React from 'react';
import {View} from 'react-native';
import Card from '../../src/components/card/Card';
import {storiesOf} from '@storybook/react-native';
import {action} from '@storybook/addon-actions';
import HomeSvg from '../../assets/img/tab-icons/home.svg';
import styled from 'styled-components/native';
import {SlateDark} from '../../src/styles/colors';
import BackgroundExample from '../../assets/img/logos/bitpay-white.svg';

const HeaderBackground = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 50px;
  background-color: ${SlateDark};
  align-items: center;
  justify-content: center;
`;

storiesOf('Card', module)
  .addDecorator(story => <View>{story()}</View>)
  .add('Empty State', () => (
    <View>
      <Card
        bodyDesc={'Create, import or join a shared wallet'}
        onCTAPress={action('CTA Press')}
      />
    </View>
  ))
  .add('Header', () => (
    <View>
      <Card
        onCTAPress={action('CTA Press')}
        bodyDesc={'Create, import or join a shared wallet'}>
        <HeaderBackground>
          <HomeSvg />
        </HeaderBackground>
      </Card>
    </View>
  ))
  .add('Price Text', () => (
    <View>
      <Card
        onCTAPress={action('CTA Press')}
        bodyHeader={'My Everything wallet'}
        price={'$2006.12'}>
        <HeaderBackground>
          <HomeSvg />
        </HeaderBackground>
      </Card>
    </View>
  ))

  .add('Pill Text', () => (
    <View>
      <Card
        onCTAPress={action('CTA Press')}
        bodyHeader={'My Everything wallet'}
        pillText={'+ 2.74%'}
        price={'$2006.12'}>
        <HeaderBackground>
          <HomeSvg />
        </HeaderBackground>
      </Card>
    </View>
  ))
  .add('BackgroundImage', () => (
    <View>
      <Card
        onCTAPress={action('CTA Press')}
        bodyHeader={'My Everything wallet'}
        backgroundImg={BackgroundExample}
        price={'$2006.12'}>
        <HeaderBackground>
          <HomeSvg />
        </HeaderBackground>
      </Card>
    </View>
  ));
