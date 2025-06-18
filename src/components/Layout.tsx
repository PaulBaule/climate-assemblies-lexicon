import { useState } from 'react';
import { Box, VStack, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, Text } from '@chakra-ui/react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import { uiTranslations } from '../translations';

const Layout = () => {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'de'>('en');
  const [headerControls, setHeaderControls] = useState(null);
  const { isOpen: isHelpModalOpen, onOpen: onOpenHelpModal, onClose: onCloseHelpModal } = useDisclosure();
  const T = uiTranslations[currentLanguage];
  const location = useLocation();
  const isConnectPage = location.pathname === '/connect';

  return (
    <Box className="gradient-background" minHeight="100vh" w="100vw" color="gray.800">
      <VStack spacing={1} align="stretch" w="100%">
        <Header
          currentLanguage={currentLanguage}
          setCurrentLanguage={setCurrentLanguage}
          onOpenHelpModal={onOpenHelpModal}
          T={T}
          headerControls={headerControls}
          isConnectPage={isConnectPage}
        />
        <Box as="main" w="100%">
          <Outlet context={{ currentLanguage, setHeaderControls }} />
        </Box>
      </VStack>

      <Modal isOpen={isHelpModalOpen} onClose={onCloseHelpModal} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black" borderRadius="xl" boxShadow="xl" mx={4}>
          <ModalHeader pt={8} pl={8} pr={8} fontSize="16px" fontWeight="bold" borderBottomWidth="0px" borderColor="white">
            {T.helpModalTitle}
          </ModalHeader>
          <ModalBody pb={6} pl={8} pr={8}>
            <VStack spacing={4} align="stretch">
              <Text fontSize="16" lineHeight="tall">{T.helpModalIntro}</Text>
              <Text fontSize="16" lineHeight="tall">{T.helpModalStep1}</Text>
              <Text fontSize="16" lineHeight="tall">{T.helpModalStep2}</Text>
              <Text fontSize="16" lineHeight="tall">{T.helpModalStep3}</Text>
              <Text fontSize="16" lineHeight="tall">{T.helpModalStep4}</Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Layout; 