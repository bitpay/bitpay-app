import React, {useEffect, useRef, useState} from 'react';
import {Text, TextProps} from 'react-native';

interface TypewriterTextProps extends TextProps {
  text: string;
  typeSpeed?: number;
  eraseSpeed?: number;
  pauseDuration?: number;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  typeSpeed = 80,
  eraseSpeed = 40,
  pauseDuration = 1200,
  ...textProps
}) => {
  const [displayed, setDisplayed] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let charIndex = 0;
    let erasing = false;

    const tick = () => {
      if (erasing) {
        setDisplayed(prev => {
          const next = prev.slice(0, -1);
          if (next.length === 0) {
            erasing = false;
            charIndex = 0;
          }
          return next;
        });
        timerRef.current = setTimeout(tick, eraseSpeed);
      } else {
        charIndex += 1;
        setDisplayed(text.slice(0, charIndex));
        if (charIndex === text.length) {
          erasing = true;
          timerRef.current = setTimeout(tick, pauseDuration);
        } else {
          timerRef.current = setTimeout(tick, typeSpeed);
        }
      }
    };

    timerRef.current = setTimeout(tick, typeSpeed);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text, typeSpeed, eraseSpeed, pauseDuration]);

  return <Text {...textProps}>{displayed}</Text>;
};

export default TypewriterText;
