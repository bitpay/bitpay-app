import * as React from 'react';
import {View} from 'react-native';
import {storiesOf} from '@storybook/react-native';
import {action} from '@storybook/addon-actions';
import HomeSvg from '../../assets/img/tab-icons/home.svg';
import styled from 'styled-components/native';
import {SlateDark} from '../../src/styles/colors';
import BackgroundExample from '../../assets/img/logos/bitpay-white.svg';
import HomeCard from '../../src/components/home-card/HomeCard';

const HeaderBackground = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 50px;
  background-color: ${SlateDark};
  align-items: center;
  justify-content: center;
`;

const HeaderComp = (
  <HeaderBackground>
    <HomeSvg />
  </HeaderBackground>
);
storiesOf('HomeCard', module)
  .addDecorator(story => <View>{story()}</View>)

  .add('Empty State', () => (
    <View>
      <HomeCard
        body={{description: 'Create, import or join a shared wallet'}}
        footer={{onCTAPress: action('CTA Press')}}
      />
    </View>
  ))
  .add('Header', () => (
    <View>
      <HomeCard
        footer={{onCTAPress: action('CTA Press')}}
        header={HeaderComp}
        body={{
          description: 'Create, import or join a shared wallet',
        }}
      />
    </View>
  ))
  .add('Price Text', () => (
    <View>
      <HomeCard
        header={HeaderComp}
        footer={{onCTAPress: action('CTA Press')}}
        body={{header: 'My Everything wallet', price: '$2006.12'}}
      />
    </View>
  ))

  .add('Pill Text', () => (
    <View>
      <HomeCard
        header={HeaderComp}
        footer={{onCTAPress: action('CTA Press')}}
        body={{
          header: 'My Everything wallet',
          price: '$2006.12',
          pillText: '+ 2.74%',
        }}
      />
    </View>
  ))
  .add('BackgroundImage', () => (
    <View>
      <HomeCard
        header={HeaderComp}
        footer={{onCTAPress: action('CTA Press')}}
        body={{header: 'My Everything wallet', price: '$2006.12'}}
        backgroundImg={() => <BackgroundExample />}
      />
    </View>
  ));
