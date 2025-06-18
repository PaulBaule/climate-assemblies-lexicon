import { memo, useCallback, useState, useEffect } from 'react';
import { Box, HStack, IconButton, Text } from '@chakra-ui/react';
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Handle,
  Position,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeProps,
  type CoordinateExtent,
  type Connection,
  ConnectionMode,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import { getStorage, ref as storageRef, uploadString } from 'firebase/storage';
import { toPng } from 'html-to-image';
import { Camera, Maximize } from 'react-feather';
import 'reactflow/dist/style.css';
import type { TermData } from '../types';
import { useOutletContext } from 'react-router-dom';


// DUPLICATED from App.tsx as requested
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

const snapGrid: [number, number] = [20, 20];
const nodeExtent: CoordinateExtent = [
  [-Infinity, -Infinity],
  [Infinity, Infinity],
];

const CustomNode = memo(({ data }: NodeProps<{ label: string }>) => {
  return (
    <Box
      bg="whiteAlpha.600"
      color="black"
      borderRadius="10px"
      width={200}
      minHeight={20}
      display="flex"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      fontSize="14px"
      fontWeight="bold"
      px={4}
    >
      <Handle
        type="source"
        position={Position.Top}
        style={{ background: 'white', width: '3px', height: '3px' }}
        id="t"
      />
      <Handle
        type="source"
        position={Position.Left}
        style={{ background: 'white', width: '3px', height: '3px' }}
        id="l"
      />
      <div>{data.label}</div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'white', width: '3px', height: '3px' }}
        id="r"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'white', width: '3px', height: '3px' }}
        id="b"
      />
    </Box>
  );
});

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = allTermsData.map((term, index) => ({
  id: term.id,
  type: 'custom',
  data: { label: term.en.term }, // Default to English
  position: {
    x: (index % 5) * 240,
    y: Math.floor(index / 5) * 120,
  },
}));

const initialEdges: Edge[] = [];

const translateExtent: CoordinateExtent = [[-50, -50], [1250, 550]];

const storage = getStorage();

const ActionBar = () => {
  const { fitView } = useReactFlow();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccessMessage) {
      timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showSuccessMessage]);

  const handleFitView = () => {
    fitView();
  };

  const handleScreenshot = useCallback(() => {
    const pane = document.querySelector('.react-flow__viewport');
    if (!pane) {
      alert('Could not find flow to screenshot.');
      return;
    }
    setIsSaving(true);
    toPng(pane as HTMLElement, {
      height: 1080,
      width: 1920,
      style: {
        transform: 'scale(1)', // Ensure the export is not scaled
      }
    })
      .then((dataUrl: string) => {
        const ref = storageRef(storage, `screenshots/overview-${Date.now()}.png`);
        uploadString(ref, dataUrl, 'data_url').then(() => {
          console.log('Screenshot saved to Firebase!');
          setIsSaving(false);
          setShowSuccessMessage(true);
        }).catch((err) => {
          console.error(err);
          alert('Could not save screenshot.');
          setIsSaving(false);
        });
      })
      .catch((err) => {
        console.error(err);
        alert('Could not generate screenshot.');
        setIsSaving(false);
      });
  }, []);

  return (
    <>
      <HStack
        position="absolute"
        bottom="20px"
        left="50%"
        transform="translateX(-50%)"
        zIndex="10"
        spacing={4}
      >
        <IconButton
          aria-label="Fit view"
          icon={<Maximize size={23} strokeWidth={2.5} />}
          onClick={handleFitView}
          variant="solid"
          bg="whiteAlpha.300"
          color="black"
          borderRadius="10px"
          _hover={{ bg: 'white' }}
          _focus={{ boxShadow: 'none' }}
        />
        <IconButton
          aria-label="Save screenshot"
          icon={<Camera size={23} strokeWidth={2.5} />}
          onClick={handleScreenshot}
          isLoading={isSaving}
          variant="solid"
          bg="whiteAlpha.300"
          color="black"
          borderRadius="10px"
          _hover={{ bg: 'white' }}
          _focus={{ boxShadow: 'none' }}
        />
      </HStack>
      {showSuccessMessage && (
        <Box
          position="absolute"
          bottom="29px"
        right="67px"
   
   
          zIndex="10"
        >
          <Text
            fontSize="14px"
            fontWeight="bold"
            color="white"
            textTransform="uppercase"
            userSelect="none"
          >
            SCREENSHOT SAVED TO DATABASE
          </Text>
        </Box>
      )}
    </>
  );
}

const FlowComponent = () => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { currentLanguage } = useOutletContext<{ currentLanguage: 'en' | 'de' }>();

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const termData = allTermsData.find((term) => term.id === node.id);
        if (termData) {
          return {
            ...node,
            data: {
              ...node.data,
              label: termData[currentLanguage].term,
            },
          };
        }
        return node;
      })
    );
  }, [currentLanguage, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'white', strokeWidth: 3 } }, eds)),
    [setEdges]
  );

  return (
    <Box style={{ height: 'calc(100vh - 80px)', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        translateExtent={translateExtent}
        panOnDrag={false}
        selectionOnDrag={true}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <ActionBar />
      </ReactFlow>
    </Box>
  );
}

const OverviewPage = () => {
  return (
    <ReactFlowProvider>
      <FlowComponent />
    </ReactFlowProvider>
  );
};

export default OverviewPage;

function useNodesState(initialNodes: Node<any>[]): [Node<any>[], React.Dispatch<React.SetStateAction<Node<any>[]>>, OnNodesChange] {
    const [nodes, setNodes] = useState(initialNodes);
    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );

    return [nodes, setNodes, onNodesChange];
}

function useEdgesState(initialEdges: Edge<any>[]): [Edge<any>[], React.Dispatch<React.SetStateAction<Edge<any>[]>>, OnEdgesChange] {
    const [edges, setEdges] = useState(initialEdges);
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );

    return [edges, setEdges, onEdgesChange];
} 