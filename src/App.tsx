import { useState, useEffect } from 'react';
import { Box, Heading, Flex, Text, Button, VStack, HStack } from '@chakra-ui/react';
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
    <Box bg="#FAD0C4" minHeight="100vh" p={8} color="gray.800">
      <VStack spacing={8} align="center">
        <Heading as="h1" size="lg" color="gray.700">
          CULTURE & CLIMATE CHANGE
        </Heading>

        <Heading as="h2" size="2xl">
          {currentTerm}
        </Heading>

        {/* Card Display Area */}
        <HStack spacing={6} w="100%" maxW="1200px" justify="center">
          {/* Card 1: Type/Category */}
          <VStack bg="white" p={6} borderRadius="xl" boxShadow="lg" w="30%" spacing={4} minH="200px" justify="space-between">
            <Heading as="h3" size="sm" color="gray.500">
              1. TYPE/CATEGORY
            </Heading>
            <Text fontSize="xl" textAlign="center">{selectedTypeCategory || 'Loading...'}</Text>
            <HStack>
              <Button isDisabled={typeCategoryOptions.length === 0} onClick={() => cycleOption(selectedTypeCategory, setSelectedTypeCategory, typeCategoryOptions, 'prev')}>↑</Button>
              {/* <Button>+</Button> // Add new card - for later */}
              <Button isDisabled={typeCategoryOptions.length === 0} onClick={() => cycleOption(selectedTypeCategory, setSelectedTypeCategory, typeCategoryOptions, 'next')}>↓</Button>
            </HStack>
          </VStack>

          <Text fontSize="2xl" fontWeight="bold">THAT</Text>

          {/* Card 2: Key Attributes */}
          <VStack bg="white" p={6} borderRadius="xl" boxShadow="lg" w="30%" spacing={4} minH="200px" justify="space-between">
            <Heading as="h3" size="sm" color="gray.500">
              2. KEY ATTRIBUTES
            </Heading>
            <Text fontSize="xl" textAlign="center">{selectedKeyAttributes || 'Loading...'}</Text>
            <HStack>
              <Button isDisabled={keyAttributesOptions.length === 0} onClick={() => cycleOption(selectedKeyAttributes, setSelectedKeyAttributes, keyAttributesOptions, 'prev')}>↑</Button>
              {/* <Button>+</Button> */}
              <Button isDisabled={keyAttributesOptions.length === 0} onClick={() => cycleOption(selectedKeyAttributes, setSelectedKeyAttributes, keyAttributesOptions, 'next')}>↓</Button>
            </HStack>
          </VStack>

          <Text fontSize="2xl" fontWeight="bold">TO</Text>

          {/* Card 3: Impact/Purpose */}
          <VStack bg="white" p={6} borderRadius="xl" boxShadow="lg" w="30%" spacing={4} minH="200px" justify="space-between">
            <Heading as="h3" size="sm" color="gray.500">
              3. IMPACT/PURPOSE
            </Heading>
            <Text fontSize="xl" textAlign="center">{selectedImpactPurpose || 'Loading...'}</Text>
            <HStack>
              <Button isDisabled={impactPurposeOptions.length === 0} onClick={() => cycleOption(selectedImpactPurpose, setSelectedImpactPurpose, impactPurposeOptions, 'prev')}>↑</Button>
              {/* <Button>+</Button> */}
              <Button isDisabled={impactPurposeOptions.length === 0} onClick={() => cycleOption(selectedImpactPurpose, setSelectedImpactPurpose, impactPurposeOptions, 'next')}>↓</Button>
            </HStack>
          </VStack>
        </HStack>

        <Button colorScheme="teal" size="lg" onClick={handleSaveDefinition}>
          Save Definition
        </Button>

        {/* Saved Definitions List */}
        {savedDefinitions.length > 0 && (
          <VStack spacing={4} mt={10} w="100%" maxW="800px" align="stretch">
            <Heading as="h2" size="xl" color="gray.700" textAlign="center">
              Saved Combinations
            </Heading>
            {savedDefinitions.map((def) => (
              <Flex key={def.id} p={4} bg="whiteAlpha.700" borderRadius="md" boxShadow="sm" justify="space-between" align="center">
                <Text>{def.typeCategory} <strong>THAT</strong> {def.keyAttributes} <strong>TO</strong> {def.impactPurpose}</Text>
                {/* Add like button or other actions later */}
              </Flex>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}

export default App;
