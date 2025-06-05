import { useState, useEffect, useRef } from 'react';
import { Box, Heading, Flex, Text, Button, VStack, HStack, Spacer, IconButton, InputGroup, InputLeftElement, Input, Divider, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure, Textarea, Image as ChakraImage, Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverCloseButton, PopoverHeader, PopoverBody, Menu, MenuButton, MenuList, MenuItem, Circle, Progress } from '@chakra-ui/react';
// Import Feather Icons
import { HelpCircle, Menu as MenuIconFeather, ChevronLeft, ChevronRight, Shuffle, Save, ChevronUp, Plus, ChevronDown, Search, MessageSquare, Link, ThumbsUp, Copy, Type, Edit3, Mic, Image, X, Check, Trash2, StopCircle, Upload, AlignCenter } from 'react-feather';
// Remove or comment out Chakra UI icons if no longer needed, or keep if some are still used elsewhere
// import { ChevronLeftIcon, ChevronRightIcon, QuestionOutlineIcon, HamburgerIcon, AddIcon, ChevronUpIcon, ChevronDownIcon, /* ExternalLinkIcon, */ CopyIcon, SearchIcon, TriangleDownIcon, ChatIcon, LinkIcon, StarIcon, RepeatIcon } from '@chakra-ui/icons';
import { db } from './firebase/firebaseConfig'; // Import db
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'; // Import Firestore functions (ensure updateDoc is here)
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Firebase Storage
import type { px } from 'framer-motion';
import imageCompression from 'browser-image-compression';

// --- Data Types (good practice to define shapes) ---
interface CardOptionValue {
  type: 'text' | 'drawing' | 'audio' | 'image';
  content: string; // Text content, base64 data URL for drawing/image, or audio file URL/reference
  waveformData?: number[]; // Optional: pre-computed waveform data for audio
  id?: string; // Optional unique ID for options, useful for keys and comparisons
}

interface Definition {
  id?: string; // Optional: will be assigned by Firestore
  typeCategory: CardOptionValue;
  keyAttributes: CardOptionValue;
  impactPurpose: CardOptionValue;
  term?: string; // Added term to Definition type
  createdAt?: any; // For Firestore serverTimestamp
  likes?: number; // Added for popular sorting
}

interface TermData {
  term: string;
  etymology?: string; // Changed from EtymologyData to string
  defaultDefinition: {
    typeCategory: CardOptionValue;
    keyAttributes: CardOptionValue;
    impactPurpose: CardOptionValue;
  };
}

// --- Initial Hardcoded Options (will be replaced by Firestore data) ---
// const initialTypeCategoryOptions: CardOption[] = [ ... ]; // Remove or keep for fallback
// const initialKeyAttributesOptions: CardOption[] = [ ... ];
// const initialImpactPurposeOptions: CardOption[] = [ ... ];

const defaultTextOption: CardOptionValue = { type: 'text', content: 'Loading...', id: 'loading-default' };

const allTermsData: TermData[] = [
  {
    term: "ASSEMBLY",
    etymology: "The word assembly comes from Old French '''assemblee''' (\'gathering\'), ultimately from Latin '''assimulare''' (\'to gather together\').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Collection of people, representative group of citizens', id: 'default-assembly-type' },
      keyAttributes: { type: 'text', content: 'Gathered together for a common purpose', id: 'default-assembly-attributes' },
      impactPurpose: { type: 'text', content: 'Not specified.', id: 'default-assembly-impact' }
    }
  },
  {
    term: "ASSEMBLY MEMBERS",
    etymology: "Assembly members combines 'assembly' (from Latin '''assimulare''', 'to gather') with 'member' (from Latin '''membrum''', 'part of a group').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Participants of a citizens\' assembly', id: 'default-assemblymembers-type' },
      keyAttributes: { type: 'text', content: 'Randomly selected members of the public representative of a population of the subject area', id: 'default-assemblymembers-attributes' },
      impactPurpose: { type: 'text', content: 'Legitimise the decision making process', id: 'default-assemblymembers-impact' }
    }
  },
  {
    term: "CITIZEN JURIES",
    etymology: "Citizen juries combines 'citizen' (from Latin '''civis''', 'citizen') with 'jury' (from Latin '''iurare''', 'to swear', referring to a sworn body).",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Deliberative Mini-Public', id: 'default-citizenjuries-type' },
      keyAttributes: { type: 'text', content: 'Typically comprise 10 to 35 randomly selected citizens to learn about, deliberate on and make decisions about a topic', id: 'default-citizenjuries-attributes' },
      impactPurpose: { type: 'text', content: 'Legitimise and provide knowledge for policy making', id: 'default-citizenjuries-impact' }
    }
  },
  {
    term: "CITIZENS",
    etymology: "The word citizen comes from Anglo-French '''citezein''' (\'city-dweller\'), ultimately from Latin '''civis''' (\'citizen\').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Members of the public', id: 'default-citizens-type' },
      keyAttributes: { type: 'text', content: 'Live within a subject area', id: 'default-citizens-attributes' },
      impactPurpose: { type: 'text', content: 'Not specified.', id: 'default-citizens-impact' }
    }
  },
  {
    term: "CLIMATE ASSEMBLY",
    etymology: "Climate assembly combines 'climate' (from Greek '''klima''', 'region' or 'zone') with 'assembly' (from Latin '''assimulare''', 'to gather together').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Deliberative Mini-Public', id: 'default-climateassembly-type' },
      keyAttributes: { type: 'text', content: 'Typically comprise 50 to 150 randomly selected citizens to learn about, deliberate on and make decisions about a topic', id: 'default-climateassembly-attributes' },
      impactPurpose: { type: 'text', content: 'Legitimise and provide knowledge for policy making', id: 'default-climateassembly-impact' }
    }
  },
  {
    term: "DELIBERATION",
    etymology: "The word deliberation comes from Latin '''deliberare''' (\'to weigh well\'), from '''de-''' (\'entirely\') and '''librare''' (\'to balance,\' from '''libra''', \'scales\').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'An approach to decision making', id: 'default-deliberation-type' },
      keyAttributes: { type: 'text', content: 'Participants justify what they want with reasons and listen to each other\'s justifications respectfully and with an open mind', id: 'default-deliberation-attributes' },
      impactPurpose: { type: 'text', content: 'Enable inclusive and reasoned decision making that respects and includes a variety of voices and perspectives to be heard', id: 'default-deliberation-impact' }
    }
  },
  {
    term: "DELIBERATIVE MINI-PUBLICS",
    etymology: "Combines 'deliberative' (Latin '''deliberare''', 'to weigh well'), 'mini' (from Latin '''minium''', associated with smallness), and 'publics' (Latin '''publicus''', 'of the people').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Democratic innovation', id: 'default-deliberativeminipublics-type' },
      keyAttributes: { type: 'text', content: 'Involves randomly selected citizens to learn about, deliberate on and make decisions about a topic', id: 'default-deliberativeminipublics-attributes' },
      impactPurpose: { type: 'text', content: 'Legitimise and provide knowledge for policy making', id: 'default-deliberativeminipublics-impact' }
    }
  },
  {
    term: "DEMOCRACY",
    etymology: "The word democracy comes from the Greek demokratia, meaning 'rule by the people', from demos ('people') and kratos ('power').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'System of governance', id: 'default-democracy-type' },
      keyAttributes: { type: 'text', content: 'Enables some degree of public engagement. There are different models of democracy, ranging from engaging citizens in elections of representative politicians to deeper participatory and deliberative models ( e.g. participatory budgeting and deliberative mini-publics)', id: 'default-democracy-attributes' },
      impactPurpose: { type: 'text', content: 'Improve and legitimise decision making', id: 'default-democracy-impact' }
    }
  },
  {
    term: "EVIDENCE",
    etymology: "The word evidence comes from Latin '''evidens''' (\'obvious, apparent\'), from '''ex-''' (\'out, fully\') and '''videre''' (\'to see\').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Information presented in a deliberation', id: 'default-evidence-type' },
      keyAttributes: { type: 'text', content: 'Information that supports or challenges a claim based on facts, observations, expert opinions or personal experience ', id: 'default-evidence-attributes' },
      impactPurpose: { type: 'text', content: 'Enable informed deliberation and decision making', id: 'default-evidence-impact' }
    }
  },
  {
    term: "EXPERTS",
    etymology: "The word expert comes from Latin '''experiri''' (\'to try, test\'), meaning one who is \'known by experience\'.",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Individuals with specialized knowledge or skills', id: 'default-experts-type' },
      keyAttributes: { type: 'text', content: 'Possess in-depth understanding, proficiency, or authority in a particular subject, field, or domain, often gained through extensive study, training, or practical experience', id: 'default-experts-attributes' },
      impactPurpose: { type: 'text', content: 'Not specified.', id: 'default-experts-impact' }
    },
  },
  {
    term: "GOVERNING BODY",
    etymology: "Governing body combines 'governing' (from Latin '''gubernare''', 'to rule') with 'body' (from Old English '''bodig''', 'a collective group').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Organisation or people that make decisions about the design and implementation of a deliberative mini-public', id: 'default-governancegoverningbody-type' },
      keyAttributes: { type: 'text', content: 'Typically have expertise in the topic or participatory and deliberative methods', id: 'default-governancegoverningbody-attributes' },
      impactPurpose: { type: 'text', content: 'Ensure the design and implementation of the process adheres to best practice and fulfils the remit set by the commissioning organisation', id: 'default-governancegoverningbody-impact' }
    }
  },
  {
    term: "PARTICIPATION",
    etymology: "The word participation comes from Latin '''participare''' (\'to share in, partake of\'), from '''pars''' (\'part\') and '''capere''' (\'to take\').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'An approach to governance', id: 'default-participation-type' },
      keyAttributes: { type: 'text', content: 'Enables citizens to individually or collectively contribute to decision making', id: 'default-participation-attributes' },
      impactPurpose: { type: 'text', content: 'Improve and legitimise decision making', id: 'default-participation-impact' }
    }
  },
  {
    term: "POLICY",
    etymology: "The word policy comes from Greek '''politeia''' (\'state, administration\'), via Latin '''politia''' and Old French '''policie'''.",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Tool of governence', id: 'default-policy-type' },
      keyAttributes: { type: 'text', content: 'Sets out the strategic direction of the governing body', id: 'default-policy-attributes' },
      impactPurpose: { type: 'text', content: 'Communicate vision and guide action', id: 'default-policy-impact' }
    }
  },
  {
    term: "POLITICS",
    etymology: "The word politics derives from Greek '''politikos''' (\'of citizens, of the state\'), from '''polis''' (\'city\'), influenced by Aristotle\'s '''ta politika'''.",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Activities associated with group decisions', id: 'default-politics-type' },
      keyAttributes: { type: 'text', content: 'Involves the process of making decisions that apply to members of a group, including the distribution of resources or status and the exercise of power', id: 'default-politics-attributes' },
      impactPurpose: { type: 'text', content: 'Prioritise competing interests and enable decisions to be made', id: 'default-politics-impact' }
    }
  },
  {
    term: "POST ASSEMBLY",
    etymology: "Post assembly combines 'post-' (Latin *post*, 'after') with 'assembly' (Latin *assimulare*, 'to gather together'), meaning 'after the gathering'.",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Stage / phase of a citizens\' assembly process', id: 'default-postassembly-type' },
      keyAttributes: { type: 'text', content: 'Translation of outputs into policy and action', id: 'default-postassembly-attributes' },
      impactPurpose: { type: 'text', content: 'Not specified.', id: 'default-postassembly-impact' }
    }
  },
  {
    term: "RECOMMENDATIONS",
    etymology: "The word recommendation derives from Latin *recommendare* ('to commend, entrust'), from *re-* ('again' or intensive) and *commendare* ('to entrust').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Output from a deliberative mini-public', id: 'default-recommendations-type' },
      keyAttributes: { type: 'text', content: 'Summarise the key decisions made by the assembly members', id: 'default-recommendations-attributes' },
      impactPurpose: { type: 'text', content: 'Inform policy makers of an assembly\'s decisions and proposals for policy implementation', id: 'default-recommendations-impact' }
    }
  },
  {
    term: "SORTITION",
    etymology: "The word sortition comes from Latin *sortiri* ('to draw lots'), from *sors* ('lot, share, or portion').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Recruitment strategy', id: 'default-sortition-type' },
      keyAttributes: { type: 'text', content: 'Uses random stratified sampling to identify and select a representative sample of the population', id: 'default-sortition-attributes' },
      impactPurpose: { type: 'text', content: 'Ensure the assembly members represent the population in terms of key demographics', id: 'default-sortition-impact' }
    }
  },
  {
    term: "FACILITATION",
    etymology: "The word facilitation derives from Latin '''facilis''' (\'easy to do\'), which comes from '''facere''' (\'to do or make\').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Guidance of group processes', id: 'default-facilitation-type' },
      keyAttributes: { type: 'text', content: 'Helping a group to have effective discussions, make decisions, and achieve its goals through structured activities and neutral guidance', id: 'default-facilitation-attributes' },
      impactPurpose: { type: 'text', content: 'Not specified.', id: 'default-facilitation-impact' }
    }
  },
  {
    term: "IMPACT",
    etymology: "The word impact comes from Latin '''impingere''' (\'to push into, strike against\'), from '''in-''' (\'into\') and '''pangere''' (\'to fasten, fix\').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Effect or influence of an action or decision', id: 'default-impact-type' },
      keyAttributes: { type: 'text', content: 'The measurable or observable consequences resulting from policies, programs, or interventions, often assessed in terms of social, economic, or environmental changes', id: 'default-impact-attributes' },
      impactPurpose: { type: 'text', content: 'Not specified.', id: 'default-impact-impact' }
    },
  },
  {
    term: "IMPLEMENTATION",
    etymology: "The word implementation derives from Latin '''implere''' (\'to fill up, fulfill\'), via '''implementum''' (\'a filling up\').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Process of putting decisions and plans into effect', id: 'default-implementation-type' },
      keyAttributes: { type: 'text', content: 'Involves the practical steps taken to execute policies, programs, or projects, including resource allocation, coordination, and monitoring to achieve desired outcomes', id: 'default-implementation-attributes' },
      impactPurpose: { type: 'text', content: 'Not specified.', id: 'default-implementation-impact' }
    },
  },
  {
    term: "INCLUSION",
    etymology: "The word inclusion comes from Latin '''includere''' (\'to shut in, enclose\'), from '''in-''' (\'in\') and '''claudere''' (\'to shut\').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Ensuring diverse participation and belonging', id: 'default-inclusion-type' },
      keyAttributes: { type: 'text', content: 'Actively involving individuals from all backgrounds, identities, and perspectives, creating an environment where everyone feels valued, respected, and able to contribute fully', id: 'default-inclusion-attributes' },
      impactPurpose: { type: 'text', content: 'Not specified.', id: 'default-inclusion-impact' }
    }
  },
  {
    term: "INFORMATION",
    etymology: "The word information comes from Latin '''informare''' (\'to shape, give form to; to train, instruct\').",
    defaultDefinition: {
      typeCategory: { type: 'text', content: 'Knowledge, facts, or data', id: 'default-information-type' },
      keyAttributes: { type: 'text', content: 'Communicated or received concerning a particular subject, typically gathered, processed, and used to understand, decide, or act', id: 'default-information-attributes' },
      impactPurpose: { type: 'text', content: 'Not specified.', id: 'default-information-impact' }
    },
  },
];

const storage = getStorage(); // Initialize Firebase Storage

// Find the initial index for "DEMOCRACY"
const initialTermIdentifier = "DEMOCRACY";
const initialTermIndex = Math.max(0, allTermsData.findIndex(termData => termData.term === initialTermIdentifier));

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input
  const [isDrawing, setIsDrawing] = useState(false);
  // const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null); // Will be stored in newOptionContent.content

  // --- State for current term ---
  const [currentTermIdx, setCurrentTermIdx] = useState<number>(initialTermIndex);
  const currentTermData = allTermsData[currentTermIdx];
  const currentTerm = currentTermData.term;
  const currentEtymology = currentTermData.etymology;


  // --- State for currently selected card content ---
  const [selectedTypeCategory, setSelectedTypeCategory] = useState<CardOptionValue>(currentTermData.defaultDefinition.typeCategory);
  const [selectedKeyAttributes, setSelectedKeyAttributes] = useState<CardOptionValue>(currentTermData.defaultDefinition.keyAttributes);
  const [selectedImpactPurpose, setSelectedImpactPurpose] = useState<CardOptionValue>(currentTermData.defaultDefinition.impactPurpose);

  // --- State for the list of available options (currently hardcoded) ---
  // In a real app, these would be fetched and could be more complex objects
  const [typeCategoryOptions, setTypeCategoryOptions] = useState<CardOptionValue[]>([]);
  const [keyAttributesOptions, setKeyAttributesOptions] = useState<CardOptionValue[]>([]);
  const [impactPurposeOptions, setImpactPurposeOptions] = useState<CardOptionValue[]>([]);

  // --- State for saved definitions (will come from Firestore) ---
  const [savedDefinitions, setSavedDefinitions] = useState<Definition[]>([]);
  const [searchQuery, setSearchQuery] = useState(""); // State for the search query
  const [sortOrder, setSortOrder] = useState<'recent' | 'popular' | 'random'>('recent'); // State for sorting

  // Modal disclosure hook
  const { isOpen: isHelpModalOpen, onOpen: onOpenHelpModal, onClose: onCloseHelpModal } = useDisclosure();
  const { isOpen: isEtymologyPopoverOpen, onOpen: onOpenEtymologyPopover, onClose: onCloseEtymologyPopover, onToggle: onToggleEtymologyPopover } = useDisclosure(); // Ensure onToggle is here

  // --- State for adding new card options ---
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  // const [newOptionText, setNewOptionText] = useState<string>(""); // REPLACED by newOptionContent
  const [newOptionContent, setNewOptionContent] = useState<CardOptionValue>({ type: 'text', content: '' });
  const [activeInputMode, setActiveInputMode] = useState<'text' | 'drawing' | 'voice' | 'image'>('text');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Image Upload State
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [hasDrawnOnCanvas, setHasDrawnOnCanvas] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0); // New state for upload progress

  // Playback waveform states and refs
  const [playbackWaveformData, setPlaybackWaveformData] = useState<number[] | null>(null);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const playbackAudioRef = useRef<HTMLAudioElement>(null);
  const playbackWaveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const MAX_RECORDING_TIME = 30; // 30 seconds

  // --- Placeholder for current term ---
  // const currentTerm = "DEMOCRACY"; // Replaced by dynamic currentTerm

  // Term navigation handlers
  const handlePreviousTerm = () => {
    setCurrentTermIdx((prevIndex) => (prevIndex - 1 + allTermsData.length) % allTermsData.length);
  };

  const handleNextTerm = () => {
    setCurrentTermIdx((prevIndex) => (prevIndex + 1) % allTermsData.length);
  };

  // Effect to update selected definitions when the term changes
  useEffect(() => {
    const newTermData = allTermsData[currentTermIdx];
    setSelectedTypeCategory(newTermData.defaultDefinition.typeCategory);
    setSelectedKeyAttributes(newTermData.defaultDefinition.keyAttributes);
    setSelectedImpactPurpose(newTermData.defaultDefinition.impactPurpose);
    // Close etymology popover when term changes, if it was open
    if (isEtymologyPopoverOpen) {
      onCloseEtymologyPopover();
    }
  }, [currentTermIdx]); // MODIFIED Dependency Array

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

  // Moved processAudioBufferToWaveform to be a general helper
  const processAudioBufferToWaveformGlobal = async (audioBlobOrUrl: Blob | string, audioCtx: AudioContext, points: number = 100): Promise<number[]> => {
    let audioBlob: Blob;
    if (typeof audioBlobOrUrl === 'string') {
      const response = await fetch(audioBlobOrUrl);
      if (!response.ok) throw new Error('Failed to fetch audio blob from URL in global helper');
      audioBlob = await response.blob();
    } else {
      audioBlob = audioBlobOrUrl;
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const rawData = audioBuffer.getChannelData(0);
      if (rawData.length === 0) return [];
      const samples = Math.max(1, Math.floor(rawData.length / points));
      const waveformData: number[] = [];
      for (let i = 0; i < points; i++) {
        let blockStart = Math.floor(i * samples);
        let sum = 0;
        let count = 0;
        for (let j = 0; j < samples; j++) {
          if (blockStart + j < rawData.length) {
            sum += Math.abs(rawData[blockStart + j]);
            count++;
          }
        }
        waveformData.push(count > 0 ? sum / count : 0);
      }
      const maxVal = Math.max(...waveformData);
      if (maxVal > 0) {
        return waveformData.map(val => val / maxVal);
      }
      return waveformData;
    } catch (error) {
      console.error("Error decoding audio data in global helper:", error);
      return [];
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHasDrawnOnCanvas(false); // Reset drawing state
      }
    }
  };

  const stopRecordingAndClearAudioState = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); // This will trigger onstop
    }
    setAudioURL(null);
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const liveWaveformCanvas = waveformCanvasRef.current;
    if (liveWaveformCanvas) {
      const context = liveWaveformCanvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, liveWaveformCanvas.width, liveWaveformCanvas.height);
      }
    }
    setPlaybackWaveformData(null);
  };

  const handleChangeInputMode = (newMode: 'text' | 'drawing' | 'voice' | 'image') => {
    clearCanvas();
    stopRecordingAndClearAudioState();
    setImagePreviewUrl(null);
    setSelectedImageFile(null);

    if (newMode === 'text') {
      setNewOptionContent({ type: 'text', content: '' });
    } else if (newMode === 'drawing') {
      setNewOptionContent({ type: 'drawing', content: '' });
    } else if (newMode === 'voice') { // User conceptual mode 'voice'
      setNewOptionContent({ type: 'audio', content: '' }); // Actual data type 'audio'
    } else if (newMode === 'image') {
      setNewOptionContent({ type: 'image', content: '' });
    }
    setActiveInputMode(newMode);
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
          createdAt: data.createdAt,
          likes: data.likes || 0 // Ensure likes is initialized
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
      createdAt: serverTimestamp(),
      likes: 0 // Initialize likes to 0 on new definition
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
    setAudioURL(null); // Reset audio URL when opening
    setIsRecording(false); // Reset recording state
    setRecordingTime(0); // Reset recording time
    setImagePreviewUrl(null); // Reset image preview
    setSelectedImageFile(null); // Reset selected image file
    setHasDrawnOnCanvas(false); // Reset drawing state
  };

  const handleCloseInputInterface = () => {
    setEditingCategory(null);
    setNewOptionContent({ type: 'text', content: '' });
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") { // More robust check
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setAudioURL(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
    setImagePreviewUrl(null);
    setSelectedImageFile(null);
    setHasDrawnOnCanvas(false); // Reset drawing state

    if (canvasRef.current) { // Clear canvas on close
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const canvas = waveformCanvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Reset playback waveform state
    setPlaybackWaveformData(null);
    setIsPlaybackPlaying(false);
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current.currentTime = 0;
    }
  };

  const handleSaveNewOption = async () => {
    if (!editingCategory) return;
    let finalOptionToSave = { ...newOptionContent };

    if (activeInputMode === 'drawing' && canvasRef.current) {
      const drawingURL = canvasRef.current.toDataURL('image/png');
      finalOptionToSave = { type: 'drawing', content: drawingURL };
    } else if (activeInputMode === 'image') {
      console.log("Saving image. newOptionContent:", JSON.stringify(newOptionContent)); // Logging newOptionContent
      if (!imagePreviewUrl || !newOptionContent.content) { 
        console.error("Image preview URL or content missing.");
        handleCloseInputInterface();
        return;
      }
      if (newOptionContent.type === 'image' && newOptionContent.content) {
        finalOptionToSave = { type: 'image', content: newOptionContent.content };
        console.log("Final image option to save:", JSON.stringify(finalOptionToSave));
      } else {
        console.error("Image content not ready or type mismatch for saving. newOptionContent.type:", newOptionContent.type);
        handleCloseInputInterface();
        return;
      }
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
        // Firestore expects plain objects, include waveformData if present
        const optionsToStore = updatedOptions.map(opt => {
          const optionData: any = { type: opt.type, content: opt.content, id: opt.id };
          if (opt.waveformData) {
            optionData.waveformData = opt.waveformData;
          }
          return optionData;
        }); 
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

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setUploadProgress(0); // Reset progress at the start

      const compressionOptions = {
        maxSizeMB: 0.15, // Reduced target size to 150KB
        maxWidthOrHeight: 1024, // Reduced max dimensions
        useWebWorker: true,
        onProgress: (progress: number) => {
          setUploadProgress(progress);
        },
      };

      try {
        // Simulate a slight delay before compression starts to make progress bar appear if compression is too fast
        // await new Promise(resolve => setTimeout(resolve, 100)); 
        setUploadProgress(1); // Show progress bar immediately

        const compressedFile = await imageCompression(file, compressionOptions);
        setUploadProgress(100); // Mark compression as complete

        // Create a FileReader to get base64 for cropping
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              console.error("Failed to get canvas context for cropping.");
              // Fallback to compressed but uncropped image
              setImagePreviewUrl(img.src); 
              setNewOptionContent({ type: 'image', content: img.src });
              setSelectedImageFile(compressedFile); 
              return;
            }

            // Calculate square crop dimensions
            let sourceX, sourceY, sourceWidth, sourceHeight;
            if (img.width > img.height) {
              sourceWidth = img.height;
              sourceHeight = img.height;
              sourceX = (img.width - img.height) / 2;
              sourceY = 0;
            } else {
              sourceWidth = img.width;
              sourceHeight = img.width;
              sourceX = 0;
              sourceY = (img.height - img.width) / 2;
            }

            canvas.width = sourceWidth; // Make canvas square
            canvas.height = sourceHeight;

            // Draw the cropped image onto the canvas
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);

            const croppedDataUrl = canvas.toDataURL(file.type); // Use original file type

            setImagePreviewUrl(croppedDataUrl);
            setNewOptionContent({ type: 'image', content: croppedDataUrl });
            // We can create a new File object from the data URL if needed for selectedImageFile
            // For now, keeping selectedImageFile as the compressed (but not necessarily cropped) version
            // or convert croppedDataUrl back to a Blob/File if strict File type is needed for `selectedImageFile` elsewhere.
            // For simplicity, let selectedImageFile remain the compressed one.
            setSelectedImageFile(compressedFile); 

          };
          img.onerror = () => {
            console.error("Error loading image for cropping.");
            setUploadProgress(0); // Reset on error
             // Fallback to compressed but uncropped image
            const errorReader = new FileReader();
            errorReader.onloadend = () => {
                setImagePreviewUrl(errorReader.result as string);
                setNewOptionContent({ type: 'image', content: errorReader.result as string });
            }
            errorReader.readAsDataURL(compressedFile);
            setSelectedImageFile(compressedFile); 
          }
          if (e.target?.result) {
            img.src = e.target.result as string; // Set src for the image object to load
          } else {
            setUploadProgress(0); // Reset on error
            // Fallback to original compressed file if reader result is null
            const fallbackReader = new FileReader();
            fallbackReader.onloadend = () => {
                setImagePreviewUrl(fallbackReader.result as string);
                setNewOptionContent({ type: 'image', content: fallbackReader.result as string });
            }
            fallbackReader.readAsDataURL(compressedFile);
            setSelectedImageFile(compressedFile);
          }
        };
        reader.onerror = () => {
             console.error("Error reading file for cropping.");
             setUploadProgress(0); // Reset on error
             // Fallback to compressed but uncropped image
            const errorReader = new FileReader();
            errorReader.onloadend = () => {
                setImagePreviewUrl(errorReader.result as string);
                setNewOptionContent({ type: 'image', content: errorReader.result as string });
            }
            errorReader.readAsDataURL(compressedFile);
            setSelectedImageFile(compressedFile); 
        }
        reader.readAsDataURL(compressedFile); // Read the compressed file

      } catch (error) {
        console.error('Error compressing or processing image:', error);
        setUploadProgress(0); // Reset on error
        // Fallback to original file if compression fails
        const fallbackReader = new FileReader();
        fallbackReader.onloadend = () => {
            setImagePreviewUrl(fallbackReader.result as string);
            setNewOptionContent({ type: 'image', content: fallbackReader.result as string });
        }
        fallbackReader.readAsDataURL(file); // Read original file
        setSelectedImageFile(file);
      }
    } else {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setNewOptionContent({ type: 'image', content: '' });
      setUploadProgress(0); // Also reset if no file is selected or selection is cancelled
    }
  };

  // --- Drawing Canvas Handlers ---
  useEffect(() => { // Setup canvas when it becomes available and input mode is drawing
    if (editingCategory && activeInputMode === 'drawing' && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        // Get the actual display size of the canvas element after CSS rendering.
        // This is crucial to prevent stretching or distortion.
        const newWidth = canvas.clientWidth;
        const newHeight = canvas.clientHeight;

        // Only update if dimensions are valid and have potentially changed.
        if (newWidth > 0 && newHeight > 0 && (canvas.width !== newWidth || canvas.height !== newHeight)) {
          canvas.width = newWidth;
          canvas.height = newHeight;
        }

        // Set drawing styles
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.lineCap = 'round';

        // Clear the canvas when it's (re)initialized for drawing or its size changes.
        // This prevents old content from appearing if, for example, the user switches
        // from text to drawing, or if a resize occurred.
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [editingCategory, activeInputMode, selectedTypeCategory, selectedKeyAttributes, selectedImpactPurpose]); // Added selected options to deps in case card visibility/layout changes

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeInputMode !== 'drawing') return;
    const { offsetX, offsetY } = nativeEvent;
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      context.beginPath();
      context.moveTo(offsetX, offsetY);
      setIsDrawing(true);
      setHasDrawnOnCanvas(true); // User has started drawing
    }
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeInputMode !== 'drawing' || !isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      context.lineTo(offsetX, offsetY);
      context.stroke();
    }
  };

  const endDrawing = () => {
    if (activeInputMode !== 'drawing') {
      if (isDrawing) setIsDrawing(false); // Ensure isDrawing is false if mode changed unexpectedly
      return;
    }
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      context.closePath();
    }
    setIsDrawing(false);
    // const dataUrl = canvasRef.current?.toDataURL('image/png');
    // setNewOptionContent({ type: 'drawing', content: dataUrl || '' }); // Save on end, or on save button click?
  };
  


  // --- Audio Recording Handlers ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setAudioURL(null);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        stream.getTracks().forEach(track => track.stop()); // Stop tracks early

        let downloadURLForOption: string | null = null;
        let waveDataForOption: number[] | null = null;

        // --- Upload to Firebase Storage --- 
        const audioFileName = `audio/${new Date().getTime()}-${Math.random().toString(36).substring(2, 15)}.wav`;
        const audioFileRef = storageRef(storage, audioFileName);

        try {
          const uploadTask = uploadBytesResumable(audioFileRef, audioBlob);
          await new Promise<void>((resolve, reject) => { // Wrap in promise to await completion
            uploadTask.on('state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Audio upload is ' + progress + '% done');
              },
              (uploadError) => { // Renamed error to uploadError to avoid conflict
                console.error("Audio upload error:", uploadError);
                const localAudioUrl = URL.createObjectURL(audioBlob); 
                setAudioURL(localAudioUrl); // Fallback for preview with local blob URL
                // setNewOptionContent({ type: 'audio', content: '' }); // Mark as not persistently saved - Handled later
                reject(uploadError);
              },
              async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                console.log('File available at', downloadURL);
                setAudioURL(downloadURL); // For immediate preview with the persistent URL
                downloadURLForOption = downloadURL; // Store for use after waveform processing
                resolve();
              }
            );
          });
        } catch (initError) { // Renamed error to initError
          console.error("Error during audio upload promise:", initError);
          const localAudioUrl = URL.createObjectURL(audioBlob); 
          setAudioURL(localAudioUrl); // Fallback for preview
          // setNewOptionContent({ type: 'audio', content: '' }); // Handled below
        }
        
        // --- Process for immediate playback waveform preview --- 
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const currentAudioContext = audioContextRef.current;
        try {
          // Use the global helper, passing the audioBlob and the context
          const waveData = await processAudioBufferToWaveformGlobal(audioBlob, currentAudioContext, 100); 
          setPlaybackWaveformData(waveData);
          waveDataForOption = waveData; // Store for use in setNewOptionContent
        } catch (e) {
          console.error("Error processing audio for waveform preview:", e);
          setPlaybackWaveformData(null);
        }

        // Now set newOptionContent with both URL and waveform data
        if (downloadURLForOption && waveDataForOption) {
          setNewOptionContent({ type: 'audio', content: downloadURLForOption, waveformData: waveDataForOption });
        } else if (downloadURLForOption) { // If waveform failed but URL succeeded
          setNewOptionContent({ type: 'audio', content: downloadURLForOption });
        } else { // If upload failed
          setNewOptionContent({ type: 'audio', content: '', waveformData: [] }); // Mark as not persistently saved
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      drawFakeWaveform(); // Start drawing waveform

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prevTime => {
          if (prevTime >= MAX_RECORDING_TIME -1) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.stop();
            }
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            setIsRecording(false);
            return MAX_RECORDING_TIME;
          }
          return prevTime + 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      // Handle permission denial or other errors
      alert("Microphone access denied or an error occurred.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    // setRecordingTime(0); // Keep recordingTime to show final duration, or reset. User preference.
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const canvas = waveformCanvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const drawFakeWaveform = () => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !isRecording) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "gray.300"; // Or any color you prefer for the bars

    const barWidth = 2;
    const spacing = 1;
    const numBars = Math.floor(width / (barWidth + spacing));

    for (let i = 0; i < numBars; i++) {
      const barHeight = Math.random() * height * 0.8 + height * 0.1; // Random height, min 10% max 90%
      const y = (height - barHeight) / 2;
      context.fillRect(i * (barWidth + spacing), y, barWidth, barHeight);
    }

    animationFrameRef.current = requestAnimationFrame(drawFakeWaveform);
  };

  // Effect to draw the playback waveform
  useEffect(() => {
    if (playbackWaveformData && playbackWaveformCanvasRef.current && audioURL) {
      const canvas = playbackWaveformCanvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Adjust canvas drawing resolution to its display size
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight; // Or a fixed height like 60 if preferred for drawing logic

      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.fillStyle = "gray.400"; // Waveform color (changed from gray.300 for better visibility if needed)

      const barWidth = width / playbackWaveformData.length;
      playbackWaveformData.forEach((val, i) => {
        const barHeight = val * height * 0.8 + height * 0.1; // Scale and offset
        const y = (height - barHeight) / 2;
        context.fillRect(i * barWidth, y, barWidth * 0.8, barHeight); // *0.8 for spacing
      });
    }
  }, [playbackWaveformData, audioURL, windowSize]); // Redraw when data, src, or windowSize changes

  // Effect to handle window resize for responsive canvas
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    // Call once initially to set size
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Render Input UI for Cards ---
  const renderCardInputInterface = (categoryPlaceholder: string) => (
    <VStack
      bg="white"
      p={"0px"} // Consistent padding, handled by inner elements
      borderRadius="30px"
      boxShadow="xl"
      w="340px" // Fixed width to match display cards
      h="340px" // Fixed height
      justifyContent="stretch"
      alignItems="stretch"
      spacing={0}
    >
      {activeInputMode === 'text' ? (
        <Textarea
          value={newOptionContent.type === 'text' ? newOptionContent.content : ''}
          onChange={(e) => setNewOptionContent({ type: 'text', content: e.target.value })}
          placeholder={`Enter new ${categoryPlaceholder}...`}
          _placeholder={{ fontSize: "16px", fontWeight: "medium", color: "gray.300" }}
          h="100%" // Fill padded area
          w="100%" // Fill padded area
          borderColor="white"
          borderWidth="0"      // User's preference
          borderRadius="30px"      // User's preference
          _focus={{ borderColor: "white", borderWidth: "0px", boxShadow: "black" }} // User's preference
          size="xl"
          resize="none"
          p="20px" // Internal padding for text content
          textTransform="none"
        />
      ) : ( // Drawing mode
        <Box
          h="100%" // Fill the non-padded VStack
          w="100%" // Fill the non-padded VStack
          display="flex"
          justifyContent="center"
          alignItems="center"
          borderWidth="0px"         // Drawing area is the surface
          borderRadius="30px"       // Match parent card for surface appearance
          overflow="hidden"
          position="relative" // Needed for absolute positioning of the text
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            style={{ touchAction: 'none', width: '100%', height: '100%' }}
          />
          {activeInputMode === 'drawing' && !hasDrawnOnCanvas && (
            <Flex
              position="absolute"
            
              left="0"
              right="0"
              justifyContent="center"
              alignItems="center"
              pointerEvents="none" // So it doesn't interfere with drawing
            >
              <Text fontSize="16px" fontWeight="medium" color="gray.300">
                Start drawing here
              </Text>
            </Flex>
          )}
        </Box>
      )}
      {activeInputMode === 'image' && (
        <Flex direction="column" h="100%" w="100%" alignItems="center" justifyContent="center" p={0} position="relative"> {/* p={4} changed to p={0} */}
          <Input 
            type="file" 
            accept="image/*" 
            onChange={handleImageFileChange} 
            ref={fileInputRef}
            style={{ display: 'none' }} 
          />
          {uploadProgress > 0 && uploadProgress < 100 && (
            <Box w="80%" position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)">
              <Progress value={uploadProgress} size="sm" colorScheme="pink" borderRadius="md" />
              <Text textAlign="center" mt={2} fontSize="sm" color="gray.500">Compressing: {uploadProgress}%</Text>
            </Box>
          )}

          {!(uploadProgress > 0 && uploadProgress < 100) && !imagePreviewUrl && (
            <VStack spacing={6} justifyContent="center" alignItems="center" flexGrow={1} w="100%" pb="94px">
              <IconButton
                aria-label="Upload image"
                icon={<Upload size={46} strokeWidth={1.5} />}// variant="ghost" removed from icon component
                onClick={() => fileInputRef.current?.click()}
                size="xl" // Maintained from user's previous adjustment
                variant="solid" // Ensuring a solid background treatment
                bg="whiteAlpha.300" // Background to match other tool buttons
                color="gray.300" // Icon color to match other tool buttons
                borderRadius="10px" // Border radius to match other tool buttons
                _hover={{ color: "black" }} // Hover state to match other tool buttons
                _active={{ color: "black" }} // Active state to match other tool buttons
                _focus={{ boxShadow: "none" }} // Focus state to match other tool buttons
              />
              <Text fontSize="16px" fontWeight="medium" color="gray.300" pt="4px">
                Select an image to upload
              </Text>
            </VStack>
          )}
          {/* Ensure image preview is hidden if progress bar is active and no image preview yet */}
          {imagePreviewUrl && !(uploadProgress > 0 && uploadProgress < 100) && (
             <ChakraImage 
              src={imagePreviewUrl} 
              alt="Selected preview" 
              w="100%" 
              h="100%" 
              objectFit="cover" 
              borderRadius="30px" 
            />
          )}
        </Flex>
      )}
      {activeInputMode === 'voice' && (
        <Flex direction="column" h="100%" w="100%" alignItems="center" justifyContent="center" position="relative">
          {audioURL ? (
            <Box h="200px" w="100%"> {/* Wrapper Box for centering, now with full width */}
              <canvas 
                ref={playbackWaveformCanvasRef} 
                width={10} // Small initial HTML width, JS will override
                height={60}  // Initial HTML height
                style={{ 
                  width: '100%', 
                  height: '60px', 
                  border: "0px solid #e2e8f0", 
                  borderRadius: "md",
                  cursor: 'pointer' // Indicate clickable
                }}
                onClick={() => {
                  if (playbackAudioRef.current) {
                    if (isPlaybackPlaying) {
                      playbackAudioRef.current.pause();
                    } else {
                      playbackAudioRef.current.play();
                    }
                  }
                }}
              />
              {/* IconButton removed */}
              <audio 
                ref={playbackAudioRef} 
                src={audioURL} 
                style={{ display: 'none' }}
                onPlay={() => setIsPlaybackPlaying(true)}
                onPause={() => setIsPlaybackPlaying(false)}
                onEnded={() => setIsPlaybackPlaying(false)}
              />
            </Box>
          ) : (
            <VStack spacing={3.5} justifyContent="center" alignItems="center" flexGrow={1} w="100%" p={4}>
              <IconButton
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                icon={isRecording ? <StopCircle size={35} /> : <Circle size="35px" bg="red.400" />}
                onClick={isRecording ? stopRecording : startRecording}
                isRound={true}
                bg={isRecording ? "red.400" : "white"} // IconButton background
                color={isRecording ? "white" : "red.500"} // Icon color for StopCircle, not used by Circle bg
                lineHeight="1" // Explicitly set lineHeight
                _hover={{
                  bg: isRecording ? "red.500" : "gray.300",
                }}
                boxShadow="md"
                _active={{ 
                  bg: isRecording ? "red.400" : "white", 
                  transform: 'scale(1.0)', 
                  boxShadow: "md", 
                  lineHeight: "1" 
                }}
              />
              <Box 
                minH="70px" 
                display="flex" 
                flexDirection="column" 
                justifyContent="center" 
                alignItems="center" 
                w="100%"
              >
                {isRecording && (
                  <canvas ref={waveformCanvasRef} width="200" height="50" style={{ marginTop: '44px' }}></canvas>
                )}
                {isRecording && (
                  <Text fontSize="16px" fontWeight="medium" color="gray.300" mt={1}>
                    Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </Text>
                )}
              </Box>
               {!isRecording && !audioURL && (
                <Text fontSize="16px" fontWeight="medium" color="gray.300" mt={2} pb="3px">Tap to record</Text>
              )}
            </VStack>
          )}
        </Flex>
      )}
    </VStack>
  );

  // --- Component to display card content (text or drawing) ---
  const CardContentDisplay = ({ option, displayContext = 'mainCard' }: { option: CardOptionValue, displayContext?: 'mainCard' | 'savedList' }) => {
    // State and refs for audio popover in savedList
    const [popoverWaveformData, setPopoverWaveformData] = useState<number[] | null>(null);
    const [isPopoverAudioPlaying, setIsPopoverAudioPlaying] = useState(false);
    const popoverAudioRef = useRef<HTMLAudioElement>(null);
    const popoverWaveformCanvasRef = useRef<HTMLCanvasElement>(null);
    const localAudioContextRef = useRef<AudioContext | null>(null); 

    // State and refs for audio display in mainCard
    const [mainCardWaveformData, setMainCardWaveformData] = useState<number[] | null>(null);
    const [isMainCardAudioPlaying, setIsMainCardAudioPlaying] = useState(false);
    const mainCardAudioRef = useRef<HTMLAudioElement>(null);
    const mainCardWaveformCanvasRef = useRef<HTMLCanvasElement>(null);
    // audioContextRef can be reused or a new one for mainCard if specific config is needed

    // Effect to load and process audio for popover in savedList
    useEffect(() => {
      let isActive = true;
      if (option.type === 'audio' && displayContext === 'savedList' && option.content) {
        // Check for pre-computed waveform data first
        if (option.waveformData && option.waveformData.length > 0) {
          if (isActive) setPopoverWaveformData(option.waveformData);
        } else if (!popoverWaveformData) { // Only process if not already set and no pre-computed data
          if (!localAudioContextRef.current) { // Ensure AudioContext for this instance
            localAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          processAudioBufferToWaveformGlobal(option.content, localAudioContextRef.current, 50).then(waveData => {
            if (isActive) setPopoverWaveformData(waveData);
          }).catch(error => {
            console.error("Error processing audio for popover waveform:", error);
            if (isActive) setPopoverWaveformData([]);
          });
        }
      }
      return () => { isActive = false };
    }, [option, displayContext, popoverWaveformData]);

    // Effect to load and process audio for mainCard
    useEffect(() => {
      let isActive = true;
      if (option.type === 'audio' && displayContext === 'mainCard' && option.content) {
        setIsMainCardAudioPlaying(false);
        if (mainCardAudioRef.current) mainCardAudioRef.current.currentTime = 0;

        // Check for pre-computed waveform data first
        if (option.waveformData && option.waveformData.length > 0) {
          if (isActive) setMainCardWaveformData(option.waveformData);
        } else {
          // No pre-computed data, or it's empty, so process it
          if (!audioContextRef.current) { // Use the global app AudioContext
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          processAudioBufferToWaveformGlobal(option.content, audioContextRef.current, 100).then(waveData => {
            if (isActive) setMainCardWaveformData(waveData);
          }).catch(error => {
            console.error("Error processing audio for main card waveform:", error);
            if (isActive) setMainCardWaveformData([]);
          });
        }
      }
      if (displayContext === 'mainCard' && (option.type !== 'audio' || !option.content)) {
        setMainCardWaveformData(null); // Clear waveform if not audio or no content
      }
      return () => { isActive = false };
    }, [option, displayContext]);

    // Effect to draw playback waveform in Popover (savedList)
    useEffect(() => {
      if (popoverWaveformData && popoverWaveformCanvasRef.current && displayContext === 'savedList' && option.type === 'audio') {
        const canvas = popoverWaveformCanvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = canvas.clientWidth;
        canvas.height = 40;
        const width = canvas.width;
        const height = canvas.height;
        context.clearRect(0, 0, width, height);
        context.fillStyle = "gray.500";
        if (popoverWaveformData.length > 0) {
          const barWidth = Math.max(1, width / popoverWaveformData.length);
          popoverWaveformData.forEach((val, i) => {
            const barHeight = val * height * 0.9 + height * 0.05;
            const x = i * barWidth;
            const y = (height - barHeight) / 2;
            context.fillRect(x, y, Math.max(1, barWidth * 0.7), barHeight);
          });
        }
      }
    }, [popoverWaveformData, option, displayContext, windowSize]); // Added windowSize

    // Effect to draw playback waveform in mainCard
    useEffect(() => {
      if (mainCardWaveformData && mainCardWaveformCanvasRef.current && displayContext === 'mainCard' && option.type === 'audio') {
        const canvas = mainCardWaveformCanvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight; // Use clientHeight for main card, or fixed like 60px
        const width = canvas.width;
        const height = canvas.height;
        context.clearRect(0, 0, width, height);
        context.fillStyle = "gray.400"; // Or your preferred color
        if (mainCardWaveformData.length > 0) {
          const barWidth = width / mainCardWaveformData.length;
          mainCardWaveformData.forEach((val, i) => {
            const barHeight = val * height * 0.8 + height * 0.1;
            const y = (height - barHeight) / 2;
            context.fillRect(i * barWidth, y, barWidth * 0.8, barHeight);
          });
        }
      }
    }, [mainCardWaveformData, option, displayContext, windowSize]); // Added windowSize

    if (!option || !option.type) {
      return <Text>Error: Invalid option</Text>; // Fallback for invalid data
    }

    if (option.type === 'drawing' || option.type === 'image') { // Handle image type similarly to drawing for display
      if (displayContext === 'savedList') {
        return (
          <Popover trigger="hover" placement="top">
            <PopoverTrigger>
              <IconButton 
                aria-label={option.type === 'drawing' ? "View drawing" : "View image"} 
                icon={<Edit3 size={18} />} // Using Edit3 icon for drawing/image in list for now
                variant="ghost"
                size="sm"
              />
            </PopoverTrigger>
            <PopoverContent boxShadow="lg" borderColor="gray.300">
              <PopoverArrow bg="white"/>
              <PopoverCloseButton />
              <PopoverHeader border="0" fontWeight="semibold">{option.type === 'drawing' ? "Drawing" : "Image"}</PopoverHeader>
              <PopoverBody p={2}> {/* Reduced padding for tighter fit */}
                <ChakraImage src={option.content} alt={option.type === 'drawing' ? "User drawing" : "User image"} maxW="200px" maxH="200px" objectFit="contain" />
              </PopoverBody>
            </PopoverContent>
          </Popover>
        );
      }
      // Default for mainCard or other contexts
      return <ChakraImage 
        src={option.content} 
        alt={option.type === 'drawing' ? "User drawing" : "User image"} 
        objectFit="cover" // Changed to cover for square cards
        w="100%" 
        h="100%" 
        borderRadius={option.type === 'image' || option.type === 'drawing' ? "32px" : "0px"}
        p={3} // Removed internal padding, image fills the square card
      />; 
    }

    if (option.type === 'audio') {
      if (displayContext === 'savedList') {
        return (
          <Popover trigger="hover" placement="top" isLazy>
            <PopoverTrigger>
              <IconButton
                aria-label="View audio"
                icon={<Mic size={18} />}
                variant="ghost"
                size="sm"
              />
            </PopoverTrigger>
            <PopoverContent boxShadow="lg" borderColor="gray.300" w="250px">
              <PopoverArrow bg="white" />
              <PopoverCloseButton />
              <PopoverHeader border="0" fontWeight="semibold">Audio Playback</PopoverHeader>
              <PopoverBody p={2}>
                <VStack spacing={2}>
                  <canvas
                    ref={popoverWaveformCanvasRef}
                    style={{ width: '100%', height: '40px', borderRadius: '4px', backgroundColor: 'gray.50' }}
                    width={200} // Initial base width, JS will override with clientWidth
                    height={40}   // Initial base height
                  />
                  <IconButton
                    aria-label={isPopoverAudioPlaying ? "Pause" : "Play"}
                    icon={isPopoverAudioPlaying ? <StopCircle size={20} /> : <ChevronRight size={20} />}
                    onClick={() => {
                      if (popoverAudioRef.current) {
                        if (isPopoverAudioPlaying) {
                          popoverAudioRef.current.pause();
                        } else {
                          popoverAudioRef.current.play();
                        }
                      }
                    }}
                    size="sm"
                  />
                  <audio
                    ref={popoverAudioRef}
                    src={option.content} // This is the blob URL
                    style={{ display: 'none' }}
                    onPlay={() => setIsPopoverAudioPlaying(true)}
                    onPause={() => setIsPopoverAudioPlaying(false)}
                    onEnded={() => setIsPopoverAudioPlaying(false)}
                  />
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        );
      } else { // Handles mainCard and any other contexts for audio
        return (
          <Box w="100%" p={3}> {/* Changed from VStack to Box w="100%" */}
            <canvas 
              ref={mainCardWaveformCanvasRef} 
              width={10} // Small initial HTML width
              height={60}  // Initial HTML height (can match CSS or be adjusted by clientHeight)
              style={{ 
                width: '100%', 
                height: '60px', // Fixed display height for main card waveform
                border: "0px solid #e2e8f0", 
                borderRadius: "md",
                cursor: 'pointer' // Indicate the waveform is clickable
              }}
              onClick={() => {
                if (mainCardAudioRef.current) {
                  if (isMainCardAudioPlaying) {
                    mainCardAudioRef.current.pause();
                  } else {
                    mainCardAudioRef.current.play();
                  }
                }
              }}
            />
            {/* IconButton removed */}
            <audio 
              ref={mainCardAudioRef} 
              src={option.content} // This is the blob URL for the selected option
              style={{ display: 'none' }}
              onPlay={() => setIsMainCardAudioPlaying(true)}
              onPause={() => setIsMainCardAudioPlaying(false)}
              onEnded={() => setIsMainCardAudioPlaying(false)}
            />
          </Box>
        );
      }
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
      <Flex // Wrap Text in Flex for vertical centering and height control
        h="100%"
        w="100%"
        alignItems="center"
        justifyContent="flex-start" // Keep text left-aligned
        p={6} // Add padding here for text content
        borderRadius="30px" // Match card borderRadius
      >
        <Text 
          fontSize="md" 
          textAlign="left" 
          fontWeight="medium" 
          lineHeight="1.3"
          whiteSpace="pre-wrap" // To respect newlines in text
          overflowWrap="break-word" // Added to prevent text overflow
        >
          {option.content || 'Loading...'}
        </Text>
      </Flex>
    );
  };

  // --- Render --- 
  return (
    <Box className="gradient-background" minHeight="100vh" w="100vw" pt={0} px={0} pb={8} color="gray.800">
      {isEtymologyPopoverOpen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.600"
          zIndex="overlay" // Chakra theme zIndex for overlays (typically 1400)
          onClick={onCloseEtymologyPopover} // Close popover when overlay is clicked
        />
      )}
      <VStack spacing={1} align="stretch" w="100%">
        {/* Header Section */}
        <Flex w="100%" alignItems="center" bg="whiteAlpha.300" p={4} pl={10} borderRadius="0" >
          <Heading as="h1" size="sm" color="black" fontWeight="medium"> 
            CULTURE & CLIMATE CHANGE
          </Heading>
          <Spacer />
          <HStack spacing={3} pr={7}>
            <IconButton aria-label="Help" icon={<HelpCircle size={23} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} onClick={onOpenHelpModal} />
            <IconButton aria-label="Menu" icon={<MenuIconFeather size={23} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} />
          </HStack>
        </Flex>

        {/* Term Display Section */}
        <VStack spacing={5} align="center" mt={10}>
          <Text fontSize="17px" color="white" letterSpacing="4px">[dɪˈmɒkrəsi]</Text> {/* This IPA might need to be dynamic too if terms change */}
          <HStack alignItems="center">
            <IconButton aria-label="Previous term" icon={<ChevronLeft size={23} strokeWidth={2.5} />} variant="ghost" color="black" bg="whiteAlpha.300" _hover={{ bg: "white" }} borderRadius="10px" onClick={handlePreviousTerm} mr="100px" />
            <Popover
              placement="top"
              gutter={-80}
              isOpen={isEtymologyPopoverOpen} // Controlled by isOpen
              // No trigger, onOpen, or onClose here
            >
              <PopoverTrigger>
                <Heading
                  as="h2"
                  size="xl"
                  fontWeight="regular"
                  color="black"
                  cursor="pointer"
                  _hover={{ color: "white", textDecoration: "none" }}
                  _focus={{ boxShadow: "none" }}
                  onClick={onToggleEtymologyPopover} // onClick uses onToggle
                  w="660px"
                  textAlign="center"
                >
                  {currentTerm}
                </Heading>
              </PopoverTrigger>
              <PopoverContent
                boxShadow="xl"
                borderColor="white" 
                borderRadius="30px" 
                p={4} 
                bg="white" 
                color="black" 
                _focus={{ boxShadow: "none" }}
                h="120px" // Preserving user's style
                w="578px" // Preserving user's style
                onClick={onCloseEtymologyPopover} // ADDED THIS LINE
              >
                {currentEtymology ? (
                  <>
                    {/* PopoverHeader removed */}
                    <PopoverBody 
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      h="100%" // Fill available space
                      fontWeight="medium" 
                      fontSize="16px" 
                      textAlign="center"
                      // pt={8} removed, flex handles vertical alignment
                    >
                      <Text>{currentEtymology}</Text>
                    </PopoverBody>
                  </>
                ) : (
                  <PopoverBody 
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    h="100%"
                    fontWeight="medium" 
                    fontSize="16px" 
                    textAlign="center"
                    // pt={8} removed
                  >
                    <Text>No etymology information available for this term.</Text>
                  </PopoverBody>
                )}
              </PopoverContent>
            </Popover>
            <IconButton aria-label="Next term" icon={<ChevronRight size={23} strokeWidth={2.5} />} variant="ghost"  bg="whiteAlpha.300" _hover={{ bg: "white" }} borderRadius="10px" onClick={handleNextTerm} ml="100px" />
          </HStack>
        </VStack>

        {/* Card Display Area */}
        <HStack spacing={10} w="100%" justify="center" mt={20} alignItems="center" px={8}>
          <Box minH="340px" display="flex" alignItems="center" justifyContent="center" pb={9} pl={3}>
            <IconButton borderRadius="10px" aria-label="Remix definition" icon={<Shuffle size={23} strokeWidth={2.5} />} variant="ghost" color="black" bg="whiteAlpha.300" _hover={{ bg: "white" }} onClick={handleShuffle}  />
          </Box>

          <HStack spacing={6} alignItems="center" flex={1} justify="center">
            {/* Card 1 with Title above and Buttons Below */}
            <VStack spacing={10} alignItems="center" w="30%">
              <Heading 
                as="h3" 
                fontSize="12px" 
                color="white" 
                fontWeight="bold" 
                textTransform="uppercase" 
                textAlign="center"
                w="full"
              >
                1. TYPE / CATEGORY
              </Heading>
              {editingCategory === 'typeCategory' ? (
                renderCardInputInterface('type/category')
              ) : (
                <VStack 
                  bg="white" 
                  p={0} 
                  borderRadius="30px" 
                  boxShadow="xl" 
                  w="340px" // Set to square width
                  h="340px" 
                  minH="340px" 
                  justifyContent="center"
                  overflow="hidden" 
                >
                  <CardContentDisplay option={selectedTypeCategory} />
                </VStack>
              )}
              <HStack 
                height="50px"
                bg={editingCategory === 'typeCategory' ? "white" : "transparent"}
                borderRadius={editingCategory === 'typeCategory' ? "15px" : "0"}
                spacing={editingCategory === 'typeCategory' ? 0 : 10} 
                w={editingCategory === 'typeCategory' ? "100%" : "full"} // Adjusted width for toolbar
                justifyContent={editingCategory === 'typeCategory' ? "space-between" : "center"}
                alignItems="center"
                px={editingCategory === 'typeCategory' ? 3 : 0} // Padding for Cancel/Save buttons
              >
                {editingCategory === 'typeCategory' ? (
                  <>
                    <IconButton aria-label="Cancel" icon={<X size={23} strokeWidth={2.5}/>} onClick={handleCloseInputInterface} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm" />
                    {/* Toolbar icons always visible when editingCategory is active */}
                    <HStack spacing={3}> 
                      <IconButton aria-label="Text input" icon={<Type size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'text' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('text')} />
                      <IconButton aria-label="Draw input" icon={<Edit3 size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'drawing' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('drawing')} />
                      <IconButton aria-label="Voice input" icon={<Mic size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'voice' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('voice')} />
                      <IconButton aria-label="Image input" icon={<Image size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'image' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('image')} />
                    </HStack>
                    <IconButton aria-label="Save" icon={<Check size={23} strokeWidth={2.5}/>} onClick={handleSaveNewOption} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm" isDisabled={isRecording} />
                  </>
                ) : (
                  <>
                    <IconButton 
                      aria-label="Previous option" 
                      icon={<ChevronUp size={23} strokeWidth={2.5} />} 
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
                      icon={<Plus size={23} strokeWidth={2.5} />} 
                      variant="solid" 
                      bg="whiteAlpha.300" 
                      color="black" 
                      borderRadius="10px" 
                      size="md"
                      onClick={() => editingCategory === 'typeCategory' ? handleCloseInputInterface() : handleOpenInputInterface('typeCategory')}
                      isActive={editingCategory === 'typeCategory'}
                      _hover={{ bg: "white" }}
                      _focus={{ boxShadow: "none" }}
                      _active={{ bg: "white" }}
                    />
                    <IconButton 
                      aria-label="Next option" 
                      icon={<ChevronDown size={23} strokeWidth={2.5} />} 
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
                  </>
                )}
              </HStack>
            </VStack>

            <Box w={16} textAlign="center" minH="340px" display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="16px" fontWeight="medium" pb={9} color="black">THAT</Text>
            </Box>

            {/* Card 2 with Title above and Buttons Below */}
            <VStack spacing={10} alignItems="center" w="30%">
              <Heading 
                as="h3" 
                fontSize="12px" 
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
                  p={0} 
                  borderRadius="30px" 
                  boxShadow="xl" 
                  w="340px" // Set to square width
                  h="340px" 
                  minH="340px"
                  justifyContent="center"
                  overflow="hidden" 
                >
                  <CardContentDisplay option={selectedKeyAttributes} />
                </VStack>
              )}
              <HStack 
                height="50px"
                bg={editingCategory === 'keyAttributes' ? "white" : "transparent"}
                borderRadius={editingCategory === 'keyAttributes' ? "15px" : "0"}
                spacing={editingCategory === 'keyAttributes' ? 0 : 10} 
                w={editingCategory === 'keyAttributes' ? "100%" : "full"} // Adjusted width for toolbar
                justifyContent={editingCategory === 'keyAttributes' ? "space-between" : "center"}
                alignItems="center"
                px={editingCategory === 'keyAttributes' ? 3 : 0} // Padding for Cancel/Save buttons
              >
                {editingCategory === 'keyAttributes' ? (
                  <>
                    <IconButton aria-label="Cancel" icon={<X size={23} strokeWidth={2.5}/>} onClick={handleCloseInputInterface} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm"/>
                    {/* Toolbar icons always visible when editingCategory is active */}
                    <HStack spacing={3}> 
                      <IconButton aria-label="Text input" icon={<Type size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'text' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('text')} />
                      <IconButton aria-label="Draw input" icon={<Edit3 size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'drawing' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('drawing')} />
                      <IconButton aria-label="Voice input" icon={<Mic size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'voice' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('voice')} />
                      <IconButton aria-label="Image input" icon={<Image size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'image' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('image')} />
                    </HStack>
                    <IconButton aria-label="Save" icon={<Check size={23} strokeWidth={2.5}/>} onClick={handleSaveNewOption} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm" isDisabled={isRecording}/>
                  </>
                ) : (
                  <>
                    <IconButton 
                      aria-label="Previous option" 
                      icon={<ChevronUp size={23} strokeWidth={2.5} />} 
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
                      icon={<Plus size={23} strokeWidth={2.5} />} 
                      variant="solid" 
                      bg="whiteAlpha.300" 
                      color="black" 
                      borderRadius="10px" 
                      size="md"
                      onClick={() => editingCategory === 'keyAttributes' ? handleCloseInputInterface() : handleOpenInputInterface('keyAttributes')}
                      isActive={editingCategory === 'keyAttributes'}
                      _hover={{ bg: "white" }}
                      _focus={{ boxShadow: "none" }}
                      _active={{ bg: "white" }}
                    />
                    <IconButton 
                      aria-label="Next option" 
                      icon={<ChevronDown size={23} strokeWidth={2.5} />} 
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
                  </>
                )}
              </HStack>
            </VStack>

            <Box w={16} textAlign="center" minH="340px" display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="16px" fontWeight="medium" pb={9} color="black">TO</Text>
            </Box>

            {/* Card 3 with Title above and Buttons Below */}
            <VStack spacing={10} alignItems="center" w="30%">
              <Heading 
                as="h3" 
                fontSize="12px" 
                color="white" 
                fontWeight="bold" 
                textTransform="uppercase" 
                textAlign="center"
                w="full"
              >
                3. PURPOSE / IMPACT
              </Heading>
              {editingCategory === 'impactPurpose' ? (
                renderCardInputInterface('impact/purpose')
              ) : (
                <VStack 
                  bg="white" 
                  p={0} 
                  borderRadius="30px" 
                  boxShadow="xl" 
                  w="340px" // Set to square width
                  h="340px" 
                  minH="340px"
                  justifyContent="center"
                  overflow="hidden" 
                >
                  <CardContentDisplay option={selectedImpactPurpose} />
                </VStack>
              )}
              <HStack 
                height="50px"
                bg={editingCategory === 'impactPurpose' ? "white" : "transparent"}
                borderRadius={editingCategory === 'impactPurpose' ? "15px" : "0"}
                spacing={editingCategory === 'impactPurpose' ? 0 : 10} 
                w={editingCategory === 'impactPurpose' ? "100%" : "full"} // Adjusted width for toolbar
                justifyContent={editingCategory === 'impactPurpose' ? "space-between" : "center"}
                alignItems="center"
                px={editingCategory === 'impactPurpose' ? 3 : 0} // Padding for Cancel/Save buttons
              >
                {editingCategory === 'impactPurpose' ? (
                  <>
                    <IconButton aria-label="Cancel" icon={<X size={23} strokeWidth={2.5}/>} onClick={handleCloseInputInterface} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm"/>
                    {/* Toolbar icons always visible when editingCategory is active */}
                    <HStack spacing={3}> 
                      <IconButton aria-label="Text input" icon={<Type size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'text' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('text')} />
                      <IconButton aria-label="Draw input" icon={<Edit3 size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'drawing' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('drawing')} />
                      <IconButton aria-label="Voice input" icon={<Mic size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'voice' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('voice')} />
                      <IconButton aria-label="Image input" icon={<Image size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'image' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('image')} />
                    </HStack>
                    <IconButton aria-label="Save" icon={<Check size={23} strokeWidth={2.5}/>} onClick={handleSaveNewOption} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm" isDisabled={isRecording}/>
                  </>
                ) : (
                  <>
                    <IconButton 
                      aria-label="Previous option" 
                      icon={<ChevronUp size={23} strokeWidth={2.5} />} 
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
                      icon={<Plus size={23} strokeWidth={2.5} />} 
                      variant="solid" 
                      bg="whiteAlpha.300" 
                      color="black" 
                      borderRadius="10px" 
                      size="md"
                      onClick={() => editingCategory === 'impactPurpose' ? handleCloseInputInterface() : handleOpenInputInterface('impactPurpose')}
                      isActive={editingCategory === 'impactPurpose'}
                      _hover={{ bg: "white" }}
                      _focus={{ boxShadow: "none" }}
                      _active={{ bg: "white" }}
                    />
                    <IconButton 
                      aria-label="Next option" 
                      icon={<ChevronDown size={23} strokeWidth={2.5} />} 
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
                  </>
                )}
              </HStack>
            </VStack>
          </HStack>
          <Box minH="340px" display="flex" alignItems="center" justifyContent="center" pb={9} pr={3}>
            <IconButton
              aria-label="Save combination"
              icon={<Save size={23} strokeWidth={2.5} />}
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
              <Text borderRadius="10px" bg="gray.100" fontSize="12px" color="black" fontWeight="medium" px="12px" py="10px" borderWidth="1px" borderColor="gray.100"> {savedDefinitions.filter(def => def.term === currentTerm).length} DEFINITIONS ADDED SO FAR</Text>
              <HStack spacing={4}>
                <InputGroup w="200px">
                  <InputLeftElement pointerEvents="none">
                    <Search size={23} strokeWidth={2.5} color="black" />
                  </InputLeftElement>
                  <Input
                    type="text"
                    placeholder="SEARCH"
                    fontWeight="medium"
                    fontSize="12px"
                    borderRadius="10px"
                    bg="gray.100"
                    borderWidth="1px"
                    borderColor="gray.100"
                    _placeholder={{ color: 'black' }}
                    color="black"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    textTransform="none"
                  />
                </InputGroup>
                <Menu gutter={0}>
                  <MenuButton 
                    as={Button} 
                    rightIcon={<ChevronDown size={20} strokeWidth={2.5} />} 
                    fontSize="12px" 
                    px="12px" 
                    py="10px" 
                    borderRadius="10px" 
                    bg="gray.100" 
                    color="black" 
                    fontWeight="medium"
                    w="110px" // Explicit width for the button
                  >
                    {sortOrder.toUpperCase()}
                  </MenuButton>
                  <MenuList 
                    bg="white" 
                        borderColor="gray.100" 
                        borderWidth="3px"
                    borderRadius="10px" 
                    py="0px" // Remove padding from MenuList, apply to MenuItem
                    minW="0" // Allow the width to be set by items or explicit width prop
                    w="110px" // Match button width
                  >
                    {sortOrder !== 'recent' && (
                      <MenuItem 
                        onClick={() => setSortOrder('recent')} 
                        _hover={{ bg: "gray.100" }} 
                        color="black" 
                        fontSize="12px" 
                        fontWeight="medium" 
                        px="12px" 
                        py="10px"
                      >
                        RECENT
                      </MenuItem>
                    )}
                    {sortOrder !== 'popular' && (
                      <MenuItem 
                        onClick={() => setSortOrder('popular')} 
                        _hover={{ bg: "gray.100" }} 
                        color="black" 
                        fontSize="12px" 
                        fontWeight="medium" 
                        px="12px" 
                        py="10px"
                      >
                        POPULAR
                      </MenuItem>
                    )}
                    {sortOrder !== 'random' && (
                      <MenuItem 
                        onClick={() => setSortOrder('random')} 
                        _hover={{ bg: "gray.100" }} 
                        color="black" 
                        fontSize="12px" 
                        fontWeight="medium" 
                        px="12px" 
                        py="10px"
                      >
                        RANDOM
                      </MenuItem>
                    )}
                  </MenuList>
                </Menu>
              </HStack>
            </Flex>

            {savedDefinitions
              .filter((def: Definition) => def.term === currentTerm) // Filter by current term
              .filter((def: Definition) => {
                if (!searchQuery) return true; // If no search query, show all for the current term
                const searchTerm = searchQuery.toLowerCase();
                return (
                  (def.term && def.term.toLowerCase().includes(searchTerm)) ||
                  (def.typeCategory.content && def.typeCategory.type === 'text' && def.typeCategory.content.toLowerCase().includes(searchTerm)) ||
                  (def.keyAttributes.content && def.keyAttributes.type === 'text' && def.keyAttributes.content.toLowerCase().includes(searchTerm)) ||
                  (def.impactPurpose.content && def.impactPurpose.type === 'text' && def.impactPurpose.content.toLowerCase().includes(searchTerm))
                );
              })
              .sort((a: Definition, b: Definition) => {
                if (sortOrder === 'recent') {
                  // Firestore already sorts by createdAt desc for 'recent'
                  // If createdAt is not a Firestore Timestamp, simple comparison might be needed
                  // For now, assuming Firestore handles it or they are comparable directly
                  if (a.createdAt && b.createdAt) {
                    // Assuming serverTimestamp() results in objects that can be compared (e.g., via .toMillis() or .toDate())
                    // This might need adjustment based on actual createdAt structure after Firestore retrieval
                    // For descending order (newest first):
                    if (typeof a.createdAt.toMillis === 'function' && typeof b.createdAt.toMillis === 'function') {
                        return b.createdAt.toMillis() - a.createdAt.toMillis();
                    } else if (a.createdAt > b.createdAt) return -1; // Fallback for direct comparison if not Timestamps
                    else if (a.createdAt < b.createdAt) return 1;
                    return 0;
                  }
                  return 0; // Should not happen if createdAt is always set
                } else if (sortOrder === 'popular') {
                  return (b.likes || 0) - (a.likes || 0); // Sort by likes, descending
                } else if (sortOrder === 'random') {
                  return 0.5 - Math.random(); // Random sort
                }
                return 0;
              })
              .map((def: Definition, index: number) => (
              <VStack key={def.id || index} align="stretch" spacing={3}>
                <Flex py={3} px={5} borderRadius="10px" justify="space-between" align="center" bg="whiteAlpha.200">
                  {/* Adjusted HStack for sentence-like flow */}
                  <HStack spacing={1.5} alignItems="baseline" flex={1} w="full" overflowX="auto"> 
                    <Text color="black" fontWeight="medium" fontSize="sm" whiteSpace="nowrap">{def.term} IS</Text>
                    
                    <Box>
                      <CardContentDisplay option={def.typeCategory} displayContext="savedList" />
                    </Box>
                    
                    <Text color="black" fontWeight="medium" fontSize="sm" whiteSpace="nowrap">that</Text>
                    
                    <Box>
                      <CardContentDisplay option={def.keyAttributes} displayContext="savedList" />
                    </Box>
                    
                    <Text color="black" fontWeight="medium" fontSize="sm" whiteSpace="nowrap">to</Text>
                    
                    <Box>
                      <CardContentDisplay option={def.impactPurpose} displayContext="savedList" />
                    </Box>
                  </HStack>
                  <IconButton aria-label="Like definition" icon={<ThumbsUp size={23} strokeWidth={2.5} />} variant="ghost" color="gray.300" _hover={{ bg: "whiteAlpha.400" }} size="sm" ml={2}/>
                </Flex>
              </VStack>
            ))}
          </VStack>
        )}
      </VStack>

      {/* Help Modal */}
      <Modal isOpen={isHelpModalOpen} onClose={onCloseHelpModal} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black" borderRadius="xl" boxShadow="xl" mx={4}>
          <ModalHeader pt={8} pl={8} pr={8} fontSize="16px" fontWeight="bold" borderBottomWidth="0px" borderColor="white">
            HOW TO USE THIS TOOL
          </ModalHeader>
          <ModalBody pb={8} pl={8} pr={8}>
            <VStack spacing={4} align="stretch">
              <Text fontSize="16" lineHeight="tall">
                This tool helps you explore and define complex terms like "DEMOCRACY" in the context of culture and climate change.
              </Text>
              <Text fontSize="16" lineHeight="tall">
                1. Use the <Text as="span" fontWeight="bold">arrow buttons</Text> beneath each of the three card decks to cycle through different card options.
              </Text>
              <Text fontSize="16" lineHeight="tall">
                2. Press the <Text as="span" fontWeight="bold">plus button</Text> beneath each of the three card decks to add new card options.
              </Text>
              <Text fontSize="16" lineHeight="tall">
                3. You can add new cards by A) writing a word or paragraph, B) drawing an picture, C) recording audio, or D) uploading an image.
              </Text>
              <Text fontSize="16" lineHeight="tall">
                4. Once you're satisfied with a combination, you can click the <Text as="span" fontWeight="bold">save button</Text> on the right to add your new definition to the list below.
              </Text>
             
            </VStack>
          </ModalBody>
          
        
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default App;
