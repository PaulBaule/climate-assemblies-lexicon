import { Box, Heading, Flex, Button, HStack, Spacer, IconButton, Link } from '@chakra-ui/react';
import { HelpCircle } from 'react-feather';
import { NavLink } from 'react-router-dom';

// Define the props the Header will need
interface HeaderProps {
  currentLanguage: 'en' | 'de';
  setCurrentLanguage: (language: 'en' | 'de') => void;
  onOpenHelpModal: () => void;
  T: any; // Using 'any' for simplicity, could be typed more strictly
  headerControls: {
    save: () => Promise<void>;
    delete: () => Promise<void>;
  } | null;
  isConnectPage: boolean;
}

const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  setCurrentLanguage,
  onOpenHelpModal,
  T,
  headerControls,
  isConnectPage,
}) => {

  const activeLinkStyles = {
    bg: 'white',
    color: 'black',
  };

  return (
    <Flex w="100%" alignItems="center" p={4} pl={10} borderRadius="0" bg="whiteAlpha.300">
      <Heading  size="s" color="black"  textTransform="uppercase" userSelect="none" fontWeight="bold" >
        CULTURE & CLIMATE CHANGE
      </Heading>
      <Spacer />

      <HStack spacing={3} pr={7} alignItems="center">
        
      {/* {headerControls && (
          <>
            <Button onClick={headerControls.save} size="md" bg="whiteAlpha.300" _hover={{ bg: 'white' }} borderRadius="10px">Save Defaults</Button>
            <Button onClick={headerControls.delete} size="md" bg="whiteAlpha.300" _hover={{ bg: 'white' }} borderRadius="10px">Delete All</Button>
          </>
        )} */}
        <Link
          as={NavLink}
          to="/connect"
          bg="whiteAlpha.300"
          color="black"
          fontWeight="bold"
          textTransform="uppercase"
          fontSize="16px"
          h="40px"
          w="105px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="10px"
          _hover={{
            bg: 'white',
            textDecoration: 'none',
          }}
          _activeLink={activeLinkStyles}
        >
          CONNECT
        </Link>
        <Link
          as={NavLink}
          to="/define"
          bg="whiteAlpha.300"
          color="black"
          fontWeight="bold"
          textTransform="uppercase"
          fontSize="16px"
          h="40px"
          w="105px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="10px"
          _hover={{
            bg: 'white',
            textDecoration: 'none',
          }}
          _activeLink={activeLinkStyles}
        >
          DEFINE
        </Link>
      
        <HStack
          spacing={1}
          bg="whiteAlpha.300"
          borderRadius="10px"
          h="40px"
          p="2px"
        >
          <Button
            variant="ghost"
            bg={currentLanguage === 'en' ? 'white' : 'transparent'}
            color="black"
            onClick={() => setCurrentLanguage('en')}
            _hover={{ bg: 'white' }}
            h="100%"
            px="16px"
            fontWeight="bold"
            borderRadius="8px"
          >
            EN
          </Button>
          <Button
            variant="ghost"
            bg={currentLanguage === 'de' ? 'white' : 'transparent'}
            color="black"
            onClick={() => setCurrentLanguage('de')}
            _hover={{ bg: 'white' }}
            h="100%"
            px="16px"
            fontWeight="bold"
            borderRadius="8px"
          >
            DE
          </Button >
        </HStack >
        <IconButton
          aria-label={T.labelHelpIcon}
          icon={<HelpCircle size={23} strokeWidth={2.5}  />}
          bg="whiteAlpha.300"
          color="black"
          borderRadius="10px"
          _hover={isConnectPage ? {} : { bg: 'white' }}
          _active={isConnectPage ? {} : undefined}
          onClick={onOpenHelpModal}
          isDisabled={isConnectPage}
          cursor={isConnectPage ? 'default' : 'pointer'}
          size="md"
        />
      </HStack>
    </Flex>
  );
};

export default Header; 