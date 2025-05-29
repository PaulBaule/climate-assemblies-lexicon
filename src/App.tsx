import { useState, useEffect, useRef } from 'react';
import { Box, Heading, Flex, Text, Button, VStack, HStack, Spacer, IconButton, InputGroup, InputLeftElement, Input, Divider, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure, Textarea, Image as ChakraImage, Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverCloseButton, PopoverHeader, PopoverBody } from '@chakra-ui/react';
// Import Feather Icons
import { HelpCircle, Menu, ChevronLeft, ChevronRight, Shuffle, Save, ChevronUp, Plus, ChevronDown, Search, MessageSquare, Link, ThumbsUp, Copy, Type, Edit3, Mic, Image, X, Check, Trash2 } from 'react-feather';
// Remove or comment out Chakra UI icons if no longer needed, or keep if some are still used elsewhere
// import { ChevronLeftIcon, ChevronRightIcon, QuestionOutlineIcon, HamburgerIcon, AddIcon, ChevronUpIcon, ChevronDownIcon, /* ExternalLinkIcon, */ CopyIcon, SearchIcon, TriangleDownIcon, ChatIcon, LinkIcon, StarIcon, RepeatIcon } from '@chakra-ui/icons';
import { db } from './firebase/firebaseConfig'; // Import db
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'; // Import Firestore functions (ensure updateDoc is here)

// --- Data Types (good practice to define shapes) ---
interface CardOptionValue {
  type: 'text' | 'drawing';
  content: string; // Text content or base64 data URL for drawing
  id?: string; // Optional unique ID for options, useful for keys and comparisons
}

interface Definition {
  id?: string; // Optional: will be assigned by Firestore
  typeCategory: CardOptionValue;
  keyAttributes: CardOptionValue;
  impactPurpose: CardOptionValue;
  term?: string; // Added term to Definition type
  createdAt?: any; // For Firestore serverTimestamp
}

// --- Initial Hardcoded Options (will be replaced by Firestore data) ---
// const initialTypeCategoryOptions: CardOption[] = [ ... ]; // Remove or keep for fallback
// const initialKeyAttributesOptions: CardOption[] = [ ... ];
// const initialImpactPurposeOptions: CardOption[] = [ ... ];

const defaultTextOption: CardOptionValue = { type: 'text', content: 'Loading...', id: 'loading' };

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null); // Will be stored in newOptionContent.content

  // --- State for currently selected card content ---
  const [selectedTypeCategory, setSelectedTypeCategory] = useState<CardOptionValue>(defaultTextOption);
  const [selectedKeyAttributes, setSelectedKeyAttributes] = useState<CardOptionValue>(defaultTextOption);
  const [selectedImpactPurpose, setSelectedImpactPurpose] = useState<CardOptionValue>(defaultTextOption);

  // --- State for the list of available options (currently hardcoded) ---
  // In a real app, these would be fetched and could be more complex objects
  const [typeCategoryOptions, setTypeCategoryOptions] = useState<CardOptionValue[]>([]);
  const [keyAttributesOptions, setKeyAttributesOptions] = useState<CardOptionValue[]>([]);
  const [impactPurposeOptions, setImpactPurposeOptions] = useState<CardOptionValue[]>([]);

  // --- State for saved definitions (will come from Firestore) ---
  const [savedDefinitions, setSavedDefinitions] = useState<Definition[]>([]);

  // Modal disclosure hook
  const { isOpen: isHelpModalOpen, onOpen: onOpenHelpModal, onClose: onCloseHelpModal } = useDisclosure();

  // --- State for adding new card options ---
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  // const [newOptionText, setNewOptionText] = useState<string>(""); // REPLACED by newOptionContent
  const [newOptionContent, setNewOptionContent] = useState<CardOptionValue>({ type: 'text', content: '' });
  const [activeInputMode, setActiveInputMode] = useState<'text' | 'drawing'>('text');

  // --- Placeholder for current term ---
  const currentTerm = "DEMOCRACY";

  // Helper to ensure fetched options are in the new format
  const mapToCardOptionValueArray = (options: any[]): CardOptionValue[] => {
    return options.map((opt, index) => {
      if (typeof opt === 'string') {
        return { type: 'text', content: opt, id: `text-${index}-${new Date().getTime()}` };
      }
      if (opt && typeof opt === 'object' && opt.type && opt.content) {
        return { ...opt, id: opt.id || `${opt.type}-${index}-${new Date().getTime()}` };
      }
      // Fallback for unexpected data structure
      return { type: 'text', content: 'Invalid option data', id: `invalid-${index}-${new Date().getTime()}` };
    });
  };

  // --- Fetch Card Options from Firestore ---
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const optionsCollection = collection(db, 'cardOptions');

        const typeDoc = await getDoc(doc(optionsCollection, 'typeCategory'));
        if (typeDoc.exists() && typeDoc.data().options) {
          const options = mapToCardOptionValueArray(typeDoc.data().options);
          setTypeCategoryOptions(options);
          if (options.length > 0 && selectedTypeCategory.id === 'loading') setSelectedTypeCategory(options[0]);
        }

        const attributesDoc = await getDoc(doc(optionsCollection, 'keyAttributes'));
        if (attributesDoc.exists() && attributesDoc.data().options) {
          const options = mapToCardOptionValueArray(attributesDoc.data().options);
          setKeyAttributesOptions(options);
          if (options.length > 0 && selectedKeyAttributes.id === 'loading') setSelectedKeyAttributes(options[0]);
        }

        const purposeDoc = await getDoc(doc(optionsCollection, 'impactPurpose'));
        if (purposeDoc.exists() && purposeDoc.data().options) {
          const options = mapToCardOptionValueArray(purposeDoc.data().options);
          setImpactPurposeOptions(options);
          if (options.length > 0 && selectedImpactPurpose.id === 'loading') setSelectedImpactPurpose(options[0]);
        }
      } catch (error) {
        console.error("Error fetching card options:", error);
      }
    };
    fetchOptions();
  }, []);

  // --- Fetch Saved Definitions from Firestore (Real-time) ---
  useEffect(() => {
    const definitionsCollection = collection(db, 'definitions');
    const q = query(definitionsCollection, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const definitionsData: Definition[] = [];
      querySnapshot.forEach((doc) => {
        // Ensure an ID is present for key prop, and data matches Definition structure
        const data = doc.data();
        definitionsData.push({
          id: doc.id,
          term: data.term || 'N/A',
          typeCategory: typeof data.typeCategory === 'string' ? {type: 'text', content: data.typeCategory} : data.typeCategory,
          keyAttributes: typeof data.keyAttributes === 'string' ? {type: 'text', content: data.keyAttributes} : data.keyAttributes,
          impactPurpose: typeof data.impactPurpose === 'string' ? {type: 'text', content: data.impactPurpose} : data.impactPurpose,
          createdAt: data.createdAt
        } as Definition);
      });
      setSavedDefinitions(definitionsData);
    }, (error) => {
      console.error("Error fetching definitions:", error);
    });
    return () => unsubscribe();
  }, []);

  // --- Event Handlers ---
  const handleSaveDefinition = async () => {
    if (!selectedTypeCategory.content || !selectedKeyAttributes.content || !selectedImpactPurpose.content) {
      alert("Please select an option for all three cards.");
      return;
    }
    const newDefinition: Definition = {
      typeCategory: selectedTypeCategory,
      keyAttributes: selectedKeyAttributes,
      impactPurpose: selectedImpactPurpose,
      term: currentTerm,
      createdAt: serverTimestamp()
    };
    try {
      const definitionsCollection = collection(db, 'definitions');
      await addDoc(definitionsCollection, newDefinition);
    } catch (error) {
      console.error("Error saving definition:", error);
    }
  };
  
  const handleShuffle = () => {
    if (typeCategoryOptions.length > 0) {
      const randomIndex = Math.floor(Math.random() * typeCategoryOptions.length);
      setSelectedTypeCategory(typeCategoryOptions[randomIndex]);
    }
    if (keyAttributesOptions.length > 0) {
      const randomIndex = Math.floor(Math.random() * keyAttributesOptions.length);
      setSelectedKeyAttributes(keyAttributesOptions[randomIndex]);
    }
    if (impactPurposeOptions.length > 0) {
      const randomIndex = Math.floor(Math.random() * impactPurposeOptions.length);
      setSelectedImpactPurpose(impactPurposeOptions[randomIndex]);
    }
  };

  const cycleOption = (
    currentOption: CardOptionValue,
    setter: React.Dispatch<React.SetStateAction<CardOptionValue>>,
    options: CardOptionValue[],
    direction: 'next' | 'prev'
  ) => {
    if (options.length === 0) return;
    const currentIndex = options.findIndex(opt => opt.id ? opt.id === currentOption.id : opt.content === currentOption.content && opt.type === currentOption.type);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % options.length;
    } else {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }
    setter(options[nextIndex]);
  };

  // --- Handlers for adding new card options ---
  const handleOpenInputInterface = (category: string) => {
    setEditingCategory(category);
    setActiveInputMode('text'); // Default to text mode
    setNewOptionContent({ type: 'text', content: '' });
  };

  const handleCloseInputInterface = () => {
    setEditingCategory(null);
    setNewOptionContent({ type: 'text', content: '' });
    if (canvasRef.current) { // Clear canvas on close
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const handleSaveNewOption = async () => {
    if (!editingCategory) return;
    let finalOptionToSave = { ...newOptionContent };

    if (activeInputMode === 'drawing' && canvasRef.current) {
      const drawingURL = canvasRef.current.toDataURL('image/png');
      finalOptionToSave = { type: 'drawing', content: drawingURL };
    } else if (activeInputMode === 'text' && !newOptionContent.content.trim()) {
      handleCloseInputInterface();
      return;
    }
    finalOptionToSave.id = `${finalOptionToSave.type}-${new Date().getTime()}`;
    finalOptionToSave.content = finalOptionToSave.content.trim(); // Trim text content

    const optionsCollectionRef = collection(db, 'cardOptions');
    const categoryDocRef = doc(optionsCollectionRef, editingCategory);

    try {
      const docSnap = await getDoc(categoryDocRef);
      let currentOptions: CardOptionValue[] = [];
      if (docSnap.exists() && docSnap.data().options) {
        currentOptions = mapToCardOptionValueArray(docSnap.data().options);
      }
      
      // Avoid adding exact duplicates for text, for drawings, new ID makes it unique
      const isDuplicate = currentOptions.some(opt => opt.type === finalOptionToSave.type && opt.content === finalOptionToSave.content);

      if (!isDuplicate || finalOptionToSave.type === 'drawing') { 
        const updatedOptions = [...currentOptions, finalOptionToSave];
        // Firestore expects plain objects
        const optionsToStore = updatedOptions.map(opt => ({type: opt.type, content: opt.content, id: opt.id})); 
        await updateDoc(categoryDocRef, { options: optionsToStore });

        if (editingCategory === 'typeCategory') {
          setTypeCategoryOptions(updatedOptions);
          setSelectedTypeCategory(finalOptionToSave);
        } else if (editingCategory === 'keyAttributes') {
          setKeyAttributesOptions(updatedOptions);
          setSelectedKeyAttributes(finalOptionToSave);
        } else if (editingCategory === 'impactPurpose') {
          setImpactPurposeOptions(updatedOptions);
          setSelectedImpactPurpose(finalOptionToSave);
        }
      } else {
         // If it's a duplicate text, still select it
        const existingOption = currentOptions.find(opt => opt.type === 'text' && opt.content === finalOptionToSave.content);
        if (existingOption) {
          if (editingCategory === 'typeCategory') setSelectedTypeCategory(existingOption);
          if (editingCategory === 'keyAttributes') setSelectedKeyAttributes(existingOption);
          if (editingCategory === 'impactPurpose') setSelectedImpactPurpose(existingOption);
        }
      }
      handleCloseInputInterface();
    } catch (error) {
      console.error("Error saving new option:", error);
      handleCloseInputInterface();
    }
  };

  // --- Drawing Canvas Handlers ---
  useEffect(() => { // Setup canvas when it becomes available and input mode is drawing
    if (editingCategory && activeInputMode === 'drawing' && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        // Set initial canvas properties, e.g., size relative to container
        // This might need adjustment based on actual layout
        const parentWidth = canvas.parentElement?.clientWidth || 300;
        canvas.width = parentWidth * 0.9;
        canvas.height = 200; // Or some other appropriate height
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.lineCap = 'round';
      }
    }
  }, [editingCategory, activeInputMode]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = nativeEvent;
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      context.beginPath();
      context.moveTo(offsetX, offsetY);
      setIsDrawing(true);
    }
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      context.lineTo(offsetX, offsetY);
      context.stroke();
    }
  };

  const endDrawing = () => {
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      context.closePath();
    }
    setIsDrawing(false);
    // const dataUrl = canvasRef.current?.toDataURL('image/png');
    // setNewOptionContent({ type: 'drawing', content: dataUrl || '' }); // Save on end, or on save button click?
  };
  
  const clearCanvas = () => {
    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        // setNewOptionContent({ type: 'drawing', content: '' }); // Clear content state too
      }
    }
  };

  // --- Render Input UI for Cards ---
  const renderCardInputInterface = (categoryPlaceholder: string) => (
    <VStack
      bg="white" p={4} borderRadius="30px" boxShadow="xl" w="100%"
      minH="340px" justifyContent="space-between" alignItems="stretch" spacing={3}
    >
      <HStack justifyContent="center" w="full" spacing={1} py={1}> {/* Icon bar */}
        <IconButton aria-label="Text input" icon={<Type size={20} />} variant={activeInputMode === 'text' ? "outline" : "ghost"} colorScheme="blue" size="sm" onClick={() => setActiveInputMode('text')} />
        <IconButton aria-label="Draw input" icon={<Edit3 size={20} />} variant={activeInputMode === 'drawing' ? "outline" : "ghost"} colorScheme="blue" size="sm" onClick={() => setActiveInputMode('drawing')} />
        <IconButton aria-label="Clear Drawing" icon={<Trash2 size={20} />} variant="ghost" size="sm" onClick={clearCanvas} isDisabled={activeInputMode !== 'drawing'}/>
        {/* Placeholder for other icons like Mic, Image */}
        <IconButton aria-label="Voice input" icon={<Mic size={20} />} variant="ghost" isDisabled size="sm"/>
        <IconButton aria-label="Image input" icon={<Image size={20} />} variant="ghost" isDisabled size="sm"/>
      </HStack>
      {activeInputMode === 'text' ? (
        <Textarea
          value={newOptionContent.type === 'text' ? newOptionContent.content : ''}
          onChange={(e) => setNewOptionContent({ type: 'text', content: e.target.value })}
          placeholder={`Enter new ${categoryPlaceholder}...`}
          flex={1} 
          minHeight="200px" // Adjusted height
          borderColor="gray.300"
          _focus={{ borderColor: "blue.500", boxShadow: "outline" }}
          size="sm"
        />
      ) : (
        <Box flex={1} w="full" display="flex" justifyContent="center" alignItems="center" borderColor="gray.300" borderWidth="1px" borderRadius="md" overflow="hidden">
          <canvas 
            ref={canvasRef} 
            onMouseDown={startDrawing} 
            onMouseMove={draw} 
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing} // End drawing if mouse leaves canvas
            style={{ touchAction: 'none'}} // Corrected typo: touchAction
          />
        </Box>
      )}
      <HStack justifyContent="space-between" w="full" pt={1}>
        <IconButton aria-label="Cancel" icon={<X size={20} />} onClick={handleCloseInputInterface} variant="ghost" colorScheme="red" size="sm"/>
        <IconButton aria-label="Save" icon={<Check size={20} />} onClick={handleSaveNewOption} variant="ghost" colorScheme="green" size="sm"/>
      </HStack>
    </VStack>
  );

  // --- Component to display card content (text or drawing) ---
  const CardContentDisplay = ({ option, displayContext = 'mainCard' }: { option: CardOptionValue, displayContext?: 'mainCard' | 'savedList' }) => {
    if (!option || !option.type) {
      return <Text>Error: Invalid option</Text>; // Fallback for invalid data
    }

    if (option.type === 'drawing') {
      if (displayContext === 'savedList') {
        return (
          <Popover trigger="hover" placement="top">
            <PopoverTrigger>
              <IconButton 
                aria-label="View drawing" 
                icon={<Edit3 size={16} />} // Using Edit3 icon for drawing in list
                variant="ghost"
                size="sm"
              />
            </PopoverTrigger>
            <PopoverContent boxShadow="lg" borderColor="gray.300">
              <PopoverArrow bg="white"/>
              <PopoverCloseButton />
              <PopoverHeader border="0" fontWeight="semibold">Drawing</PopoverHeader>
              <PopoverBody p={2}> {/* Reduced padding for tighter fit */}
                <ChakraImage src={option.content} alt="User drawing" maxW="200px" maxH="200px" objectFit="contain" />
              </PopoverBody>
            </PopoverContent>
          </Popover>
        );
      }
      // Default for mainCard or other contexts
      return <ChakraImage src={option.content} alt="User drawing" objectFit="contain" w="100%" h="100%" />; 
    }
    
    // Text display
    if (displayContext === 'savedList') {
        // No special background for text in the list
        return (
            <Text 
              fontSize="sm" 
              textAlign="left" 
              fontWeight="medium"
              noOfLines={3} // Increased lines for list display
              title={option.content} // Show full text on hover (browser default)
              // w="full" // Removed to allow natural width
            >
              {option.content || '-'}
            </Text>
        );
    }

    // Default for mainCard or other contexts (text)
    return (
      <Text 
        fontSize="md" 
        textAlign="left" 
        fontWeight="medium" 
        display="flex" 
        alignItems="center" 
        justifyContent="flex-start"
        lineHeight="1.3"
        flexGrow={1}
        w="100%"
        whiteSpace="pre-wrap" // To respect newlines in text
      >
        {option.content || 'Loading...'}
      </Text>
    );
  };

  // --- Render --- 
  return (
    <Box className="gradient-background" minHeight="100vh" w="100vw" pt={0} px={0} pb={8} color="gray.800">
      <VStack spacing={1} align="stretch" w="100%">
        {/* Header Section */}
        <Flex w="100%" alignItems="center" bg="whiteAlpha.300" p={4} pl={10} borderRadius="0" >
          <Heading as="h1" size="sm" color="black" fontWeight="medium"> 
            CULTURE & CLIMATE CHANGE
          </Heading>
          <Spacer />
          <HStack spacing={3} pr={7}>
            <IconButton aria-label="Help" icon={<HelpCircle size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} onClick={onOpenHelpModal} />
            <IconButton aria-label="Menu" icon={<Menu size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} />
          </HStack>
        </Flex>

        {/* Term Display Section */}
        <VStack spacing={5} align="center" mt={10}>
          <Text fontSize="17px" color="white" letterSpacing="4px">[dɪˈmɒkrəsi]</Text>
          <HStack alignItems="center">
            <IconButton aria-label="Previous term" icon={<ChevronLeft size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} />
            <Heading as="h2" size="xl" fontWeight="regular" color="black">
              {currentTerm}
            </Heading>
            <IconButton aria-label="Next term" icon={<ChevronRight size={20} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} />
          </HStack>
        </VStack>

        {/* Card Display Area */}
        <HStack spacing={10} w="100%" justify="center" mt={20} alignItems="center" px={8}>
          <Box minH="340px" display="flex" alignItems="center" justifyContent="center" pb={6} pl={3}>
            <IconButton borderRadius="10px" aria-label="Remix definition" icon={<Shuffle size={20} strokeWidth={2.5} />} variant="ghost" color="black" bg="whiteAlpha.300" _hover={{ bg: "white" }} onClick={handleShuffle}  />
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
              {editingCategory === 'typeCategory' ? (
                renderCardInputInterface('type/category')
              ) : (
                <VStack 
                  bg="white" 
                  p={6} 
                  borderRadius="30px" 
                  boxShadow="xl" 
                  w="100%"
                  minH="340px"
                  justifyContent="center"
                >
                  <CardContentDisplay option={selectedTypeCategory} />
                </VStack>
              )}
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
                  isDisabled={typeCategoryOptions.length === 0 || editingCategory === 'typeCategory'}
                  _hover={{ bg: "white" }}
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
                  onClick={() => editingCategory === 'typeCategory' ? handleCloseInputInterface() : handleOpenInputInterface('typeCategory')}
                  isActive={editingCategory === 'typeCategory'}
                  _hover={{ bg: "white" }}
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
                  isDisabled={typeCategoryOptions.length === 0 || editingCategory === 'typeCategory'}
                  _hover={{ bg: "white" }}
                  _focus={{ boxShadow: "none" }}
                />
              </HStack>
            </VStack>

            <Box w={16} textAlign="center" minH="340px" display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="16px" fontWeight="medium" pb={6} color="black">THAT</Text>
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
              {editingCategory === 'keyAttributes' ? (
                renderCardInputInterface('key attributes')
              ) : (
                <VStack 
                  bg="white"  
                  p={6} 
                  borderRadius="30px" 
                  boxShadow="xl" 
                  w="100%"
                  minH="340px"
                  justifyContent="center"
                >
                  <CardContentDisplay option={selectedKeyAttributes} />
                </VStack>
              )}
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
                  isDisabled={keyAttributesOptions.length === 0 || editingCategory === 'keyAttributes'}
                  _hover={{ bg: "white" }}
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
                  onClick={() => editingCategory === 'keyAttributes' ? handleCloseInputInterface() : handleOpenInputInterface('keyAttributes')}
                  isActive={editingCategory === 'keyAttributes'}
                  _hover={{ bg: "white" }}
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
                  isDisabled={keyAttributesOptions.length === 0 || editingCategory === 'keyAttributes'}
                  _hover={{ bg: "white" }}
                  _focus={{ boxShadow: "none" }}
                />
              </HStack>
            </VStack>

            <Box w={16} textAlign="center" minH="340px" display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="16px" fontWeight="medium" pb={6} color="black">TO</Text>
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
              {editingCategory === 'impactPurpose' ? (
                renderCardInputInterface('impact/purpose')
              ) : (
                <VStack 
                  bg="white" 
                  p={6} 
                  borderRadius="30px" 
                  boxShadow="xl" 
                  w="100%"
                  minH="340px"
                  justifyContent="center"
                >
                  <CardContentDisplay option={selectedImpactPurpose} />
                </VStack>
              )}
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
                  isDisabled={impactPurposeOptions.length === 0 || editingCategory === 'impactPurpose'}
                  _hover={{ bg: "white" }}
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
                  onClick={() => editingCategory === 'impactPurpose' ? handleCloseInputInterface() : handleOpenInputInterface('impactPurpose')}
                  isActive={editingCategory === 'impactPurpose'}
                  _hover={{ bg: "white" }}
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
                  isDisabled={impactPurposeOptions.length === 0 || editingCategory === 'impactPurpose'}
                  _hover={{ bg: "white" }}
                  _focus={{ boxShadow: "none" }}
                />
              </HStack>
            </VStack>
          </HStack>
          <Box minH="340px" display="flex" alignItems="center" justifyContent="center" pb={6} pr={3}>
            <IconButton
              aria-label="Save combination"
              icon={<Save size={20} strokeWidth={2.5} />}
              borderRadius="10px"
              variant="ghost"
              color="black"
              bg="whiteAlpha.300"
              _hover={{ bg: "white" }}
              _focus={{ boxShadow: "none" }}
              onClick={handleSaveDefinition}
            />
          </Box>
        </HStack>

        {/* Saved Definitions List */}
        {savedDefinitions.length > 0 && (
          <VStack spacing={4} mt={16} w="100%" align="stretch" bg="white" p={6} borderRadius="0">
            <Flex py={3} px={5} justify="space-between" align="center" w="100%" mb={4}>
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
              <VStack key={def.id || index} align="stretch" spacing={3}>
                <Flex py={3} px={5} borderRadius="10px" justify="space-between" align="center" bg="whiteAlpha.200">
                  {/* Adjusted HStack for sentence-like flow */}
                  <HStack spacing={1.5} alignItems="baseline" flex={1} w="full" overflowX="auto"> 
                    <Text color="black" fontWeight="bold" fontSize="16px" whiteSpace="nowrap">{def.term} IS</Text>
                    
                    <Box>
                      <CardContentDisplay option={def.typeCategory} displayContext="savedList" />
                    </Box>
                    
                    <Text color="black" fontWeight="bold" whiteSpace="nowrap">THAT</Text>
                    
                    <Box>
                      <CardContentDisplay option={def.keyAttributes} displayContext="savedList" />
                    </Box>
                    
                    <Text color="black" fontWeight="bold" whiteSpace="nowrap">TO</Text>
                    
                    <Box>
                      <CardContentDisplay option={def.impactPurpose} displayContext="savedList" />
                    </Box>
                  </HStack>
                  <IconButton aria-label="Like definition" icon={<ThumbsUp size={20} strokeWidth={2.5} />} variant="ghost" color="gray.200" _hover={{ bg: "whiteAlpha.400" }} size="sm" ml={2}/>
                </Flex>
              </VStack>
            ))}
          </VStack>
        )}
      </VStack>

      {/* Help Modal */}
      <Modal isOpen={isHelpModalOpen} onClose={onCloseHelpModal} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="gray.800" borderRadius="xl" boxShadow="xl" mx={4}>
          <ModalHeader fontWeight="bold" borderBottomWidth="1px" borderColor="gray.200">
            How to Use This Tool
          </ModalHeader>
          <ModalCloseButton _focus={{ boxShadow: "none" }} />
          <ModalBody py={6}>
            <VStack spacing={4} align="stretch">
              <Text fontSize="md" lineHeight="tall">
                This tool helps you explore and define complex terms like "DEMOCRACY" in the context of culture and climate change.
              </Text>
              <Text fontSize="md" lineHeight="tall">
                1. Use the <Text as="span" fontWeight="bold">arrow buttons</Text> beneath each of the three cards (TYPE/CATEGORY, KEY ATTRIBUTES, IMPACT/PURPOSE) to cycle through different options.
              </Text>
              <Text fontSize="md" lineHeight="tall">
                2. Press the <Text as="span" fontWeight="bold">shuffle button</Text> (dice icon) on the left to get a random combination of card options.
              </Text>
              <Text fontSize="md" lineHeight="tall">
                3. Once you're satisfied with a combination, click the <Text as="span" fontWeight="bold">save button</Text> (disk icon) on the right to add your new definition to the list below.
              </Text>
              <Text fontSize="md" lineHeight="tall">
                You can browse and search through all saved definitions at the bottom of the page.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor="gray.200">
            <Button 
              bg="blue.500" 
              color="white" 
              onClick={onCloseHelpModal} 
              _hover={{ bg: "blue.600" }}
              _focus={{ boxShadow: "outline" }}
              px={6}
            >
              Got it!
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default App;
