import {useNavigation} from '@react-navigation/native';
import {useEffect, useState} from 'react';

export const useScreenFocusRefreshToken = (): number => {
  const navigation = useNavigation<any>();
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      setRefreshToken(prev => prev + 1);
    });
  }, [navigation]);

  return refreshToken;
};

export default useScreenFocusRefreshToken;
