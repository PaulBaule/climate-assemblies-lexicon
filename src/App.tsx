import { useState, useEffect } from 'react';
import { Box, Heading, Flex, Text, Button, VStack, HStack, Spacer, IconButton, InputGroup, InputLeftElement, Input, Divider } from '@chakra-ui/react';
// Import Feather Icons
import { HelpCircle, Menu, ChevronLeft, ChevronRight, Shuffle, Save, ChevronUp, Plus, ChevronDown, Search, MessageSquare, Link, ThumbsUp, Copy } from 'react-feather';
// Remove or comment out Chakra UI icons if no longer needed, or keep if some are still used elsewhere
// import { ChevronLeftIcon, ChevronRightIcon, QuestionOutlineIcon, HamburgerIcon, AddIcon, ChevronUpIcon, ChevronDownIcon, /* ExternalLinkIcon, */ CopyIcon, SearchIcon, TriangleDownIcon, ChatIcon, LinkIcon, StarIcon, RepeatIcon } from '@chakra-ui/icons';
import { db } from './firebase/firebaseConfig'; // Import db
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy, query } from 'firebase/firestore'; // Import Firestore functions

// --- Data Types (good practice to define shapes) ---
type CardOption = string; // For now, options are just strings

interface Definition {
  id?: string; // Optional: will be assigned by Firestore
  typeCategory: CardOption;
  keyAttributes: CardOption;
  impactPurpose: CardOption;
  term?: string; // Added term to Definition type
  createdAt?: any; // For Firestore serverTimestamp
}

// --- Initial Hardcoded Options (will be replaced by Firestore data) ---
// const initialTypeCategoryOptions: CardOption[] = [ ... ]; // Remove or keep for fallback
// const initialKeyAttributesOptions: CardOption[] = [ ... ];
// const initialImpactPurposeOptions: CardOption[] = [ ... ];

function App() {
  // --- State for currently selected card content ---
  const [selectedTypeCategory, setSelectedTypeCategory] = useState<CardOption>("");
  const [selectedKeyAttributes, setSelectedKeyAttributes] = useState<CardOption>("");
  const [selectedImpactPurpose, setSelectedImpactPurpose] = useState<CardOption>("");

  // --- State for the list of available options (currently hardcoded) ---
  // In a real app, these would be fetched and could be more complex objects
  const [typeCategoryOptions, setTypeCategoryOptions] = useState<CardOption[]>([]);
  const [keyAttributesOptions, setKeyAttributesOptions] = useState<CardOption[]>([]);
  const [impactPurposeOptions, setImpactPurposeOptions] = useState<CardOption[]>([]);

  // --- State for saved definitions (will come from Firestore) ---
  const [savedDefinitions, setSavedDefinitions] = useState<Definition[]>([]);

  // --- Placeholder for current term ---
  const currentTerm = "DEMOCRACY";

  // --- Fetch Card Options from Firestore ---
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const optionsCollection = collection(db, 'cardOptions');

        const typeDoc = await getDoc(doc(optionsCollection, 'typeCategory'));
        if (typeDoc.exists() && typeDoc.data().options) {
          const options = typeDoc.data().options as CardOption[];
          setTypeCategoryOptions(options);
          if (options.length > 0) setSelectedTypeCategory(options[0]);
        }

        const attributesDoc = await getDoc(doc(optionsCollection, 'keyAttributes'));
        if (attributesDoc.exists() && attributesDoc.data().options) {
          const options = attributesDoc.data().options as CardOption[];
          setKeyAttributesOptions(options);
          if (options.length > 0) setSelectedKeyAttributes(options[0]);
        }

        const purposeDoc = await getDoc(doc(optionsCollection, 'impactPurpose'));
        if (purposeDoc.exists() && purposeDoc.data().options) {
          const options = purposeDoc.data().options as CardOption[];
          setImpactPurposeOptions(options);
          if (options.length > 0) setSelectedImpactPurpose(options[0]);
        }
      } catch (error) {
        console.error("Error fetching card options:", error);
        // Optionally, set some default/fallback options here
      }
    };
    fetchOptions();
  }, []);

  // --- Fetch Saved Definitions from Firestore (Real-time) ---
  useEffect(() => {
    const definitionsCollection = collection(db, 'definitions');
    // Order by creation time, newest first
    const q = query(definitionsCollection, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const definitions: Definition[] = [];
      querySnapshot.forEach((doc) => {
        definitions.push({ id: doc.id, ...doc.data() } as Definition);
      });
      setSavedDefinitions(definitions);
    }, (error) => {
      console.error("Error fetching definitions:", error);
    });

    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, []);

  // --- Event Handlers (will be built out) ---
  const handleSaveDefinition = async () => { // Make async for Firestore
    if (!selectedTypeCategory || !selectedKeyAttributes || !selectedImpactPurpose) {
      alert("Please select an option for all three cards.");
      return;
    }
    const newDefinition: Definition = {
      typeCategory: selectedTypeCategory,
      keyAttributes: selectedKeyAttributes,
      impactPurpose: selectedImpactPurpose,
      term: currentTerm,
      createdAt: serverTimestamp() // Add server timestamp
    };
    try {
      const definitionsCollection = collection(db, 'definitions');
      const docRef = await addDoc(definitionsCollection, newDefinition);
      console.log("Definition saved with ID:", docRef.id);
      // No need to update local state here, onSnapshot will do it
    } catch (error) {
      console.error("Error saving definition:", error);
    }
  };

  // Function to cycle through options (simplified example)
  const cycleOption = (
    currentOption: CardOption,
    setter: React.Dispatch<React.SetStateAction<CardOption>>,
    options: CardOption[],
    direction: 'next' | 'prev'
  ) => {
    if (options.length === 0) return; // Don't cycle if no options
    const currentIndex = options.indexOf(currentOption);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % options.length;
    } else {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }
    setter(options[nextIndex]);
  };

  // --- Render --- 
  return (
    <Box className="gradient-background" minHeight="100vh" w="100vw" pt={0} px={0} pb={8} color="gray.800">
      <VStack spacing={1} align="stretch" w="100%">
        {/* Header Section */}
        <Flex w="100%" alignItems="center" bg="whiteAlpha.300" p={4} borderRadius="0">
          <Heading as="h1" size="sm" color="black" fontWeight="medium">
            CULTURE & CLIMATE CHANGE
          </Heading>
          <Spacer />
          <HStack spacing={1}>
            <IconButton aria-label="Help" icon={<HelpCircle size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} />
            <IconButton aria-label="Menu" icon={<Menu size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} />
          </HStack>
        </Flex>

        {/* Term Display Section */}
        <VStack spacing={5} align="center" mt={10}>
          <Text fontSize="17px" color="white" letterSpacing="4px">[dɪˈmɒkrəsi]</Text>
          <HStack alignItems="center">
            <IconButton aria-label="Previous term" icon={<ChevronLeft size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} />
            <Heading as="h2" size="xl" fontWeight="regular">
              {currentTerm}
            </Heading>
            <IconButton aria-label="Next term" icon={<ChevronRight size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} />
          </HStack>
        </VStack>

        {/* Card Display Area */}
        <HStack spacing={10} w="100%" justify="center" mt={20} alignItems="center" px={8}>
          <Box minH="340px" display="flex" alignItems="center" justifyContent="center">
            <IconButton borderRadius="10px" aria-label="Remix definition" icon={<Shuffle size={20} strokeWidth={2.5} />} variant="ghost" color="black" bg="whiteAlpha.300" _hover={{ bg: "whiteAlpha.400" }} />
          </Box>

          <HStack spacing={6} alignItems="center" flex={1} justify="center">
            {/* Card 1 with Title above and Buttons Below */}
            <VStack spacing={10} alignItems="center" w="30%">
              <Heading 
                as="h3" 
                fontSize="0.65rem" 
                color="white" 
                fontWeight="bold" 
                textTransform="uppercase" 
                textAlign="center"
                w="full"
              >
                1. TYPE/CATEGORY
              </Heading>
              <VStack 
                bg="white" 
                p={6} 
                borderRadius="30px" 
                boxShadow="xl" 
                w="100%"
                minH="340px" // Adjusted height for content only
                justifyContent="center" // Center the text vertically
              >
                <Text 
                  fontSize="md" 
                  textAlign="left" 
                  fontWeight="medium" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  lineHeight="1.3"
                  flexGrow={1} // Allow text to take available space
                >
                  {selectedTypeCategory || 'Loading...'}
                </Text>
              </VStack>
              <HStack spacing={10}>
                <IconButton 
                  aria-label="Previous option" 
                  icon={<ChevronUp size={20} strokeWidth={2.5} />} 
                  variant="solid" 
                  bg="whiteAlpha.300" 
                  color="black" 
                  borderRadius="10px" 
                  size="md" 
                  onClick={() => cycleOption(selectedTypeCategory, setSelectedTypeCategory, typeCategoryOptions, 'prev')} 
                  isDisabled={typeCategoryOptions.length === 0}
                  _hover={{ bg: "whiteAlpha.400" }}
                  _focus={{ boxShadow: "none" }}
                />
                <IconButton 
                  aria-label="Add new option" 
                  icon={<Plus size={20} strokeWidth={2.5} />} 
                  variant="solid" 
                  bg="whiteAlpha.300" 
                  color="black" 
                  borderRadius="10px" 
                  size="md"
                  _hover={{ bg: "whiteAlpha.400" }}
                  _focus={{ boxShadow: "none" }}
                />
                <IconButton 
                  aria-label="Next option" 
                  icon={<ChevronDown size={20} strokeWidth={2.5} />} 
                  variant="solid" 
                  bg="whiteAlpha.300" 
                  color="black" 
                  borderRadius="10px" 
                  size="md" 
                  onClick={() => cycleOption(selectedTypeCategory, setSelectedTypeCategory, typeCategoryOptions, 'next')} 
                  isDisabled={typeCategoryOptions.length === 0}
                  _hover={{ bg: "whiteAlpha.400" }}
                  _focus={{ boxShadow: "none" }}
                />
              </HStack>
            </VStack>

            <Box w={16} textAlign="center" minH="340px" display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="16px" fontWeight="medium" color="black">THAT</Text>
            </Box>

            {/* Card 2 with Title above and Buttons Below */}
            <VStack spacing={10} alignItems="center" w="30%">
              <Heading 
                as="h3" 
                fontSize="0.65rem" 
                color="white" 
                fontWeight="bold" 
                textTransform="uppercase" 
                textAlign="center"
                w="full"
              >
                2. KEY ATTRIBUTES
              </Heading>
              <VStack 
                bg="white"  
                p={6} 
                borderRadius="30px" 
                boxShadow="xl" 
                w="100%"
                minH="340px" // Adjusted height for content only
                justifyContent="center" // Center the text vertically
              >
                <Text 
                  fontSize="md" 
                  textAlign="left" 
                  fontWeight="medium" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  lineHeight="1.3"
                  flexGrow={1} // Allow text to take available space
                >
                  {selectedKeyAttributes || 'Loading...'}
                </Text>
              </VStack>
              <HStack spacing={10}>
                <IconButton 
                  aria-label="Previous option" 
                  icon={<ChevronUp size={20} strokeWidth={2.5} />} 
                  variant="solid" 
                  bg="whiteAlpha.300" 
                  color="black" 
                  borderRadius="10px" 
                  size="md" 
                  onClick={() => cycleOption(selectedKeyAttributes, setSelectedKeyAttributes, keyAttributesOptions, 'prev')} 
                  isDisabled={keyAttributesOptions.length === 0}
                  _hover={{ bg: "whiteAlpha.400" }}
                  _focus={{ boxShadow: "none" }}
                />
                <IconButton 
                  aria-label="Add new option" 
                  icon={<Plus size={20} strokeWidth={2.5} />} 
                  variant="solid" 
                  bg="whiteAlpha.300" 
                  color="black" 
                  borderRadius="10px" 
                  size="md"
                  _hover={{ bg: "whiteAlpha.400" }}
                  _focus={{ boxShadow: "none" }}
                />
                <IconButton 
                  aria-label="Next option" 
                  icon={<ChevronDown size={20} strokeWidth={2.5} />} 
                  variant="solid" 
                  bg="whiteAlpha.300" 
                  color="black" 
                  borderRadius="10px" 
                  size="md" 
                  onClick={() => cycleOption(selectedKeyAttributes, setSelectedKeyAttributes, keyAttributesOptions, 'next')} 
                  isDisabled={keyAttributesOptions.length === 0}
                  _hover={{ bg: "whiteAlpha.400" }}
                  _focus={{ boxShadow: "none" }}
                />
              </HStack>
            </VStack>

            <Box w={16} textAlign="center" minH="340px" display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="16px" fontWeight="medium" color="black">TO</Text>
            </Box>

            {/* Card 3 with Title above and Buttons Below */}
            <VStack spacing={10} alignItems="center" w="30%">
              <Heading 
                as="h3" 
                fontSize="0.65rem" 
                color="white" 
                fontWeight="bold" 
                textTransform="uppercase" 
                textAlign="center"
                w="full"
              >
                3. IMPACT/PURPOSE
              </Heading>
              <VStack 
                bg="white" 
                p={6} 
                borderRadius="30px" 
                boxShadow="xl" 
                w="100%"
                minH="340px" // Adjusted height for content only
                justifyContent="center" // Center the text vertically
              >
                <Text 
                  fontSize="md" 
                  textAlign="left" 
                  fontWeight="medium" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  lineHeight="1.3"
                  flexGrow={1} // Allow text to take available space
                >
                  {selectedImpactPurpose || 'Loading...'}
                </Text>
              </VStack>
              <HStack spacing={10}>
                <IconButton 
                  aria-label="Previous option" 
                  icon={<ChevronUp size={20} strokeWidth={2.5} />} 
                  variant="solid" 
                  bg="whiteAlpha.300" 
                  color="black" 
                  borderRadius="10px" 
                  size="md" 
                  onClick={() => cycleOption(selectedImpactPurpose, setSelectedImpactPurpose, impactPurposeOptions, 'prev')} 
                  isDisabled={impactPurposeOptions.length === 0}
                  _hover={{ bg: "whiteAlpha.400" }}
                  _focus={{ boxShadow: "none" }}
                />
                <IconButton 
                  aria-label="Add new option" 
                  icon={<Plus size={20} strokeWidth={2.5} />} 
                  variant="solid" 
                  bg="whiteAlpha.300" 
                  color="black" 
                  borderRadius="10px" 
                  size="md"
                  _hover={{ bg: "whiteAlpha.400" }}
                  _focus={{ boxShadow: "none" }}
                />
                <IconButton 
                  aria-label="Next option" 
                  icon={<ChevronDown size={20} strokeWidth={2.5} />} 
                  variant="solid" 
                  bg="whiteAlpha.300" 
                  color="black" 
                  borderRadius="10px" 
                  size="md" 
                  onClick={() => cycleOption(selectedImpactPurpose, setSelectedImpactPurpose, impactPurposeOptions, 'next')} 
                  isDisabled={impactPurposeOptions.length === 0}
                  _hover={{ bg: "whiteAlpha.400" }}
                  _focus={{ boxShadow: "none" }}
                />
              </HStack>
            </VStack>
          </HStack>
          <Box minH="340px" display="flex" alignItems="center" justifyContent="center">
            <IconButton
              aria-label="Save combination"
              icon={<Save size={20} strokeWidth={2.5} />}
              borderRadius="10px"
              variant="ghost"
              color="black"
              bg="whiteAlpha.300"
              _hover={{ bg: "whiteAlpha.400" }}
              _focus={{ boxShadow: "none" }}
              onClick={handleSaveDefinition}
            />
          </Box>
        </HStack>

        {/* Saved Definitions List */}
        {savedDefinitions.length > 0 && (
          <VStack spacing={4} mt={16} w="100%" align="stretch" bg="white" p={6} borderRadius="0">
            <Flex justify="space-between" align="center" w="100%" mb={4}>
              <Text borderRadius="10px" bg="gray.100" fontSize="10px" color="black" fontWeight="medium" px="12px" py="10px" borderWidth="1px" borderColor="gray.100"> 168 DEFINITIONS ADDED SO FAR</Text>
              <HStack spacing={4}>
                <InputGroup w="200px">
                  <InputLeftElement pointerEvents="none">
                    <Search size={20} strokeWidth={2.5} color="black" />
                  </InputLeftElement>
                  <Input type="text" placeholder="SEARCH" fontWeight="medium" fontSize="10px" borderRadius="10px" bg="gray.100" borderWidth="1px" borderColor="gray.100" _placeholder={{ color: 'black' }} color="black"/>
                </InputGroup>
                <Button leftIcon={<ChevronDown size={20} strokeWidth={2.5} color="black"/>} fontSize="10px" px="12px" py="10px" borderRadius="10px" bg="gray.100" color="black" fontWeight="medium" >
                  RECENT
                </Button>
              </HStack>
            </Flex>

            {savedDefinitions.map((def, index) => (
              <VStack key={def.id} align="stretch" spacing={3}>
                <Flex p={3} borderRadius="10px" justify="space-between" align="center" bg="whiteAlpha.200">
                  <HStack spacing={3} align="center" flex={1}>
                    <Text color="black" fontSize="sm">{def.term} IS</Text>
                    <IconButton aria-label="Voice anker" icon={<MessageSquare size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ bg: "whiteAlpha.400" }} size="sm"/>
                    <Text color="black" fontWeight="medium">{def.typeCategory}</Text>
                    <Text color="black" fontWeight="bold">THAT</Text>
                    <IconButton aria-label="Visual anker" icon={<Link size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ bg: "whiteAlpha.400" }} size="sm"/>
                    <Text color="black" fontWeight="medium">{def.keyAttributes}</Text>
                    <Text color="black" fontWeight="bold">TO</Text>
                    <IconButton aria-label="Visual anker" icon={<Link size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ bg: "whiteAlpha.400" }} size="sm"/>
                    <Text color="black" fontWeight="medium">{def.impactPurpose}</Text>
                  </HStack>
                  <IconButton aria-label="Like definition" icon={<ThumbsUp size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ bg: "whiteAlpha.400" }} size="sm"/>
                </Flex>
              </VStack>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}

export default App;
