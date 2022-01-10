import React, {useState} from 'react';
import Modal from "react-native-modal";

const DecryptEnterPasswordModal = () => {
    const [isVisible, setIsVisible] = useState(true);

    const dismissModal = () => {
        
    }

    return(
        <Modal isVisible={isVisible}
               backdropOpacity={0.4}
               animationIn={'fadeInUp'}
               animationOut={'fadeOutDown'}
               backdropTransitionOutTiming={0}
               hideModalContentWhileAnimating={true}
               useNativeDriverForBackdrop={true}
               useNativeDriver={true}
               onBackdropPress={dismissModal}
               style={{
                   alignItems: 'center',
               }}>

        </Modal>
    )

}

export default DecryptEnterPasswordModal;