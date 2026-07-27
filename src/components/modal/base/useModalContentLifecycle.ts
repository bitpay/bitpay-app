import {useCallback, useEffect, useRef, useState} from 'react';

const useModalContentLifecycle = (isVisible: boolean) => {
  const [hasOpened, setHasOpened] = useState(false);
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  useEffect(() => {
    if (isVisible) {
      setHasOpened(true);
    }
  }, [isVisible]);

  const handleModalHide = useCallback(() => {
    if (!isVisibleRef.current) {
      setHasOpened(false);
    }
  }, []);

  return {
    shouldRenderModal: isVisible || hasOpened,
    handleModalHide,
  };
};

export default useModalContentLifecycle;
