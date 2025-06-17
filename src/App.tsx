import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Heading, Flex, Text, Button, VStack, HStack, Spacer, IconButton, InputGroup, InputLeftElement, Input, Divider, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure, Textarea, Image as ChakraImage, Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverCloseButton, PopoverHeader, PopoverBody, Menu, MenuButton, MenuList, MenuItem, Circle, Progress } from '@chakra-ui/react';
// Import Feather Icons
import { HelpCircle, Menu as MenuIconFeather, ChevronLeft, ChevronRight, Shuffle, Save, ChevronUp, Plus, ChevronDown, Search, MessageSquare, Link, ThumbsUp, Copy, Type, Edit3, Mic, Image, X, Check, Trash2, StopCircle, Upload, AlignCenter, RefreshCw } from 'react-feather';
// Remove or comment out Chakra UI icons if no longer needed, or keep if some are still used elsewhere
// import { ChevronLeftIcon, ChevronRightIcon, QuestionOutlineIcon, HamburgerIcon, AddIcon, ChevronUpIcon, ChevronDownIcon, /* ExternalLinkIcon, */ CopyIcon, SearchIcon, TriangleDownIcon, ChatIcon, LinkIcon, StarIcon, RepeatIcon } from '@chakra-ui/icons';
import { db } from './firebase/firebaseConfig'; // Import db
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy, query, updateDoc, setDoc, Transaction, runTransaction, writeBatch } from 'firebase/firestore'; // Import Firestore functions (ensure updateDoc is here)
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Firebase Storage
import { motion } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import type { CardOptionValue, Definition, TermData, LanguageSpecificTermData } from './types';
import { CardStack } from './components/CardStack';

// --- Data Types (good practice to define shapes) ---
/*
interface CardOptionValue {
  type: 'text' | 'drawing' | 'audio' | 'image';
  content: string; // Text content, base64 data URL for drawing/image, or audio file URL/reference
  waveformData?: number[]; // Optional: pre-computed waveform data for audio
  id?: string; // Optional unique ID for options, useful for keys and comparisons
  language?: 'en' | 'de'; // ADDED: Language of the original content
}

interface Definition {
  id?: string; // Optional: will be assigned by Firestore
  typeCategory: CardOptionValue;
  keyAttributes: CardOptionValue;
  impactPurpose: CardOptionValue;
  termId?: string; // ADDED: Store the language-neutral ID
  termLanguage?: 'en' | 'de'; // ADDED: Store the language of the term saved
  termText?: string; // REPLACED term with termText for clarity
  createdAt?: any; // For Firestore serverTimestamp
  likes?: number; // Added for popular sorting
}

interface TermData {
  id: string; // Language-neutral identifier
  en: LanguageSpecificTermData;
  de: LanguageSpecificTermData; // MODIFIED: German version can now also have phonetic
}

// MODIFIED TermData structure for multilingual support
interface LanguageSpecificTermData {
  term: string;
  etymology?: string;
  phonetic?: string; // Phonetic is optional, mainly for English
  defaultDefinition: {
    typeCategory: CardOptionValue;
    keyAttributes: CardOptionValue;
    impactPurpose: CardOptionValue;
  };
}
*/

// --- Initial Hardcoded Options (will be replaced by Firestore data) ---
// const initialTypeCategoryOptions: CardOption[] = [ ... ]; // Remove or keep for fallback
// const initialKeyAttributesOptions: CardOption[] = [ ... ];
// const initialImpactPurposeOptions: CardOption[] = [ ... ];

const defaultTextOption: CardOptionValue = { type: 'text', content: 'Loading...', id: 'loading-default' };

const allTermsData: TermData[] = [
  {
    id: "ASSEMBLY",
    en: {
      term: "ASSEMBLY",
      etymology: "The word assembly comes from Old French '''assemblee''' ('gathering'), ultimately from Latin '''assimulare''' ('to gather together').",
      phonetic: "[əˈsɛmbli]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: 'Collection of people, representative group of citizens', id: 'default-assembly-type-en' },
        keyAttributes: { type: 'text', content: 'gathers together for a common purpose', id: 'default-assembly-attributes-en' },
        impactPurpose: { type: 'text', content: 'deliberate, make recommendations and support policy development', id: 'default-assembly-impact-en' }
      }
    },
    de: {
      term: "BÜRGERRAT",
      etymology: "Das Wort Versammlung kommt vom Althochdeutschen...",
      phonetic: "[ˈbʏʁɡɐˌʁaːt]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: 'Versammlung von Personen, repräsentative Gruppe von Bürger:innen', id: 'default-assembly-type-de' },
        keyAttributes: { type: 'text', content: 'sich für ein gemeinsames Ziel versammeln', id: 'default-assembly-attributes-de' },
        impactPurpose: { type: 'text', content: 'Überlegungen anzustellen, Empfehlungen abzugeben und die Entwicklung von Strategien zu unterstützen', id: 'default-assembly-impact-de' }
      }
    }
  },
  {
    id: "ASSEMBLY_MEMBERS",
    en: {
      term: "ASSEMBLY MEMBERS",
      etymology: "Assembly members combines 'assembly' (from Latin '''assimulare''', 'to gather') with 'member' (from Latin '''membrum''', 'part of a group').",
      phonetic: "[əˈsɛmbli ˈmɛmbəz]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Participants of a citizens' assembly", id: 'default-assemblymembers-type-en' },
        keyAttributes: { type: 'text', content: "are randomly selected members of the public representative of a population of an area", id: 'default-assemblymembers-attributes-en' },
        impactPurpose: { type: 'text', content: "legitimise the decision making process", id: 'default-assemblymembers-impact-en' }
      }
    },
    de: {
      term: "BÜRGERRATSMITGLIEDER",
      etymology: "GERMAN ETYMOLOGY FOR ASSEMBLY MEMBERS",
      phonetic: "[ˈbʏʁɡɐˌʁaːtsˌmɪtˌɡliːdɐ]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Teilnehmende eines Bürgerrats", id: 'default-assemblymembers-type-de' },
        keyAttributes: { type: 'text', content: "nach dem Zufallsprinzip ausgewählte Mitglieder der Öffentlichkeit sind, die die Bevölkerung des betreffenden Gebiets repräsentieren", id: 'default-assemblymembers-attributes-de' },
        impactPurpose: { type: 'text', content: "zur Legitimierung des Entscheidungsprozesses beizutragen", id: 'default-assemblymembers-impact-de' }
      }
    }
  },
  {
    id: "CITIZEN_JURIES",
    en: {
      term: "CITIZEN JURIES",
      etymology: "Citizen juries combines 'citizen' (from Latin 'civis', 'citizen') with 'jury' (from Latin 'iurare', 'to swear', referring to a sworn body).",
      phonetic: "[ˈsɪtɪzn̩ ˈdʒʊəriz]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Deliberative Mini-Public", id: 'default-citizenjuries-type-en' },
        keyAttributes: { type: 'text', content: "typically comprise 10 to 35 randomly selected citizens to learn about, deliberate on and make decisions about a topic", id: 'default-citizenjuries-attributes-en' },
        impactPurpose: { type: 'text', content: "legitimise and provide knowledge for policy making", id: 'default-citizenjuries-impact-en' }
      }
    },
    de: {
      term: "BÜRGERJURIES",
      etymology: "GERMAN ETYMOLOGY FOR CITIZEN JURIES",
      phonetic: "[ˈbʏʁɡɐˌjuːʁiz]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Deliberative Mini-Öffentlichkeiten", id: 'default-citizenjuries-type-de' },
        keyAttributes: { type: 'text', content: "in der Regel aus 10 bis 35 zufällig ausgewählten Bürger:innen bestehen, die sich über ein Thema informieren, darüber beraten und Entscheidungen treffen", id: 'default-citizenjuries-attributes-de' },
        impactPurpose: { type: 'text', content: "den Prozess zu legitimieren und Wissen für die Politikgestaltung bereitzustellen", id: 'default-citizenjuries-impact-de' }
      }
    }
  },
  {
    id: "CITIZENS",
    en: {
      term: "CITIZENS",
      etymology: "The word citizen comes from Anglo-French 'citezein' ('city-dweller'), ultimately from Latin 'civis' ('citizen').",
      phonetic: "[ˈsɪtɪzn̩z]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Members of the public; legally recognised members of a nation or political community", id: 'default-citizens-type-en' },
        keyAttributes: { type: 'text', content: "are participatory members of a political community and are granted certain rights and privileges", id: 'default-citizens-attributes-en' },
        impactPurpose: { type: 'text', content: "live in accordance with the laws and obligations of citizenship", id: 'default-citizens-impact-en' }
      }
    },
    de: {
      term: "STAATSBÜRGER:INNEN",
      etymology: "GERMAN ETYMOLOGY FOR CITIZENS",
      phonetic: "[ˈʃtaːtsˌbʏʁɡɐˌɪnən]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Partizipative Mitglieder einer Öffentlichkeit, einer Nation oder einer politischen Gemeinschaft", id: 'default-citizens-type-de' },
        keyAttributes: { type: 'text', content: "bestimmte Rechte, Privilegien und Pflichten haben", id: 'default-citizens-attributes-de' },
        impactPurpose: { type: 'text', content: "im Einklang mit den Gesetzen und Pflichten der Gemeinschaft zu leben", id: 'default-citizens-impact-de' }
      }
    }
  },
  {
    id: "CLIMATE_ASSEMBLY",
    en: {
      term: "CLIMATE ASSEMBLY",
      etymology: "Climate assembly combines 'climate' (from Greek 'klima', 'region' or 'zone') with 'assembly' (from Latin 'assimulare', 'to gather together').",
      phonetic: "[ˈklaɪmət əˈsɛmbli]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Deliberative Mini-Public", id: 'default-climateassembly-type-en' },
        keyAttributes: { type: 'text', content: "typically comprise 50 to 150 randomly selected citizens to learn about, deliberate on and make decisions about a topic", id: 'default-climateassembly-attributes-en' },
        impactPurpose: { type: 'text', content: "legitimise and provide knowledge for policy making", id: 'default-climateassembly-impact-en' }
      }
    },
    de: {
      term: "KLIMARAT",
      etymology: "GERMAN ETYMOLOGY FOR CLIMATE ASSEMBLY",
      phonetic: "[ˈkliːmaˌʁaːt]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Deliberative Mini-Öffentlichkeiten", id: 'default-climateassembly-type-de' },
        keyAttributes: { type: 'text', content: "in der Regel aus 50 bis 150 zufällig ausgewählte Bürger:innen bestehen, die sich über ein Thema informieren, darüber beraten und Entscheidungen treffen sollen", id: 'default-climateassembly-attributes-de' },
        impactPurpose: { type: 'text', content: "Wissen für die Politikgestaltung bereitzustellen und den Prozess der Entscheidungsfindung zu legitimieren", id: 'default-climateassembly-impact-de' }
      }
    }
  },
  {
    id: "DECISION_MAKING",
    en: {
      term: "DECISION-MAKING",
      etymology: "Combines 'decision' (from Latin 'decidere', 'to cut off, determine') and 'making' (from Old English 'macian', 'to make, form').",
      phonetic: "[dɪˈsɪʒənˌmeɪkɪŋ]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Process of making choices and selecting a course of action", id: 'default-decisionmaking-type-en' },
        keyAttributes: { type: 'text', content: "develops methods and procedures through which governments make policies, laws and regulations", id: 'default-decisionmaking-attributes-en' },
        impactPurpose: { type: 'text', content: "maintain balance between power and the population's interests", id: 'default-decisionmaking-impact-en' }
      }
    },
    de: {
      term: "ENTSCHEIDUNGSPROZESSE",
      etymology: "GERMAN ETYMOLOGY FOR DECISION-MAKING",
      phonetic: "[ɛntˈʃaɪdʊŋsˌpʁoːtsɛsə]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Wahl der Vorgehensweise", id: 'default-decisionmaking-type-de' },
        keyAttributes: { type: 'text', content: "zur Entwicklung von Methoden und Verfahren dient, mit denen Regierungen Politiken, Gesetze und Vorschriften erlassen", id: 'default-decisionmaking-attributes-de' },
        impactPurpose: { type: 'text', content: "ein Gleichgewicht zwischen institutioneller Macht und den Interessen der Bevölkerung zu gewährleisten", id: 'default-decisionmaking-impact-de' }
      }
    }
  },
  {
    id: "DELIBERATION",
    en: {
      term: "DELIBERATION",
      etymology: "The word deliberation comes from Latin 'deliberare' ('to weigh well'), from 'de-' ('entirely') and 'librare' ('to balance,' from 'libra', 'scales').",
      phonetic: "[dɪˌlɪbəˈreɪʃən]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "An approach to decision making", id: 'default-deliberation-type-en' },
        keyAttributes: { type: 'text', content: "comprises participants justifying what they want by providing reasons and listening to each other's justifications respectfully and with an open mind", id: 'default-deliberation-attributes-en' },
        impactPurpose: { type: 'text', content: "enable inclusive and reasoned decision making that respects and includes a variety of voices and perspectives to be heard", id: 'default-deliberation-impact-en' }
      }
    },
    de: {
      term: "DELIBERATION",
      etymology: "GERMAN ETYMOLOGY FOR DELIBERATION",
      phonetic: "[dɛlibeʁaˈt͡si̯oːn]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Prozess der Entscheidungsfindung", id: 'default-deliberation-type-de' },
        keyAttributes: { type: 'text', content: "es Teilnehmenden erlaubt, ihre Gedanken, Ideen und Wünsche zu begründen und die Begründungen anderer respektvoll und unvoreingenommen anzuhören", id: 'default-deliberation-attributes-de' },
        impactPurpose: { type: 'text', content: "eine integrative Entscheidungsfindung zu ermöglichen, die eine Vielzahl von Stimmen und Perspektiven respektiert und berücksichtigt", id: 'default-deliberation-impact-de' }
      }
    }
  },
  {
    id: "DELIBERATIVE_MINI_PUBLICS",
    en: {
      term: "DELIBERATIVE MINI-PUBLICS",
      etymology: "Combines 'deliberative' (Latin 'deliberare', 'to weigh well'), 'mini' (from Latin 'minium', associated with smallness), and 'publics' (Latin 'publicus', 'of the people').",
      phonetic: "[dɪˈlɪbərətɪv ˈmɪni ˈpʌblɪks]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Democratic innovation", id: 'default-deliberativeminipublics-type-en' },
        keyAttributes: { type: 'text', content: "involves randomly selected citizens to learn about, deliberate on and make decisions about a topic", id: 'default-deliberativeminipublics-attributes-en' },
        impactPurpose: { type: 'text', content: "legitimise and provide knowledge for policy making", id: 'default-deliberativeminipublics-impact-en' }
      }
    },
    de: {
      term: "DELIBERATIVE MINI-ÖFFENTLICHKEITEN",
      etymology: "GERMAN ETYMOLOGY FOR DELIBERATIVE MINI-PUBLICS",
      phonetic: "[dɛlibeʁaˈtiːvə ˈmɪni ˌœfn̩tlɪçkaɪtn̩]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Demokratische Intervention", id: 'default-deliberativeminipublics-type-de' },
        keyAttributes: { type: 'text', content: "auf einem partizipativen Verfahren beruht, bei dem eine zufällig ausgewählte Gruppe von Bürger:innen über ein bestimmtes Thema gemeinsam diskutiert und Empfehlungen oder Lösungsansätze erarbeitet", id: 'default-deliberativeminipublics-attributes-de' },
        impactPurpose: { type: 'text', content: "Wissen für die Politikgestaltung bereitzustellen und den Prozess der Entscheidungsfindung zu legitimieren", id: 'default-deliberativeminipublics-impact-de' }
      }
    }
  },
  {
    id: "DEMOCRACY",
    en: {
      term: "DEMOCRACY",
      etymology: "The word democracy comes from the Greek demokratia, meaning 'rule by the people', from demos ('people') and kratos ('power').",
      phonetic: "[dɪˈmɒkrəsi]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "System or rule of government by all eligible members of the state", id: 'default-democracy-type-en' },
        keyAttributes: { type: 'text', content: "depends on the will of the people either directly or through elected representatives", id: 'default-democracy-attributes-en' },
        impactPurpose: { type: 'text', content: "provide an environment for effective rule by the people for the people and effective realisation of human rights", id: 'default-democracy-impact-en' }
      }
    },
    de: {
      term: "DEMOKRATIE",
      etymology: "GERMAN ETYMOLOGY FOR DEMOCRACY",
      phonetic: "[dɛmoˈkʁaːtsi̯ə]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Staatsform", id: 'default-democracy-type-de' },
        keyAttributes: { type: 'text', content: "auf der Beteiligung der Öffentlichkeit beruht", id: 'default-democracy-attributes-de' },
        impactPurpose: { type: 'text', content: "eine wirksame Herrschaft des Volkes für das Volk zu ermöglichen und Menschenrechte zu verwirklichen", id: 'default-democracy-impact-de' }
      }
    }
  },
  {
    id: "EVIDENCE",
    en: {
      term: "EVIDENCE",
      etymology: "The word evidence comes from Latin 'evidens' ('obvious, apparent'), from 'ex-' ('out, fully') and 'videre' ('to see').",
      phonetic: "[ˈɛvɪdəns]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Input of a deliberative mini-public", id: 'default-evidence-type-en' },
        keyAttributes: { type: 'text', content: "that is presented by expert witnesses or advocates during the learning phase of a citizens' assembly", id: 'default-evidence-attributes-en' },
        impactPurpose: { type: 'text', content: "enable informed deliberation and decision making", id: 'default-evidence-impact-en' }
      }
    },
    de: {
      term: "NACHWEISE",
      etymology: "GERMAN ETYMOLOGY FOR EVIDENCE",
      phonetic: "[ˈnaːxvaɪzə]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Eingebrachte Inputs in deliberativen Mini-Öffentlichkeiten", id: 'default-evidence-type-de' },
        keyAttributes: { type: 'text', content: "von Sachverständigen oder Anwälten während der Lernphase einer Bürgerversammlung präsentiert werden", id: 'default-evidence-attributes-de' },
        impactPurpose: { type: 'text', content: "fundierte Beratungen und Entscheidungsfindungen zu ermöglichen", id: 'default-evidence-impact-de' }
      }
    }
  },
  {
    id: "EXPERTS",
    en: {
      term: "EXPERTS",
      etymology: "The word expert comes from Latin 'experiri' ('to try, test'), meaning one who is 'known by experience'.",
      phonetic: "[ˈɛkspɜːts]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "People selected by the governing body to present evidence at a deliberative mini-public", id: 'default-experts-type-en' },
        keyAttributes: { type: 'text', content: "have expertise in a specific area of the topic; typically, experts with a range of perspectives are selected", id: 'default-experts-attributes-en' },
        impactPurpose: { type: 'text', content: "to enable the 'learning' part of the process, where assembly member learn about the subject topic before deliberating on and making decisions about it", id: 'default-experts-impact-en' }
      }
    },
    de: {
      term: "EXPERT:INNEN",
      etymology: "GERMAN ETYMOLOGY FOR EXPERTS",
      phonetic: "[ɛkspɛʁtˌɪnən]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Vom Leitungsorgan ausgewählte Personen", id: 'default-experts-type-de' },
        keyAttributes: { type: 'text', content: "über Fachwissen zu einem bestimmten Themengebiet verfügen und jenes Wissen in deliberativen Mini-Öffentlichkeiten präsentieren", id: 'default-experts-attributes-de' },
        impactPurpose: { type: 'text', content: "den 'Lern'-Teil des Prozesses zu ermöglichen, bei dem sich die Mitglieder der Versammlung über das Thema informieren, bevor sie darüber beraten und Entscheidungen treffen", id: 'default-experts-impact-de' }
      }
    }
  },
  {
    id: "FACILITATORS",
    en: {
      term: "FACILITATORS",
      etymology: "The word facilitation derives from Latin 'facilis' ('easy to do'), which comes from 'facere' ('to do or make').",
      phonetic: "[fəˈsɪlɪteɪtəz]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "People with expertise in citizen deliberation", id: 'default-facilitators-type-en' },
        keyAttributes: { type: 'text', content: "manage small group deliberation and decision making during a mini-public, ensuring all voices are heard", id: 'default-facilitators-attributes-en' },
        impactPurpose: { type: 'text', content: "help the participants understand issues, discuss thoughtfully and respectfully and make informed decisions", id: 'default-facilitators-impact-en' }
      }
    },
    de: {
      term: "VERMITTLER:INNEN",
      etymology: "GERMAN ETYMOLOGY FOR FACILITATORS",
      phonetic: "[fɛɐ̯ˈmɪtlɐˌɪnən]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Personen mit Erfahrung in Bürgerversammlungen", id: 'default-facilitators-type-de' },
        keyAttributes: { type: 'text', content: "den Versammlungsprozess leiten und sicherstellen, dass alle Stimmen gehört werden", id: 'default-facilitators-attributes-de' },
        impactPurpose: { type: 'text', content: "den Bürger:innen zu helfen, Themen zu verstehen, nachdenklich und respektvoll zu diskutieren und fundierte Entscheidungen zu treffen", id: 'default-facilitators-impact-de' }
      }
    }
  },
  {
    id: "GOVERNING_BODY",
    en: {
      term: "GOVERNING BODY",
      etymology: "Governing body combines 'governing' (from Latin 'gubernare', 'to rule') with 'body' (from Old English 'bodig', 'a collective group').",
      phonetic: "[ˈɡʌvənɪŋ ˈbɒdi]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Organisation or people that make decisions about the design and implementation of a deliberative mini-public", id: 'default-governingbody-type-en' },
        keyAttributes: { type: 'text', content: "typically have expertise in the topic or participatory and deliberative methods", id: 'default-governingbody-attributes-en' },
        impactPurpose: { type: 'text', content: "ensure the design and implementation of the process adheres to best practice and fulfils the remit set by the commissioning organisation", id: 'default-governingbody-impact-en' }
      }
    },
    de: {
      term: "LEITUNGSORGAN",
      etymology: "GERMAN ETYMOLOGY FOR GOVERNING BODY",
      phonetic: "[ˈlaɪtʊŋsˌɔʁɡaːn]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Organisation oder Personen", id: 'default-governingbody-type-de' },
        keyAttributes: { type: 'text', content: "die Entscheidungen über die Gestaltung und Umsetzung einer deliberativen Mini-Öffentlichkeit treffen und in der Regel über Fachwissen zum Thema oder zu partizipativen und deliberativen Methoden verfügen", id: 'default-governingbody-attributes-de' },
        impactPurpose: { type: 'text', content: "sicherzustellen, dass die Gestaltung und Umsetzung des Prozesses den bewährten Verfahren entspricht und den von der auftraggebenden Organisation festgelegten Auftrag erfüllt", id: 'default-governingbody-impact-de' }
      }
    }
  },
  {
    id: "PARTICIPATION",
    en: {
      term: "PARTICIPATION",
      etymology: "The word participation comes from Latin 'participare' ('to share in, partake of'), from 'pars' ('part') and 'capere' ('to take').",
      phonetic: "[pɑːˌtɪsɪˈpeɪʃən]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "An approach to governance", id: 'default-participation-type-en' },
        keyAttributes: { type: 'text', content: "enables citizens to individually or collectively contribute to decision making", id: 'default-participation-attributes-en' },
        impactPurpose: { type: 'text', content: "improve and legitimise decision making", id: 'default-participation-impact-en' }
      }
    },
    de: {
      term: "PARTIZIPATION",
      etymology: "GERMAN ETYMOLOGY FOR PARTICIPATION",
      phonetic: "[paʁtitsiˈpaːt͡si̯oːn]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Ein Regierungsansatz", id: 'default-participation-type-de' },
        keyAttributes: { type: 'text', content: "es den Bürger:innen ermöglicht, individuell oder kollektiv zur Entscheidungsfindung beizutragen", id: 'default-participation-attributes-de' },
        impactPurpose: { type: 'text', content: "den Prozess der Entscheidungsfindung zu legitimieren", id: 'default-participation-impact-de' }
      }
    }
  },
  {
    id: "POLICY",
    en: {
      term: "POLICY",
      etymology: "The word policy comes from Greek 'politeia' ('state, administration'), via Latin 'politia' and Old French 'policie'.",
      phonetic: "[ˈpɒləsi]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Tool of governance", id: 'default-policy-type-en' },
        keyAttributes: { type: 'text', content: "sets out the strategic direction of the governing body", id: 'default-policy-attributes-en' },
        impactPurpose: { type: 'text', content: "communicate vision and guide action", id: 'default-policy-impact-en' }
      }
    },
    de: {
      term: "POLITISCHE MAßNAHMEN & ZIELE",
      etymology: "GERMAN ETYMOLOGY FOR POLICY",
      phonetic: "[poliˈtɪʃə ˈmaːsˌnaːmən ʊnt ˈtsiːlə]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Instrument des Regierens", id: 'default-policy-type-de' },
        keyAttributes: { type: 'text', content: "die strategische Ausrichtung des Leitungsgremiums festlegt", id: 'default-policy-attributes-de' },
        impactPurpose: { type: 'text', content: "Visionen zu vermitteln und Maßnahmen anzuleiten", id: 'default-policy-impact-de' }
      }
    }
  },
  {
    id: "POLITICS",
    en: {
      term: "POLITICS",
      etymology: "The word politics derives from Greek 'politikos' ('of citizens, of the state'), from 'polis' ('city'), influenced by Aristotle's 'ta politika'.",
      phonetic: "[ˈpɒlɪtɪks]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Activities of a Government", id: 'default-politics-type-en' },
        keyAttributes: { type: 'text', content: "depend on power relations and relationships between people", id: 'default-politics-attributes-en' },
        impactPurpose: { type: 'text', content: "prioritise competing interests and enable decisions to be made", id: 'default-politics-impact-en' }
      }
    },
    de: {
      term: "POLITIK",
      etymology: "GERMAN ETYMOLOGY FOR POLITICS",
      phonetic: "[poliˈtiːk]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Aktivitäten einer Regierung", id: 'default-politics-type-de' },
        keyAttributes: { type: 'text', content: "von den Machtverhältnissen und Beziehungen zwischen den Menschen abhängen", id: 'default-politics-attributes-de' },
        impactPurpose: { type: 'text', content: "konkurrierende Interessen zu priorisieren und Entscheidungen zu ermöglichen", id: 'default-politics-impact-de' }
      }
    }
  },
  {
    id: "POST_ASSEMBLY",
    en: {
      term: "POST ASSEMBLY",
      etymology: "Post assembly combines 'post-' (Latin *post*, 'after') with 'assembly' (Latin *assimulare*, 'to gather together'), meaning 'after the gathering'.",
      phonetic: "[poʊst əˈsɛmbli]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Stage / phase of a citizens' assembly process", id: 'default-postassembly-type-en' },
        keyAttributes: { type: 'text', content: "occurs after the formal process of learning, deliberation and decision making, when an assembly's outputs (e.g. recommendations or proposals) are handed back to the comissioning organisation for implementation", id: 'default-postassembly-attributes-en' },
        impactPurpose: { type: 'text', content: "determine what happens next", id: 'default-postassembly-impact-en' }
      }
    },
    de: {
      term: "POST ASSEMBLY",
      etymology: "GERMAN ETYMOLOGY FOR POST ASSEMBLY",
      phonetic: "[poʊst əˈsɛmbli]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: "Stufe / Phase eines Bürgerbeteiligungsprozesses", id: 'default-postassembly-type-de' },
        keyAttributes: { type: 'text', content: "zur Umsetzung der Ergebnisse in Politik und Maßnahmen dient", id: 'default-postassembly-attributes-de' },
        impactPurpose: { type: 'text', content: "festzulegen, was als nächstes geschieht", id: 'default-postassembly-impact-de' }
      }
    }
  },
  {
    id: "RECOMMENDATIONS",
    en: {
      term: "RECOMMENDATIONS",
      etymology: "The word recommendation derives from Latin *recommendare* ('to commend, entrust'), from *re-* ('again' or intensive) and *commendare* ('to entrust').",
      phonetic: "[ˌrɛkəmɛnˈdeɪʃənz]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: 'Output from a deliberative mini-public', id: 'default-recommendations-type-en' },
        keyAttributes: { type: 'text', content: 'summarise the key decisions made by the assembly members', id: 'default-recommendations-attributes-en' },
        impactPurpose: { type: 'text', content: 'inform policy makers of an assembly\'s decisions and proposals for policy implementation', id: 'default-recommendations-impact-en' }
      }
    },
    de: {
      term: "EMPFEHLUNGEN",
      etymology: "GERMAN ETYMOLOGY FOR RECOMMENDATIONS",
      phonetic: "[ɛmpfeːlʊŋən]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: 'Ergebnisse einer deliberativen Mini-Öffentlichkeit', id: 'default-recommendations-type-de' },
        keyAttributes: { type: 'text', content: 'die wichtigsten Entscheidungen der Versammlungsmitglieder zusammenfassen', id: 'default-recommendations-attributes-de' },
        impactPurpose: { type: 'text', content: "politische Entscheidungsträger:innen über die Beschlüsse einer Versammlung und Vorschläge zur Umsetzung der Politik zu unterrichten", id: 'default-recommendations-impact-de' }
      }
    }
  },
  {
    id: "SCENARIOS",
    en: {
      term: "SCENARIOS",
      etymology: "From Italian '''scenario''' ('scene, stage setting'), derived from Latin '''scaena''' ('scene, stage').",
      phonetic: "[sɪˈnɑːrɪəʊz]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: 'Narrative imaginings of possible actions, situations or events in the future', id: 'default-scenarios-type-en' },
        keyAttributes: { type: 'text', content: 'create a framework for discussing complex issues and different perspectives on a topic in an assembly process', id: 'default-scenarios-attributes-en' },
        impactPurpose: { type: 'text', content: 'help citizens understand impacts and consequences of different actions and policies and explore alternatives', id: 'default-scenarios-impact-en' }
      }
    },
    de: {
      term: "SZENARIEN",
      etymology: "GERMAN ETYMOLOGY FOR SCENARIOS",
      phonetic: "[t͡sɛnaˈʁiːən]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: 'Narrative Vorstellungen von möglichen Handlungen, Situationen oder Ereignissen in der Zukunft', id: 'default-scenarios-type-de' },
        keyAttributes: { type: 'text', content: 'die Schaffung eines Rahmens für die Erörterung komplexer Fragen und unterschiedlicher Perspektiven zu einem Thema in einem Montageprozess ermöglichen', id: 'default-scenarios-attributes-de' },
        impactPurpose: { type: 'text', content: 'den Bürger:innen zu helfen, die Auswirkungen und Folgen verschiedener Maßnahmen und Strategien zu verstehen und Alternativen zu prüfen', id: 'default-scenarios-impact-de' }
      }
    }
  },
  {
    id: "SORTITION",
    en: {
      term: "SORTITION",
      etymology: "The word sortition comes from Latin *sortiri* ('to draw lots'), from *sors* ('lot, share, or portion').",
      phonetic: "[sɔːˈtɪʃən]",
      defaultDefinition: {
        typeCategory: { type: 'text', content: 'Recruitment strategy', id: 'default-sortition-type-en' },
        keyAttributes: { type: 'text', content: 'uses random stratified sampling to identify and select a representative sample of the population', id: 'default-sortition-attributes-en' },
        impactPurpose: { type: 'text', content: 'ensure the assembly members represent the population in terms of key demographics', id: 'default-sortition-impact-en' }
      }
    },
    de: {
      term: "SORTIERUNG",
      etymology: "GERMAN ETYMOLOGY FOR SORTITION",
      phonetic: "[zɔʁˈtiːʁʊŋ]", 
      defaultDefinition: {
        typeCategory: { type: 'text', content: 'Recruitmentstrategie', id: 'default-sortition-type-de' },
        keyAttributes: { type: 'text', content: 'durch geschichtete Zufallsstichproben eine Auswahl einer repräsentativen Stichprobe der Grundgesamtheit ermittelt', id: 'default-sortition-attributes-de' },
        impactPurpose: { type: 'text', content: 'sicherzustellen, dass die Mitglieder der Versammlung die Bevölkerung in Bezug auf die wichtigsten demografischen Merkmale repräsentieren', id: 'default-sortition-impact-de' }
      }
    }
  }
];


const storage = getStorage(); // Initialize Firebase Storage

// Find the initial index for "DEMOCRACY"
const initialTermIdentifier = "DEMOCRACY"; // This should be the ID
const initialTermIndex = Math.max(0, allTermsData.findIndex(termData => termData.id === initialTermIdentifier));

// --- UI Translations ---
const uiTranslations = {
  en: {
    helpModalTitle: "HOW TO USE THIS TOOL",
    helpModalIntro: "This tool helps you explore and define complex terms like \"DEMOCRACY\" in the context of culture and climate change.", // Escaped inner quotes
    helpModalStep1: "1. Use the arrow buttons beneath each of the three card decks to cycle through different card options.",
    helpModalStep2: "2. Press the plus button beneath each of the three card decks to add new card options.",
    helpModalStep3: "3. You can add new cards by A) writing a word or paragraph, B) drawing an picture, C) recording audio, or D) uploading an image.",
    helpModalStep4: "4. Once you're satisfied with a combination, you can click the save button on the right to add your new definition to the list below.",
    noEtymology: "No etymology information available for this term.",
    remixDefinitionLabel: "Remix definition",
    cardTitleTypeCategory: "1. TYPE / CATEGORY",
    cardTitleKeyAttributes: "2. KEY ATTRIBUTES",
    cardTitleImpactPurpose: "3. PURPOSE / IMPACT",
    textThat: "THAT",
    textTo: "TO",
    // Card input placeholders
    placeholderEnterNew: (category: string) => `Enter new ${category}...`,
    placeholderDrawing: "Start drawing here",
    placeholderImageUpload: "Select an image to upload",
    placeholderTapToRecord: "Tap to record",
    statusRecording: "Recording...",
    statusCompressing: (progress: number) => `Compressing: ${progress}%`,
    // Card control button aria-labels
    labelPreviousOption: "Previous option",
    labelNextOption: "Next option",
    labelAddNewOption: "Add new option",
    labelTextInput: "Text input",
    labelDrawInput: "Draw input",
    labelVoiceInput: "Voice input",
    labelImageInput: "Image input",
    labelCancel: "Cancel",
    labelSave: "Save",
    labelSaveCombination: "Save combination",
    // Saved definitions list
    definitionsAddedFor: (count: number, term: string) => `${count} DEFINITIONS ADDED FOR ${term.toUpperCase()}`,
    sortRecent: "RECENT",
    sortPopular: "POPULAR",
    sortRandom: "RANDOM",
    searchPlaceholder: "SEARCH",
    labelLikeDefinition: "Like definition",
    // Alerts
    alertPleaseSelectOptions: "Please select an option for all three cards.",
    alertMicrophoneError: "Microphone access denied or an error occurred.",
    // Term Navigation aria-labels
    labelPreviousTerm: "Previous term",
    labelNextTerm: "Next term",
    // Help and Menu Icon aria-labels in header
    labelHelpIcon: "Help",
    labelMenuIcon: "Menu",
    noAudioContent: "No audio content.",
    noImageContent: "No image content.",
    noDrawingContent: "No drawing content.",
  },
  de: {
    helpModalTitle: "SO VERWENDEN SIE DIESES TOOL",
    helpModalIntro: "Dieses Tool hilft Ihnen, komplexe Begriffe wie 'DEMOKRATIE' im Kontext von Kultur und Klimawandel zu untersuchen und zu definieren.", // Used single quotes for inner term
    helpModalStep1: "1. Verwenden Sie die Pfeil-Buttons unter jedem der drei Kartenstapel, um durch verschiedene Kartenoptionen zu wechseln.",
    helpModalStep2: "2. Drücken Sie den Plus-Button unter jedem der drei Kartenstapel, um neue Kartenoptionen hinzuzufügen.",
    helpModalStep3: "3. Sie können neue Karten hinzufügen, indem Sie A) ein Wort oder einen Absatz schreiben, B) ein Bild zeichnen, C) Audio aufnehmen oder D) ein Bild hochladen.",
    helpModalStep4: "4. Sobald Sie mit einer Kombination zufrieden sind, können Sie auf den Speichern-Button auf der rechten Seite klicken, um Ihre neue Definition zur Liste unten hinzuzufügen.", // Used single quotes for inner term
    noEtymology: "Für diesen Begriff sind keine Etymologie-Informationen verfügbar.",
    remixDefinitionLabel: "Definition neu mischen",
    cardTitleTypeCategory: "1. TYP / KATEGORIE",
    cardTitleKeyAttributes: "2. BESONDERE ATTRIBUTE",
    cardTitleImpactPurpose: "3. ZWECK / WIRKUNG",
    textThat: "DER\nDIE\nDAS",
    textTo: "UM",
    // Card input placeholders
    placeholderEnterNew: (category: string) => `Neue ${category} eingeben...`,
    placeholderDrawing: "Beginnen Sie hier zu zeichnen",
    placeholderImageUpload: "Bild zum Hochladen auswählen",
    placeholderTapToRecord: "Zum Aufnehmen tippen",
    statusRecording: "Aufnahme...",
    statusCompressing: (progress: number) => `Komprimierung: ${progress}%`,
    // Card control button aria-labels
    labelPreviousOption: "Vorherige Option",
    labelNextOption: "Nächste Option",
    labelAddNewOption: "Neue Option hinzufügen",
    labelTextInput: "Texteingabe",
    labelDrawInput: "Zeichnen",
    labelVoiceInput: "Spracheingabe",
    labelImageInput: "Bildeingabe",
    labelCancel: "Abbrechen",
    labelSave: "Speichern",
    labelSaveCombination: "Kombination speichern",
    // Saved definitions list
    definitionsAddedFor: (count: number, term: string) => `${count} DEFINITIONEN HINZUGEFÜGT FÜR ${term.toUpperCase()}`,
    sortRecent: "NEUESTE",
    sortPopular: "BELIEBT",
    sortRandom: "ZUFÄLLIG",
    searchPlaceholder: "SUCHEN",
    labelLikeDefinition: "Definition liken",
    // Alerts
    alertPleaseSelectOptions: "Bitte wählen Sie für alle drei Karten eine Option aus.",
    alertMicrophoneError: "Mikrofonzugriff verweigert oder Fehler aufgetreten.",
    // Term Navigation aria-labels
    labelPreviousTerm: "Vorheriger Begriff",
    labelNextTerm: "Nächster Begriff",
    // Help and Menu Icon aria-labels in header
    labelHelpIcon: "Hilfe",
    labelMenuIcon: "Menü",
    noAudioContent: "Kein Audioinhalt.",
    noImageContent: "Kein Bildinhalt.",
    noDrawingContent: "Kein Zeichnungsinhalt.",
  }
};

// A mock translation function. Replace with a real API in production.
const translateText = async (text: string, targetLanguage: 'en' | 'de', sourceLanguage?: 'en' | 'de'): Promise<string> => {
  if (!text || !sourceLanguage || !targetLanguage || sourceLanguage === targetLanguage) {
    return text; // No need to translate
  }

  console.log(`Translating "${text}" from ${sourceLanguage} to ${targetLanguage} using MyMemory API...`);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|${targetLanguage}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`MyMemory API request failed with status ${response.status}`);
    }
    const data = await response.json();

    if (data.responseData && data.responseData.translatedText) {
      // Sometimes MyMemory returns the original text if it can't translate.
      // We can check the match quality. A match of 1 means it's a good machine translation.
      // Lower matches might be less reliable. We'll accept anything for now.
      console.log('Translation successful:', data.responseData.translatedText);
      return data.responseData.translatedText;
    } else {
      console.warn('Translation failed, no translated text in response. Response:', data);
      return text; // Fallback to original text
    }
  } catch (error) {
    console.error("Error during translation:", error);
    return text; // Fallback to original text on any error
  }
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input
  const [isDrawing, setIsDrawing] = useState(false);

  // --- State for current term ---
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'de'>('en'); // ADDED Language state
  const [currentTermIdx, setCurrentTermIdx] = useState<number>(initialTermIndex);
  const prevTermIdxRef = useRef<number>(); // To track term changes

  // Derive current term data based on language
  const currentTermEntry = allTermsData[currentTermIdx];
  const currentTermDisplayData = currentTermEntry[currentLanguage];
  const T = uiTranslations[currentLanguage]; // ADDED: Get current language translations

  const currentTerm = currentTermDisplayData.term;
  const currentEtymology = currentTermDisplayData.etymology;
  const currentPhonetic = currentTermDisplayData.phonetic; // MODIFIED: Directly use phonetic from current language display data


  // --- State for currently selected card content ---
  const [selectedTypeCategory, setSelectedTypeCategory] = useState<CardOptionValue>(currentTermDisplayData.defaultDefinition.typeCategory);
  const [selectedKeyAttributes, setSelectedKeyAttributes] = useState<CardOptionValue>(currentTermDisplayData.defaultDefinition.keyAttributes);
  const [selectedImpactPurpose, setSelectedImpactPurpose] = useState<CardOptionValue>(currentTermDisplayData.defaultDefinition.impactPurpose);

  // --- State for the list of available options (currently hardcoded) ---
  // In a real app, these would be fetched and could be more complex objects
  const [allTypeCategoryOptions, setAllTypeCategoryOptions] = useState<CardOptionValue[]>([]);
  const [allKeyAttributesOptions, setAllKeyAttributesOptions] = useState<CardOptionValue[]>([]);
  const [allImpactPurposeOptions, setAllImpactPurposeOptions] = useState<CardOptionValue[]>([]);

  // Filtered options based on current language
  const typeCategoryOptions = useMemo(() => {
    return allTypeCategoryOptions.filter(opt => {
      // For default options (which have IDs like 'default-something'), only show the one
      // matching the current language. For all other options (user-created, media), show them always.
      if (opt.id?.startsWith('default-')) {
        return opt.language === currentLanguage;
      }
      return true;
    });
  }, [allTypeCategoryOptions, currentLanguage]);

  const keyAttributesOptions = useMemo(() => {
    return allKeyAttributesOptions.filter(opt => {
      if (opt.id?.startsWith('default-')) {
        return opt.language === currentLanguage;
      }
      return true;
    });
  }, [allKeyAttributesOptions, currentLanguage]);

  const impactPurposeOptions = useMemo(() => {
    return allImpactPurposeOptions.filter(opt => {
      if (opt.id?.startsWith('default-')) {
        return opt.language === currentLanguage;
      }
      return true;
    });
  }, [allImpactPurposeOptions, currentLanguage]);

  // --- State for saved definitions (will come from Firestore) ---
  const [savedDefinitions, setSavedDefinitions] = useState<Definition[]>([]);
  const [searchQuery, setSearchQuery] = useState(""); // State for the search query
  const [sortOrder, setSortOrder] = useState<'recent' | 'popular' | 'random'>('recent'); // State for sorting
  const [likedDefinitionIds, setLikedDefinitionIds] = useState<string[]>(() => {
    const storedLikes = localStorage.getItem('likedDefinitionIds');
    return storedLikes ? JSON.parse(storedLikes) : [];
  }); // State for liked definitions, initialized from localStorage

  // Modal disclosure hook
  const { isOpen: isHelpModalOpen, onOpen: onOpenHelpModal, onClose: onCloseHelpModal } = useDisclosure();
  const { isOpen: isEtymologyPopoverOpen, onOpen: onOpenEtymologyPopover, onClose: onCloseEtymologyPopover, onToggle: onToggleEtymologyPopover } = useDisclosure(); // Ensure onToggle is here

  // --- State for adding new card options ---
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
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
  const [isAnimating, setIsAnimating] = useState(true);

  const MAX_RECORDING_TIME = 30; // 30 seconds

  // --- Placeholder for current term ---

  // Term navigation handlers
  const handlePreviousTerm = () => {
    setIsAnimating(false);
    setCurrentTermIdx((prevIndex) => (prevIndex - 1 + allTermsData.length) % allTermsData.length);
  };

  const handleNextTerm = () => {
    setIsAnimating(false);
    setCurrentTermIdx((prevIndex) => (prevIndex + 1) % allTermsData.length);
  };

  // Effect to update selected definitions when the term or language changes
  useEffect(() => {
    const newTermEntry = allTermsData[currentTermIdx];
    const newTermDisplayData = newTermEntry[currentLanguage];

    // If the term itself has changed, always reset to the default definitions for that new term.
    if (prevTermIdxRef.current !== currentTermIdx) {
      setSelectedTypeCategory(newTermDisplayData.defaultDefinition.typeCategory);
      setSelectedKeyAttributes(newTermDisplayData.defaultDefinition.keyAttributes);
      setSelectedImpactPurpose(newTermDisplayData.defaultDefinition.impactPurpose);
    } else {
      // If only the language has changed, check each card.
      // If a card is a default card, switch it to the corresponding default for the new language.
      // Otherwise, keep the user-defined card (it will be translated).

      if (selectedTypeCategory.id?.startsWith('default-')) {
        setSelectedTypeCategory(newTermDisplayData.defaultDefinition.typeCategory);
      }

      if (selectedKeyAttributes.id?.startsWith('default-')) {
        setSelectedKeyAttributes(newTermDisplayData.defaultDefinition.keyAttributes);
      }

      if (selectedImpactPurpose.id?.startsWith('default-')) {
        setSelectedImpactPurpose(newTermDisplayData.defaultDefinition.impactPurpose);
      }
    }

    // Update ref for the next render cycle
    prevTermIdxRef.current = currentTermIdx;
  }, [currentTermIdx, currentLanguage, allTermsData]);

  // Effect to close etymology popover when term or language changes
  useEffect(() => {
    onCloseEtymologyPopover();
  }, [currentTermIdx, currentLanguage, onCloseEtymologyPopover]);

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

  const saveAllDefaultDefinitionsToFirebase = async () => {
    console.log("Starting to save all default options to Firebase...");
    for (const termData of allTermsData) {
      const termId = termData.id;
      if (!termId) {
        console.warn("Skipping a term because it has no ID.", termData);
        continue;
      }
      console.log(`Processing term: ${termId}`);
      const termOptionsDocRef = doc(db, 'cardOptions', termId);
  
      try {
        // We will overwrite existing documents to ensure defaults are always correct.
        // User-generated options are added with merge: true, so they won't be lost unless
        // this script is run after users have added data. For initial setup, this is safe.

        const enDefs = termData.en.defaultDefinition;
        const deDefs = termData.de.defaultDefinition;

        // Add language property to each default option for filtering.
        const typeCategoryOptions = [
          { ...enDefs.typeCategory, language: 'en' },
          { ...deDefs.typeCategory, language: 'de' }
        ];
        const keyAttributesOptions = [
          { ...enDefs.keyAttributes, language: 'en' },
          { ...deDefs.keyAttributes, language: 'de' }
        ];
        const impactPurposeOptions = [
          { ...enDefs.impactPurpose, language: 'en' },
          { ...deDefs.impactPurpose, language: 'de' }
        ];

        // Using setDoc will create the document or overwrite it.
        await setDoc(termOptionsDocRef, {
          typeCategory: typeCategoryOptions,
          keyAttributes: keyAttributesOptions,
          impactPurpose: impactPurposeOptions
        });

        console.log(`Successfully created/updated default options for ${termId}`);
      } catch (error) {
        console.error(`Error processing term ${termId}:`, error);
      }
    }
    alert("Finished populating/updating Firestore with all default term options. Check the console for details. You can disable this button after setup.");
  };

  const handleDeleteAllCardOptions = async () => {
    const confirmation = window.confirm(
      "Are you sure you want to delete ALL user-added and default card options from Firebase? This action cannot be undone. You will need to click 'Save Defaults to DB' again to restore the initial cards."
    );
    if (confirmation) {
      console.log("Starting to delete all card options from Firebase...");
      try {
        const optionsCollectionRef = collection(db, 'cardOptions');
        const querySnapshot = await getDocs(optionsCollectionRef);
        
        if (querySnapshot.empty) {
          alert("No card options found in Firestore to delete.");
          return;
        }

        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
          console.log(`Queueing deletion for doc: ${doc.id}`);
          batch.delete(doc.ref);
        });

        await batch.commit();

        // After successful deletion, clear local state and reset cards to default
        setAllTypeCategoryOptions([]);
        setAllKeyAttributesOptions([]);
        setAllImpactPurposeOptions([]);

        const currentTermData = allTermsData[currentTermIdx];
        const displayData = currentTermData[currentLanguage];
        setSelectedTypeCategory(displayData.defaultDefinition.typeCategory);
        setSelectedKeyAttributes(displayData.defaultDefinition.keyAttributes);
        setSelectedImpactPurpose(displayData.defaultDefinition.impactPurpose);

        alert("Successfully deleted all card options from Firebase.");
        console.log("All card options have been deleted.");
        
      } catch (error) {
        console.error("Error deleting card options:", error);
        alert("An error occurred while deleting card options. Check the console for details.");
      }
    }
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
    const fetchTermSpecificOptions = async () => {
      if (!currentTermEntry.id) return;
  
      // This function now exclusively fetches from Firestore.
      // The `saveAllDefaultDefinitionsToFirebase` function is responsible for populating the initial data.
      setAllTypeCategoryOptions([]);
      setAllKeyAttributesOptions([]);
      setAllImpactPurposeOptions([]);
  
      try {
        const termOptionsDocRef = doc(db, 'cardOptions', currentTermEntry.id);
        const docSnap = await getDoc(termOptionsDocRef);
  
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (data.typeCategory) {
            setAllTypeCategoryOptions(mapToCardOptionValueArray(data.typeCategory));
          }
          if (data.keyAttributes) {
            setAllKeyAttributesOptions(mapToCardOptionValueArray(data.keyAttributes));
          }
          if (data.impactPurpose) {
            setAllImpactPurposeOptions(mapToCardOptionValueArray(data.impactPurpose));
          }
        } else {
          // If the document doesn't exist, it means the setup script hasn't been run for this term.
          // The options will be empty, which is the correct state.
          console.warn(`No cardOptions document found for termId: ${currentTermEntry.id}. Run the 'Save Defaults to DB' script.`);
        }
      } catch (error) {
        console.error("Error fetching term-specific card options from Firestore:", error);
      }
    };
  
    fetchTermSpecificOptions();
  }, [currentTermEntry.id]);


  // --- Fetch Saved Definitions from Firestore (Real-time) ---
  useEffect(() => {
    const definitionsCollection = collection(db, 'definitions');
    const q = query(definitionsCollection, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const definitionsData: Definition[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const termTextFromData = data.termText || data.term; // Use this for lookups
        definitionsData.push({
          id: doc.id,
          termId: data.termId || (allTermsData.find(atd => atd.en.term === termTextFromData || atd.de.term === termTextFromData)?.id), // Backfill termId using termTextFromData
          termLanguage: data.termLanguage || (termTextFromData && allTermsData.find(atd => atd.en.term === termTextFromData) ? 'en' : (termTextFromData ? 'de' : undefined)), // Infer language using termTextFromData
          termText: termTextFromData, // Fallback for older 'term' field
          typeCategory: typeof data.typeCategory === 'string' ? {type: 'text', content: data.typeCategory} : data.typeCategory,
          keyAttributes: typeof data.keyAttributes === 'string' ? {type: 'text', content: data.keyAttributes} : data.keyAttributes,
          impactPurpose: typeof data.impactPurpose === 'string' ? {type: 'text', content: data.impactPurpose} : data.impactPurpose,
          createdAt: data.createdAt,
          likes: data.likes || 0
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
      alert(T.alertPleaseSelectOptions);
      return;
    }
    const newDefinition: Definition = {
      typeCategory: selectedTypeCategory,
      keyAttributes: selectedKeyAttributes,
      impactPurpose: selectedImpactPurpose,
      termId: currentTermEntry.id, // Use language-neutral ID
      termLanguage: currentLanguage, // Save current language context
      termText: currentTerm, // Save the displayed term text
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
  
  const handleLike = async (definitionId: string, currentLikes: number) => {
    if (!definitionId) return;

    const alreadyLiked = likedDefinitionIds.includes(definitionId);
    const newLikesCount = alreadyLiked ? Math.max(0, (currentLikes || 0) - 1) : (currentLikes || 0) + 1;

    try {
      const definitionRef = doc(db, 'definitions', definitionId);
      await updateDoc(definitionRef, {
        likes: newLikesCount,
      });

      if (alreadyLiked) {
        setLikedDefinitionIds(prev => prev.filter(id => id !== definitionId));
      } else {
        setLikedDefinitionIds(prev => [...prev, definitionId]);
      }
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  // Effect to save likedDefinitionIds to localStorage
  useEffect(() => {
    localStorage.setItem('likedDefinitionIds', JSON.stringify(likedDefinitionIds));
  }, [likedDefinitionIds]);

  const handleShuffle = () => {
    setIsAnimating(false);
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
    setIsAnimating(true);
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
    setIsAnimating(false);
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
    } else if (activeInputMode === 'text') {
      if (!newOptionContent.content.trim()) {
        handleCloseInputInterface();
        return;
      }
      // Tag text content with the current language
      finalOptionToSave = { 
        ...newOptionContent, 
        content: newOptionContent.content.trim(), 
        language: currentLanguage 
      };
    }

    finalOptionToSave.id = `${finalOptionToSave.type}-${new Date().getTime()}`;

    const termOptionsDocRef = doc(db, 'cardOptions', currentTermEntry.id);

    try {
      await runTransaction(db, async (transaction: Transaction) => {
        const termDoc = await transaction.get(termOptionsDocRef);
        
        const currentData = termDoc.exists() ? termDoc.data() : {};
        const currentOptions = currentData[editingCategory] 
          ? mapToCardOptionValueArray(currentData[editingCategory]) 
          : [];

        // Avoid adding exact duplicates for text content
        const isDuplicate = currentOptions.some(opt => 
          opt.type === finalOptionToSave.type && 
          opt.content === finalOptionToSave.content &&
          opt.language === finalOptionToSave.language
        );

        if (!isDuplicate) {
          const updatedCategoryOptions = [...currentOptions, finalOptionToSave];
          
          const optionsToStore = updatedCategoryOptions.map(opt => {
            const optionData: any = { type: opt.type, content: opt.content, id: opt.id };
            if (opt.waveformData) {
              optionData.waveformData = opt.waveformData;
            }
            if (opt.language) {
              optionData.language = opt.language;
            }
            return optionData;
          });

          // This transaction now correctly updates the document in Firestore.
          transaction.set(termOptionsDocRef, { 
            ...currentData, 
            [editingCategory]: optionsToStore 
          }, { merge: true });

          // Update local state immediately, now correctly including all previous options.
          if (editingCategory === 'typeCategory') {
            setAllTypeCategoryOptions(updatedCategoryOptions);
            setSelectedTypeCategory(finalOptionToSave);
          } else if (editingCategory === 'keyAttributes') {
            setAllKeyAttributesOptions(updatedCategoryOptions);
            setSelectedKeyAttributes(finalOptionToSave);
          } else if (editingCategory === 'impactPurpose') {
            setAllImpactPurposeOptions(updatedCategoryOptions);
            setSelectedImpactPurpose(finalOptionToSave);
          }
        } else {
           // If it's a duplicate text, just select the existing one.
          const existingOption = currentOptions.find(opt => 
              opt.type === 'text' && 
              opt.content === finalOptionToSave.content && 
              opt.language === finalOptionToSave.language
          );
          if (existingOption) {
            if (editingCategory === 'typeCategory') setSelectedTypeCategory(existingOption);
            if (editingCategory === 'keyAttributes') setSelectedKeyAttributes(existingOption);
            if (editingCategory === 'impactPurpose') setSelectedImpactPurpose(existingOption);
          }
        }
      });
      handleCloseInputInterface();
    } catch (error) {
      console.error("Error saving new option with transaction:", error);
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
      alert(T.alertMicrophoneError);
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
  const renderCardInputInterface = (categoryPlaceholderKey: 'typeCategory' | 'keyAttributes' | 'impactPurpose') => {
    // Determine the actual placeholder text based on the category key and current language
    let actualPlaceholderText = '';
    if (categoryPlaceholderKey === 'typeCategory') {
      actualPlaceholderText = T.placeholderEnterNew(T.cardTitleTypeCategory.split('. ')[1] || 'Type/Category');
    } else if (categoryPlaceholderKey === 'keyAttributes') {
      actualPlaceholderText = T.placeholderEnterNew(T.cardTitleKeyAttributes.split('. ')[1] || 'Key Attributes');
    } else if (categoryPlaceholderKey === 'impactPurpose') {
      actualPlaceholderText = T.placeholderEnterNew(T.cardTitleImpactPurpose.split('. ')[1] || 'Purpose/Impact');
    }

    return (
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
          placeholder={actualPlaceholderText}
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
                {T.placeholderDrawing}
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
                aria-label={T.labelImageInput}
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
                {T.placeholderImageUpload}
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
                    {T.statusRecording} {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </Text>
                )}
              </Box>
               {!isRecording && !audioURL && (
                <Text fontSize="16px" fontWeight="medium" color="gray.300" mt={2} pb="3px">{T.placeholderTapToRecord}</Text>
              )}
            </VStack>
          )}
        </Flex>
      )}
    </VStack>
  );
};

  // --- Component to display card content (text or drawing) ---
  const CardContentDisplay = ({ option, displayContext = 'mainCard', language }: { option: CardOptionValue, displayContext?: 'mainCard' | 'savedList', language: 'en' | 'de' }) => {
    // State and refs for audio popover in savedList
    const [popoverWaveformData, setPopoverWaveformData] = useState<number[] | null>(null);
    const [isPopoverAudioPlaying, setIsPopoverAudioPlaying] = useState(false);
    const popoverAudioRef = useRef<HTMLAudioElement>(null);
    const popoverWaveformCanvasRef = useRef<HTMLCanvasElement>(null);
    const localAudioContextRef = useRef<AudioContext | null>(null);
    // Use a unique disclosure state for each popover instance if they are independent
    // However, if only one popover can be open at a time for a CardContentDisplay instance, one state is fine.
    // For simplicity and assuming one media popover per card item at a time:
    const { isOpen: isMediaPopoverOpen, onOpen: onOpenMediaPopover, onClose: onCloseMediaPopover } = useDisclosure();

    const [isHovered, setIsHovered] = useState(false);
    const T = uiTranslations[language];

    // State and refs for audio display in mainCard
    const [mainCardWaveformData, setMainCardWaveformData] = useState<number[] | null>(null);
    const [isMainCardAudioPlaying, setIsMainCardAudioPlaying] = useState(false);
    const mainCardAudioRef = useRef<HTMLAudioElement>(null);
    const mainCardWaveformCanvasRef = useRef<HTMLCanvasElement>(null);
    // audioContextRef can be reused or a new one for mainCard if specific config is needed

    // Effect to load and process audio for popover in savedList
    useEffect(() => {
      let isActive = true;
      if (option.type === 'audio' && displayContext === 'savedList' && option.content && isMediaPopoverOpen) { // Only process if popover is open
        // Check for pre-computed waveform data first
        if (option.waveformData && option.waveformData.length > 0) {
          if (isActive) setPopoverWaveformData(option.waveformData);
        } else if (!popoverWaveformData || popoverWaveformData.length === 0) { // Only process if not already set and no pre-computed data or if data is empty
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
      // Clear waveform data when popover closes to ensure fresh load next time
      if (!isMediaPopoverOpen && isActive) {
        setPopoverWaveformData(null);
      }
      return () => { isActive = false };
    }, [option, displayContext, popoverWaveformData, isMediaPopoverOpen]);

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
      if (popoverWaveformData && popoverWaveformCanvasRef.current && displayContext === 'savedList' && option.type === 'audio' && isMediaPopoverOpen) { // Added isMediaPopoverOpen
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
    }, [popoverWaveformData, option, displayContext, windowSize, isMediaPopoverOpen]); // Added windowSize and isMediaPopoverOpen

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

    // NEW simplified rendering for 'savedList' context to match the boxed layout
    if (displayContext === 'savedList') {
      if (option.type === 'text') {
        return (
          <Text
            textAlign="left"
            fontSize="16px"
            fontWeight="medium"
            color="black"
            title={option.content}
            w="100%"
          >
            {option.content}
          </Text>
        );
      } else if (option.type === 'audio') {
        return (
          <Popover isOpen={isMediaPopoverOpen} onOpen={onOpenMediaPopover} onClose={onCloseMediaPopover} placement="top" gutter={10} >
            <PopoverTrigger>
              <Box as="span" cursor="pointer" onClick={onOpenMediaPopover} display="inline-flex" alignItems="center" justifyContent="center">
                <Mic size={23} strokeWidth={2.5}/>
              </Box>
            </PopoverTrigger>
            <PopoverContent p={3} w="250px" h="250px" bg="white" alignItems="center" justifyContent="center" borderColor="white" borderWidth="0px" boxShadow="lg" borderRadius="7px">
              <PopoverArrow />
             
              
              <PopoverBody>
                {option.content ? (
                  <>
                    <canvas 
                      ref={popoverWaveformCanvasRef}
                      style={{ width: "220px", height: '40px', cursor: 'pointer', borderRadius: '0px', backgroundColor: 'white' }}
                      onClick={() => {
                        if (popoverAudioRef.current) {
                          if (isPopoverAudioPlaying) popoverAudioRef.current.pause();
                          else popoverAudioRef.current.play();
                        }
                      }}
                    />
                    <audio 
                      ref={popoverAudioRef} 
                      src={option.content} 
                      onPlay={() => setIsPopoverAudioPlaying(true)} 
                      onPause={() => setIsPopoverAudioPlaying(false)} 
                      onEnded={() => setIsPopoverAudioPlaying(false)} 
                      style={{ display: 'none' }} 
                    />
                   
                  </>
                ) : <Text fontSize="sm">{T.noAudioContent}</Text>}
              </PopoverBody>
            </PopoverContent>
          </Popover>
        );
      } else if (option.type === 'image') {
        return (
          <Popover isOpen={isMediaPopoverOpen} onOpen={onOpenMediaPopover} onClose={onCloseMediaPopover} placement="top" gutter={10} >
            <PopoverTrigger>
              <Box as="span" cursor="pointer" onClick={onOpenMediaPopover} display="inline-flex" alignItems="center" justifyContent="center">
                <Image size={23} strokeWidth={2.5}/>
              </Box>
            </PopoverTrigger>
            <PopoverContent w="250px" h="250px" p={1} bg="white" borderColor="white" alignItems="center" justifyContent="center" borderWidth="0px" boxShadow="lg" borderRadius="10px">
              <PopoverArrow />
             
              <PopoverBody>
                {option.content ? <ChakraImage src={option.content} alt="User image" w="220px" h="220px" objectFit="contain" borderRadius="7px" /> : <Text fontSize="sm">{T.noImageContent}</Text>}
              </PopoverBody>
            </PopoverContent>
          </Popover>
        );
      } else if (option.type === 'drawing') {
        return (
          <Popover isOpen={isMediaPopoverOpen} onOpen={onOpenMediaPopover} onClose={onCloseMediaPopover} placement="top" gutter={10} >
            <PopoverTrigger>
              <Box as="span" cursor="pointer" onClick={onOpenMediaPopover} display="inline-flex" alignItems="center" justifyContent="center">
                <Edit3 size={23} strokeWidth={2.5}/>
              </Box>
            </PopoverTrigger>
            <PopoverContent w="250px" h="250px" alignItems="center" justifyContent="center" p={1} bg="white" borderColor="white" borderWidth="0px" boxShadow="lg" borderRadius="10px">
              <PopoverArrow />
              
              <PopoverBody>
                {option.content ? <ChakraImage src={option.content} alt="User drawing" w="220px" h="220px" objectFit="contain" borderRadius="sm" /> : <Text fontSize="sm">{T.noDrawingContent}</Text>}
              </PopoverBody>
            </PopoverContent>
          </Popover>
        );
      }
      return <Text>?</Text>; // Fallback for unknown type in savedList
    }

    // --- Original rendering logic for mainCard context and other contexts (text, drawing, image, audio) ---
    // This part remains unchanged for now, handling the main card displays.

    if (option.type === 'drawing' || option.type === 'image') {
      // Current mainCard rendering for drawing/image - This is NOT for savedList anymore
      return <ChakraImage 
        src={option.content} 
        alt={option.type === 'drawing' ? "User drawing" : "User image"} 
        objectFit="cover" 
        w="100%" 
        h="100%" 
        borderRadius={option.type === 'image' || option.type === 'drawing' ? "32px" : "0px"}
        p={3}
      />;
    }

    if (option.type === 'audio') {
      // Current mainCard rendering for audio - This is NOT for savedList anymore
        return (
          <Box w="100%" p={3}> 
            <canvas 
              ref={mainCardWaveformCanvasRef} 
              width={10} 
              height={60}
              style={{ 
                width: '100%', 
                height: '60px', 
                border: "0px solid #e2e8f0", 
                borderRadius: "md",
                cursor: 'pointer'
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
            <audio 
              ref={mainCardAudioRef} 
              src={option.content} 
              style={{ display: 'none' }}
              onPlay={() => setIsMainCardAudioPlaying(true)}
              onPause={() => setIsMainCardAudioPlaying(false)}
              onEnded={() => setIsMainCardAudioPlaying(false)}
            />
          </Box>
        );
    }
    
    // Default for mainCard or other contexts (text)
    return (
      <Flex
        h="100%"
        w="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={6}
        borderRadius="30px"
        position="relative"
      >
        {/* Text content fills available space, centered */}
        <Box flexGrow={1} display="flex" alignItems="center" w="100%">
            <Text
              fontSize="md"
              textAlign="left"
              fontWeight="medium"
              lineHeight="1.3"
              whiteSpace="pre-wrap"
              overflowWrap="break-word"
              w="100%"
            >
              {option.content}
            </Text>
        </Box>
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
          <Button size="sm" onClick={saveAllDefaultDefinitionsToFirebase} mr={4}>Save Defaults to DB</Button>
          <Button size="sm" onClick={handleDeleteAllCardOptions} mr={4} variant="outline" colorScheme="red">Delete All Options</Button>
      
          
          <HStack spacing={3} pr={7}>
            <HStack
              spacing={0}
              bg="blackAlpha.200"
              borderRadius="md"
              p="2px"
            >
              <Button
                size="sm"
                variant="ghost"
                bg={currentLanguage === 'en' ? 'white' : 'transparent'}
                color={'black'}
                onClick={() => {
                    setIsAnimating(false);
                    setCurrentLanguage('en');
                }}
                _hover={{ bg: currentLanguage === 'en' ? 'white' : 'whiteAlpha.500' }}
                w="45px"
                fontWeight="bold"
                borderRadius="md"
              >
                EN
              </Button>
              <Button
                size="sm"
                variant="ghost"
                bg={currentLanguage === 'de' ? 'white' : 'transparent'}
                color={'black'}
                onClick={() => {
                    setIsAnimating(false);
                    setCurrentLanguage('de');
                }}
                _hover={{ bg: currentLanguage === 'de' ? 'white' : 'whiteAlpha.500' }}
                w="45px"
                fontWeight="bold"
                borderRadius="md"
              >
                DE
              </Button>
            </HStack>
            <IconButton aria-label={T.labelHelpIcon} icon={<HelpCircle size={23} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} onClick={onOpenHelpModal} />
            <IconButton aria-label={T.labelMenuIcon} icon={<MenuIconFeather size={23} strokeWidth={2.5} />} variant="ghost" color="black" _hover={{ color: "white" }} />
          </HStack>
        </Flex>

        {/* Term Display Section */}
        <VStack spacing={5} align="center" mt={10}>
          <Text fontSize="17px" color="white" letterSpacing="4px">{currentPhonetic || ''}</Text> {/* Display phonetic or empty string */}
          <HStack alignItems="center">
            <IconButton aria-label={T.labelPreviousTerm} icon={<ChevronLeft size={23} strokeWidth={2.5} />} variant="ghost" color="black" bg="whiteAlpha.300" _hover={{ bg: "white" }} borderRadius="10px" onClick={handlePreviousTerm} mr="20px" /> {/* TRANSLATED */}
            <Popover
              placement="top"
              gutter={-50}
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
                  w="820px"
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
                h="60px" // Preserving user's style
                w="1254px" // Preserving user's style
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
                    <Text>{T.noEtymology}</Text>
                  </PopoverBody>
                )}
              </PopoverContent>
            </Popover>
            <IconButton aria-label={T.labelNextTerm} icon={<ChevronRight size={23} strokeWidth={2.5} />} variant="ghost"  bg="whiteAlpha.300" _hover={{ bg: "white" }} borderRadius="10px" onClick={handleNextTerm} ml="20px" /> {/* TRANSLATED */}
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
                {T.cardTitleTypeCategory} {/* TRANSLATED */}
              </Heading>
              {editingCategory === 'typeCategory' ? (
                renderCardInputInterface('typeCategory') // CORRECTED: Pass key for translation lookup
              ) : (
                <CardStack
                  items={typeCategoryOptions}
                  activeItem={selectedTypeCategory}
                  renderCard={(option: CardOptionValue) => <CardContentDisplay option={option} language={currentLanguage} />}
                  isAnimating={isAnimating}
                />
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
                    <IconButton aria-label={T.labelCancel} icon={<X size={23} strokeWidth={2.5}/>} onClick={handleCloseInputInterface} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm" /> {/* TRANSLATED */}
                    {/* Toolbar icons always visible when editingCategory is active */}
                    <HStack spacing={3}> 
                      <IconButton aria-label={T.labelTextInput} icon={<Type size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'text' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('text')} /> {/* TRANSLATED */}
                      <IconButton aria-label={T.labelDrawInput} icon={<Edit3 size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'drawing' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('drawing')} /> {/* TRANSLATED */}
                      <IconButton aria-label={T.labelVoiceInput} icon={<Mic size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'voice' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('voice')} /> {/* TRANSLATED */}
                      <IconButton aria-label={T.labelImageInput} icon={<Image size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'image' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('image')} /> {/* TRANSLATED */}
                    </HStack>
                    <IconButton aria-label={T.labelSave} icon={<Check size={23} strokeWidth={2.5}/>} onClick={handleSaveNewOption} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm" isDisabled={isRecording} /> {/* TRANSLATED */}
                  </>
                ) : (
                  <>
                    <IconButton 
                      aria-label={T.labelPreviousOption} 
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
                      aria-label={T.labelAddNewOption} 
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
                      aria-label={T.labelNextOption} 
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
              <Text fontSize="16px" fontWeight="medium" pb={9} color="black" whiteSpace="pre-line">{T.textThat.toUpperCase()}</Text> {/* TRANSLATED */}
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
                {T.cardTitleKeyAttributes} {/* TRANSLATED */}
              </Heading>
              {editingCategory === 'keyAttributes' ? (
                renderCardInputInterface('keyAttributes') // CORRECTED: Pass key for translation lookup
              ) : (
                <CardStack
                  items={keyAttributesOptions}
                  activeItem={selectedKeyAttributes}
                  renderCard={(option: CardOptionValue) => <CardContentDisplay option={option} language={currentLanguage} />}
                  isAnimating={isAnimating}
                />
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
                    <IconButton aria-label={T.labelCancel} icon={<X size={23} strokeWidth={2.5}/>} onClick={handleCloseInputInterface} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm"/> {/* TRANSLATED */}
                    {/* Toolbar icons always visible when editingCategory is active */}
                    <HStack spacing={3}> 
                      <IconButton aria-label={T.labelTextInput} icon={<Type size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'text' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('text')} /> {/* TRANSLATED */}
                      <IconButton aria-label={T.labelDrawInput} icon={<Edit3 size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'drawing' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('drawing')} /> {/* TRANSLATED */}
                      <IconButton aria-label={T.labelVoiceInput} icon={<Mic size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'voice' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('voice')} /> {/* TRANSLATED */}
                      <IconButton aria-label={T.labelImageInput} icon={<Image size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'image' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('image')} /> {/* TRANSLATED */}
                    </HStack>
                    <IconButton aria-label={T.labelSave} icon={<Check size={23} strokeWidth={2.5}/>} onClick={handleSaveNewOption} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm" isDisabled={isRecording}/> {/* TRANSLATED */}
                  </>
                ) : (
                  <>
                    <IconButton 
                      aria-label={T.labelPreviousOption} 
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
                      aria-label={T.labelAddNewOption} 
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
                      aria-label={T.labelNextOption} 
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
              <Text fontSize="16px" fontWeight="medium" pb={9} color="black">{T.textTo.toUpperCase()}</Text> {/* TRANSLATED */}
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
                {T.cardTitleImpactPurpose} {/* TRANSLATED */}
              </Heading>
              {editingCategory === 'impactPurpose' ? (
                renderCardInputInterface('impactPurpose') // CORRECTED: Pass key for translation lookup
              ) : (
                <CardStack
                  items={impactPurposeOptions}
                  activeItem={selectedImpactPurpose}
                  renderCard={(option: CardOptionValue) => <CardContentDisplay option={option} language={currentLanguage} />}
                  isAnimating={isAnimating}
                />
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
                    <IconButton aria-label={T.labelCancel} icon={<X size={23} strokeWidth={2.5}/>} onClick={handleCloseInputInterface} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm"/> {/* TRANSLATED */}
                    {/* Toolbar icons always visible when editingCategory is active */}
                    <HStack spacing={3}> 
                      <IconButton aria-label={T.labelTextInput} icon={<Type size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'text' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('text')} /> {/* TRANSLATED */}
                      <IconButton aria-label={T.labelDrawInput} icon={<Edit3 size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'drawing' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('drawing')} /> {/* TRANSLATED */}
                      <IconButton aria-label={T.labelVoiceInput} icon={<Mic size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'voice' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('voice')} /> {/* TRANSLATED */}
                      <IconButton aria-label={T.labelImageInput} icon={<Image size={23} strokeWidth={2.5}/>} variant="ghost" color={activeInputMode === 'image' ? 'black' : 'gray.300'} _hover={{ color: "black" }} size="sm" onClick={() => handleChangeInputMode('image')} /> {/* TRANSLATED */}
                    </HStack>
                    <IconButton aria-label={T.labelSave} icon={<Check size={23} strokeWidth={2.5}/>} onClick={handleSaveNewOption} variant="ghost" color="gray.300" _hover={{ color: "black" }} size="sm" isDisabled={isRecording}/> {/* TRANSLATED */}
                  </>
                ) : (
                  <>
                    <IconButton 
                      aria-label={T.labelPreviousOption} 
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
                      aria-label={T.labelAddNewOption} 
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
                      aria-label={T.labelNextOption} 
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
              aria-label={T.labelSaveCombination} // TRANSLATED
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
          <VStack spacing={6} mt={16} w="100%" align="stretch" bg="transparent" p={6} borderRadius="0" pt={138} pl={110}>
            <Flex  py={5} px={5} justify="space-between" align="center" w="100%" mb={3}>
              <Text borderRadius="10px" bg="whiteAlpha.300" fontSize="12px" color="black" fontWeight="medium" px="12px" py="10px" borderWidth="px" borderColor="transparent">
                {T.definitionsAddedFor(savedDefinitions.filter(def => def.termId === currentTermEntry.id).length, currentTerm)}
              </Text>
              <HStack spacing={8} pr="85px" >
        
                <Menu gutter={0}>
                  <MenuButton 
                    as={Button} 
                    rightIcon={<ChevronDown size={20} strokeWidth={2.5} />} 
                    fontSize="12px" 
                    px="12px" 
                    py="10px" 
                    borderRadius="10px" 
                    bg="whiteAlpha.300" 
                    color="black" 
                    fontWeight="medium"
                    w="110px" // Explicit width for the button
                  >
                    {/* UPDATED: Ensure this part uses the T object for translations */}
                    {currentLanguage === 'de' ? 
                      (sortOrder === 'recent' ? uiTranslations.de.sortRecent : sortOrder === 'popular' ? uiTranslations.de.sortPopular : uiTranslations.de.sortRandom) :
                      (sortOrder.toUpperCase())}
                  </MenuButton>
                  <MenuList 
                    
                    bg="white" 
                        borderColor="whiteAlpha.300" 
                        borderWidth="3px"
                    borderRadius="10px" 
                    py="0px" // Remove padding from MenuList, apply to MenuItem
                    minW="0" // Allow the width to be set by items or explicit width prop
                    w="110px" // Match button width
                  >
                    {sortOrder !== 'recent' && (
                      <MenuItem 
                        onClick={() => setSortOrder('recent')} 
                        _hover={{ bg: "whiteAlpha.300" }} 
                        color="black" 
                        fontSize="12px" 
                        fontWeight="medium" 
                        px="12px" 
                        py="10px"
                      >
                        {T.sortRecent.toUpperCase()} {/* TRANSLATED */}
                      </MenuItem>
                    )}
                    {sortOrder !== 'popular' && (
                      <MenuItem 
                        onClick={() => setSortOrder('popular') } 
                        _hover={{ bg: "whiteAlpha.300" }} 
                        color="black" 
                        fontSize="12px" 
                        fontWeight="medium" 
                        px="12px" 
                        py="10px"
                      >
                        {T.sortPopular.toUpperCase()} {/* TRANSLATED */}
                      </MenuItem>
                    )}
                    {sortOrder !== 'random' && (
                      <MenuItem 
                        onClick={() => setSortOrder('random')} 
                        _hover={{ bg: "whiteAlpha.300" }} 
                        color="black" 
                        fontSize="12px" 
                        fontWeight="medium" 
                        px="12px" 
                        py="10px"
                      >
                        {T.sortRandom.toUpperCase()} {/* TRANSLATED */}
                      </MenuItem>
                    )}
                  </MenuList>
                </Menu>
                <InputGroup w="200px">
                  <InputLeftElement pointerEvents="none">
                    <Search size={23} strokeWidth={2.5} color="black" />
                  </InputLeftElement>
                  <Input
                    type="text"
                    placeholder={T.searchPlaceholder} // TRANSLATED
                    fontWeight="medium"
                    fontSize="12px"
                    borderRadius="10px"
                    bg="whiteAlpha.300"
                    borderWidth="0px"
                    borderColor="whiteAlpha.300"
                    _placeholder={{ color: 'black' }}
                    color="black"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    textTransform="none"
                  />
                </InputGroup>
              </HStack>
            </Flex>

            {savedDefinitions
              .filter((def: Definition) => def.termId === currentTermEntry.id) // Filter by termId
              .filter((def: Definition) => {
                if (!searchQuery) return true; // If no search query, show all for the current term
                const searchTerm = searchQuery.toLowerCase();
                // Search in termText (which is language specific) and card contents
                return (
                  (def.termText && def.termText.toLowerCase().includes(searchTerm)) ||
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
              .map((def: Definition, index: number) => {
                // Determine if the definition consists only of non-text (icon) types
                const isIconOnlyDefinition =
                  def.typeCategory.type !== 'text' &&
                  def.keyAttributes.type !== 'text' &&
                  def.impactPurpose.type !== 'text';

                // Conditionally set flex properties for each part of the definition
                let typeFlex, attributesFlex, purposeFlex;

                if (isIconOnlyDefinition) {
                  // If all parts are icons, make them share the available space equally
                  typeFlex = { base: 1 };
                  attributesFlex = { base: 1 };
                  purposeFlex = { base: 1 };
                } else {
                  // Otherwise, use existing logic: flexible for text, fixed for single icons
                  typeFlex =
                    def.typeCategory.type === 'text'
                      ? { base: '1 1 auto', md: '1 1 auto' }
                      : { base: '0 0 80px', md: '0 0 80px' };
                  attributesFlex =
                    def.keyAttributes.type === 'text'
                      ? { base: '3 1 auto', md: '3 1 auto' }
                      : { base: '0 0 80px', md: '0 0 80px' };
                  purposeFlex =
                    def.impactPurpose.type === 'text'
                      ? { base: '2 1 auto', md: '2 1 auto' }
                      : { base: '0 0 74px', md: '0 0 74px' };
                }
                
                return (
              <VStack
                key={def.id || index}
                align="stretch"
                w="100%"
                
              >
                {/* Main Flex container for one definition row, arranging boxes and like button */}
                <Flex
                
                  direction="row"
                  alignItems="stretch" // Stretch items to fill height if needed
                  justifyContent="space-between"
                  py={1} // User adjusted py={0}
                  px={5} // User adjusted px={5}
                  
                  w="100%"
                  bg="transparent"
                  minH="120px" // Ensure a minimum height for the row
                >
                  {/* HStack for the series of bordered definition part boxes */}
                  <HStack spacing={0} flexGrow={1} mr={3} alignItems="stretch" pr="25px" >
                    {/* Box 1: typeCategory */}
                    <Box 
                      borderTopLeftRadius="10px"
                      borderBottomLeftRadius="10px"
                      borderRightWidth="0px" 
                      borderTopWidth="0px" 
                      borderBottomWidth="0px" 
                      borderLeftWidth="0px" 
                      borderColor="transparent" 
                      bg="white"
                      mr="4px"
                      p={5} 
                      display="flex" 
                      alignItems="center" 
                      justifyContent={def.typeCategory.type === 'text' ? "flex-start" : "center"}
                      flex={typeFlex}
                      minH="100%"
                    >
                      <CardContentDisplay option={def.typeCategory} displayContext="savedList" language={currentLanguage} />
                    </Box>

                    {/* Box 2: "THAT" */}
                    <Box 
                      borderTopWidth="0px" 
                      borderBottomWidth="0px" 
                      borderRightWidth="0px" 
                      borderColor="white" 
                      p={5}  
                      bg="white"
                      mr="4px"
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center" 
                      flex={{ base: "0 0 80px", md: "0 0 80px" }} 
                      minH="100%"
                    >
                      <Text fontSize="16px" fontWeight="medium" color="black">{T.textThat.toUpperCase()}</Text>
                    </Box>

                    {/* Box 3: keyAttributes */}
                    <Box 
                      borderTopWidth="0px" 
                      borderBottomWidth="0px" 
                      borderRightWidth="0px" 
                      borderColor="white"  
                      p={5}  
                      bg="white"
                      mr="4px"
                      display="flex" 
                      alignItems="center" 
                      justifyContent={def.keyAttributes.type === 'text' ? "flex-start" : "center"} 
                      flex={attributesFlex}
                      minH="100%"
                    >
                      <CardContentDisplay option={def.keyAttributes} displayContext="savedList" language={currentLanguage} />
                    </Box>

                    {/* Box 4: "TO" */}
                    <Box 
                      borderTopWidth="0px" 
                      borderBottomWidth="0px" 
                      borderRightWidth="0px" 
                      borderColor="white" 
                      p={5}  
                      bg="white"
                      mr="4px"
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center" 
                      flex={{ base: "0 0 80px", md: "0 0 80px" }} 
                      minH="100%"
                    >
                      <Text fontSize="16px" fontWeight="medium" color="black">{T.textTo.toUpperCase()}</Text>
                    </Box>

                    {/* Box 5: impactPurpose */}
                    <Box 
                      borderTopRightRadius="10px"
                      borderBottomRightRadius="10px"
                      borderTopWidth="0px" 
                      borderBottomWidth="0px" 
                      borderRightWidth="0px" 
                      borderColor="white"
                      bg="white"
                      mr="4px" 
                      p={5}  
                      display="flex" 
                      alignItems="center" 
                      justifyContent={def.impactPurpose.type === 'text' ? "flex-start" : "center"}
                      flex={purposeFlex}
                      minH="100%"
                    >
                      <CardContentDisplay option={def.impactPurpose} displayContext="savedList" language={currentLanguage} />
                    </Box>
                  </HStack>
                  
                  {/* Like button: Remains to the right */}
                  <IconButton 
                    aria-label={T.labelLikeDefinition} 
                    icon={<ThumbsUp size={23} strokeWidth={2.5} />} 
                    bg="whiteAlpha.300"
                    color="black"
                    borderRadius="10px"
                    onClick={() => handleLike(def.id!, def.likes || 0)}
                    _hover={{ bg: "white", color: "black" }} 
                    _active={{ bg: "white", color: "black" }} 
                    size="md" 
                    alignSelf="center"
                  />
                </Flex>
              </VStack>
            )})}
          </VStack>
        )}
      </VStack>

      {/* Help Modal */}
      <Modal isOpen={isHelpModalOpen} onClose={onCloseHelpModal} isCentered>
        <ModalOverlay />
        <ModalContent bg="white" color="black" borderRadius="xl" boxShadow="xl" mx={4}>
          <ModalHeader pt={8} pl={8} pr={8} fontSize="16px" fontWeight="bold" borderBottomWidth="0px" borderColor="white">
            {T.helpModalTitle} {/* TRANSLATED */}
          </ModalHeader>
          <ModalBody pb={6} pl={8} pr={8}>
            <VStack spacing={4} align="stretch">
              <Text fontSize="16" lineHeight="tall">
                {T.helpModalIntro} {/* TRANSLATED */}
              </Text>
              <Text fontSize="16" lineHeight="tall">
                {T.helpModalStep1} {/* TRANSLATED */}
              </Text>
              <Text fontSize="16" lineHeight="tall">
                {T.helpModalStep2} {/* TRANSLATED */}
              </Text>
              <Text fontSize="16" lineHeight="tall">
                {T.helpModalStep3} {/* TRANSLATED */}
              </Text>
              <Text fontSize="16" lineHeight="tall">
                {T.helpModalStep4} {/* TRANSLATED */}
              </Text>
             
            </VStack>
          </ModalBody>
          
        
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default App;
