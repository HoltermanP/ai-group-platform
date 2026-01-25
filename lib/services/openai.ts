import OpenAI from 'openai';

// Check of we in een build omgeving zijn
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                   (process.env.NODE_ENV === 'production' && !process.env.VERCEL && typeof window === 'undefined');

if (!process.env.OPENAI_API_KEY && !isBuildTime) {
  console.warn('OPENAI_API_KEY is not set in environment variables');
}

export const openai = isBuildTime ? null : (process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null);

export interface SafetyIncidentForAnalysis {
  incidentId: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  discipline: string | null;
  location: string | null;
  impact: string | null;
  mitigation: string | null;
  affectedSystems: string | null;
  safetyMeasures: string | null;
  riskAssessment: string | null;
  photos?: string[]; // Foto URLs voor analyse
}

export interface SuggestedToolboxTopic {
  topic: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  suggestedItems?: string[];
}

export interface IncidentAnalysisTemplate {
  // 1. Basisgegevens
  basisgegevens?: {
    datumIncident?: string;
    tijd?: string;
    locatie?: string;
    projectWerk?: string;
    betrokkenOrganisaties?: string;
    betrokkenPersonen?: string; // Functie, geen namen
    typeIncident?: string; // ongeval, bijna-ongeval, onveilige situatie
  };
  // 2. Feitenrelaas
  feitenrelaas?: string;
  // 3. Afwijking
  afwijking?: string;
  // 4. Directe oorzaken
  directeOorzaken?: {
    technisch?: string;
    organisatorisch?: string;
    menselijk?: string;
  };
  // 5. Achterliggende oorzaken
  achterliggendeOorzaken?: {
    beleidAfspraken?: string;
    ontwerpVoorbereiding?: string;
    planningTijdsdruk?: string;
    toezichtControle?: string;
    opleidingInstructie?: string;
    cultuurGedrag?: string;
  };
  // 6. Barrières
  barrieres?: {
    maatregelen?: string; // Welke maatregelen hadden het incident moeten voorkomen
    gefaaldeBarrieres?: string; // Welke barrières faalden
    waaromGefaald?: string; // Waarom faalden deze barrières
  };
  // 7. Gevolgen
  gevolgen?: {
    letsel?: string;
    materieleSchade?: string;
    verstoringWerkOmgeving?: string;
    potentiëleErnst?: string; // Potentiële ernst bij andere afloop
  };
  // 8. Lessen
  lessen?: string;
  // 9. Maatregelen
  maatregelen?: Array<{
    maatregel: string;
    type: string; // technisch / organisatorisch / gedrag
    verantwoordelijke: string;
    deadline: string;
  }>;
  // 10. Borging
  borging?: {
    controleUitvoering?: string; // Hoe wordt gecontroleerd dat maatregelen zijn uitgevoerd
    evaluatieEffect?: string; // Hoe en wanneer wordt effect geëvalueerd
    delenLessen?: string; // Hoe worden lessen gedeeld
  };
}

export interface AIAnalysisResult {
  summary: string;
  recommendations: string[];
  suggestedToolboxTopics: SuggestedToolboxTopic[];
  riskAssessment: string;
  preventiveMeasures: string[];
  // Nieuwe sjabloon structuur
  incidentAnalysis?: IncidentAnalysisTemplate;
  extractedFields?: { // Geëxtraheerde velden uit foto's
    [incidentId: string]: {
      [key: string]: unknown;
    };
  };
  photoAnalysis?: { // Foto analyse per incident
    [incidentId: string]: string;
  };
  tokensUsed?: number;
  [key: string]: unknown; // Allow additional fields from custom prompts
}

export interface SuggestedAction {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedDeadline?: string; // ISO date string voor voorgestelde deadline
  suggestedActionHolder?: string; // Voorgestelde naam van actiehouder
  suggestedActionHolderEmail?: string; // Voorgestelde email van actiehouder
}

/**
 * Bepaal de juiste temperature waarde voor een model
 * Sommige modellen (zoals GPT-5-nano) ondersteunen alleen de default temperature van 1
 */
function getTemperatureForModel(model: string): number | undefined {
  // Modellen die alleen default temperature (1) ondersteunen
  const modelsWithFixedTemperature = [
    'gpt-5-nano',
    'gpt-5',
    'gpt-5-turbo',
    'gpt-5-pro',
  ];

  if (modelsWithFixedTemperature.includes(model.toLowerCase())) {
    // Laat temperature undefined zodat OpenAI de default gebruikt
    return undefined;
  }

  // Voor andere modellen gebruik 0.7
  return 0.7;
}

/**
 * Bepaal of een model max_completion_tokens gebruikt in plaats van max_tokens
 */
function usesMaxCompletionTokens(model: string): boolean {
  const modelsWithMaxCompletionTokens = [
    'gpt-5-nano',
    'gpt-5',
    'gpt-5-turbo',
    'gpt-5-pro',
  ];
  
  return modelsWithMaxCompletionTokens.includes(model.toLowerCase());
}

/**
 * Bepaal de context limit (max tokens) voor een model
 */
function getModelContextLimit(model: string): number {
  const modelLower = model.toLowerCase();
  
  // GPT-4o en GPT-4 Turbo modellen hebben 128k context
  if (modelLower.includes('gpt-4o') || modelLower.includes('gpt-4-turbo')) {
    return 128000;
  }
  
  // GPT-4 modellen hebben 8k context
  if (modelLower.includes('gpt-4')) {
    return 8192;
  }
  
  // GPT-3.5 modellen hebben 16k context
  if (modelLower.includes('gpt-3.5')) {
    return 16384;
  }
  
  // GPT-5 modellen hebben 128k context
  if (modelLower.includes('gpt-5')) {
    return 128000;
  }
  
  // Default: 8k voor veiligheid
  return 8192;
}

/**
 * Bereken de maximale completion tokens op basis van model context limit en input tokens
 * Voor AI analyse gebruiken we veel meer tokens om ervoor te zorgen dat het volledige incidentAnalysis sjabloon wordt ingevuld
 */
function calculateMaxCompletionTokens(model: string, inputTokens: number, forAnalysis: boolean = false): number {
  const contextLimit = getModelContextLimit(model);
  
  // Voor analyse: gebruik bijna de volledige context om ervoor te zorgen dat alle data wordt gegenereerd
  if (forAnalysis) {
    // Reserveer slechts 5% voor overhead, gebruik de rest voor completion
    const availableTokens = Math.floor(contextLimit * 0.95);
    const maxCompletion = availableTokens - inputTokens;
    
    // Voor grote modellen (128k), gebruik maximaal 100k tokens voor completion
    if (contextLimit >= 128000) {
      return Math.max(Math.min(maxCompletion, 100000), 50000); // Minimaal 50k, maximaal 100k
    } else if (contextLimit >= 16384) {
      // Voor medium modellen, gebruik maximaal 12k tokens
      return Math.max(Math.min(maxCompletion, 12000), 6000);
    } else {
      // Voor kleine modellen (8k), gebruik maximaal 6k tokens
      return Math.max(Math.min(maxCompletion, 6000), 3000);
    }
  }
  
  // Voor andere use cases: gebruik de oude logica
  const availableTokens = Math.floor(contextLimit * 0.9);
  const maxCompletion = availableTokens - inputTokens;
  
  if (contextLimit >= 128000) {
    return Math.min(maxCompletion, 32000);
  } else if (contextLimit >= 16384) {
    return Math.min(maxCompletion, 8000);
  } else {
    return Math.min(maxCompletion, 4000);
  }
}

/**
 * Genereer een AI prompt voor incident analyse als er geen custom prompt is
 */
async function generateAnalysisPrompt(incidentsData: string, model: string = 'gpt-4o'): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. 
Maak een UITGEBREID en GEDETAILLEERD analyse prompt voor veiligheidsmeldingen.

De incident data die geanalyseerd moet worden:
${incidentsData.substring(0, 500)}...

Maak een prompt dat:
1. De incidenten zeer grondig en gedetailleerd analyseert
2. Patronen, trends en risico's identificeert en uitgebreid beschrijft
3. Minimaal 5-8 concrete, praktische aanbevelingen geeft (elk minimaal 2 zinnen)
4. Minimaal 2-3 toolbox onderwerpen voorstelt met uitgebreide beschrijvingen (minimaal 100 woorden per topic)
5. Minimaal 5-8 preventieve maatregelen benoemt (elk minimaal 2 zinnen)
6. Een zeer uitgebreide samenvatting vraagt (minimaal 300 woorden)
7. Een zeer uitgebreide risico analyse vraagt (minimaal 250 woorden)

Het prompt moet expliciet vragen om UITGEBREIDE en GEDETAILLEERDE antwoorden, niet korte of oppervlakkige antwoorden.

Geef het prompt terug als een complete instructie die direct gebruikt kan worden voor AI analyse.
Het prompt moet de {incidents} placeholder bevatten waar de incident data wordt ingevoegd.

Geef ALLEEN het prompt terug, zonder extra uitleg.`;

  try {
    const temperature = getTemperatureForModel(model);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completionOptions: any = {
      model: model,
      temperature: temperature,
      messages: [
        {
          role: 'system',
          content: 'Je bent een expert in het maken van effectieve AI prompts voor veiligheidsanalyses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    };
    
    // GPT-5 modellen gebruiken max_completion_tokens in plaats van max_tokens
    if (usesMaxCompletionTokens(model)) {
      completionOptions.max_completion_tokens = 1000;
    } else {
      completionOptions.max_tokens = 1000;
    }
    
    // Voeg temperature alleen toe als het model dit ondersteunt
    if (temperature !== undefined) {
      completionOptions.temperature = temperature;
    }

    const completion = await openai.chat.completions.create(completionOptions);

    const generatedPrompt = completion.choices[0]?.message?.content?.trim();
    if (!generatedPrompt) {
      throw new Error('Geen prompt gegenereerd');
    }

    // Zorg dat het prompt de {incidents} placeholder heeft
    if (!generatedPrompt.includes('{incidents}')) {
      return generatedPrompt + '\n\nVeiligheidsmeldingen:\n{incidents}';
    }

    return generatedPrompt;
  } catch (error) {
    console.error('Error generating prompt with AI, using fallback:', error);
    // Fallback naar standaard prompt met nieuw sjabloon
    return `Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. 
Analyseer de volgende veiligheidsmeldingen grondig volgens het standaard incidentanalyse sjabloon.

Veiligheidsmeldingen:
{incidents}

BELANGRIJK: Geef een zeer uitgebreide en gedetailleerde analyse volgens het onderstaande sjabloon. Wees specifiek en concreet in je antwoorden. Geen aannames, geen meningen, geen schuldvraag.

Geef een uitgebreide analyse in JSON formaat met de volgende structuur:
{
  "summary": "Een UITGEBREIDE samenvatting (minimaal 300 woorden) van alle meldingen, patronen, trends en belangrijke bevindingen die je ziet. Beschrijf gedetailleerd wat er aan de hand is, wat de oorzaken zijn, en wat de implicaties zijn.",
  "recommendations": [
    "Geef minimaal 5-8 concrete, uitvoerbare aanbevelingen. Elke aanbeveling moet specifiek zijn en uitleggen wat er moet gebeuren en waarom (minimaal 2 zinnen per aanbeveling).",
    "Aanbeveling 2: ...",
    "Aanbeveling 3: ...",
    "..."
  ],
  "suggestedToolboxTopics": [
    {
      "topic": "Onderwerp naam",
      "description": "Een uitgebreide beschrijving (minimaal 100 woorden) waarom dit onderwerp belangrijk is, wat de context is, en hoe het helpt om toekomstige incidenten te voorkomen",
      "priority": "high|medium|low",
      "suggestedItems": ["Item 1", "Item 2", "Item 3", "..."]
    }
  ],
  "riskAssessment": "Een UITGEBREIDE risico analyse (minimaal 250 woorden) die beschrijft: welke risico's er zijn, hoe ernstig deze zijn, wat de waarschijnlijkheid is dat ze optreden, wat de potentiële impact is, en welke factoren het risico verhogen of verlagen.",
  "preventiveMeasures": [
    "Geef minimaal 5-8 concrete preventieve maatregelen. Elke maatregel moet specifiek zijn en uitleggen wat er moet gebeuren om toekomstige incidenten te voorkomen (minimaal 2 zinnen per maatregel).",
    "Maatregel 2: ...",
    "Maatregel 3: ...",
    "..."
  ],
  "incidentAnalysis": {
    "basisgegevens": {
      "datumIncident": "Datum van het incident",
      "tijd": "Tijdstip van het incident",
      "locatie": "Locatie van het incident",
      "projectWerk": "Project of werk waar het incident plaatsvond",
      "betrokkenOrganisaties": "Betrokken organisatie(s)",
      "betrokkenPersonen": "Betrokken personen (functie, geen namen)",
      "typeIncident": "Type incident (ongeval, bijna-ongeval, onveilige situatie)"
    },
    "feitenrelaas": "Beschrijf objectief wat er is gebeurd. Geen aannames, geen meningen, geen schuldvraag.",
    "afwijking": "Wat ging anders dan bedoeld, afgesproken of verwacht. Verwijs naar procedures, werkafspraken of ontwerp.",
    "directeOorzaken": {
      "technisch": "Technische factoren die het incident direct mogelijk maakten",
      "organisatorisch": "Organisatorische factoren die het incident direct mogelijk maakten",
      "menselijk": "Menselijke factoren die het incident direct mogelijk maakten"
    },
    "achterliggendeOorzaken": {
      "beleidAfspraken": "Waarom waren de directe oorzaken aanwezig vanuit beleid/afspraken perspectief",
      "ontwerpVoorbereiding": "Waarom waren de directe oorzaken aanwezig vanuit ontwerp/voorbereiding perspectief",
      "planningTijdsdruk": "Waarom waren de directe oorzaken aanwezig vanuit planning/tijdsdruk perspectief",
      "toezichtControle": "Waarom waren de directe oorzaken aanwezig vanuit toezicht/controle perspectief",
      "opleidingInstructie": "Waarom waren de directe oorzaken aanwezig vanuit opleiding/instructie perspectief",
      "cultuurGedrag": "Waarom waren de directe oorzaken aanwezig vanuit cultuur/gedrag perspectief"
    },
    "barrieres": {
      "maatregelen": "Welke maatregelen hadden het incident moeten voorkomen",
      "gefaaldeBarrieres": "Welke barrières faalden",
      "waaromGefaald": "Waarom faalden deze barrières"
    },
    "gevolgen": {
      "letsel": "Beschrijving van letsel (indien van toepassing)",
      "materieleSchade": "Beschrijving van materiële schade",
      "verstoringWerkOmgeving": "Beschrijving van verstoring werk/omgeving",
      "potentiëleErnst": "Potentiële ernst bij andere afloop"
    },
    "lessen": "Wat moet structureel anders om herhaling te voorkomen. Formuleer dit organisatiebreed, niet persoonsgericht.",
    "maatregelen": [
      {
        "maatregel": "Beschrijving van de maatregel",
        "type": "technisch|organisatorisch|gedrag",
        "verantwoordelijke": "Verantwoordelijke voor de maatregel",
        "deadline": "Deadline voor de maatregel"
      }
    ],
    "borging": {
      "controleUitvoering": "Hoe wordt gecontroleerd dat maatregelen zijn uitgevoerd",
      "evaluatieEffect": "Hoe en wanneer wordt effect geëvalueerd",
      "delenLessen": "Hoe worden lessen gedeeld"
    }
  }
}

INSTRUCTIES:
- Summary: Minimaal 300 woorden, zeer gedetailleerd
- Recommendations: Minimaal 5-8 aanbevelingen, elk minimaal 2 zinnen
- SuggestedToolboxTopics: Minimaal 2-3 topics, elk met uitgebreide beschrijving (minimaal 100 woorden per topic)
- RiskAssessment: Minimaal 250 woorden, zeer gedetailleerd
- PreventiveMeasures: Minimaal 5-8 maatregelen, elk minimaal 2 zinnen
- IncidentAnalysis: VERPLICHT - Vul alle 10 secties van het sjabloon volledig in met gedetailleerde informatie. Dit is het primaire format voor de analyse.

CRITIEK: Je antwoord MOET beginnen met een geldig JSON object. Geen tekst vooraf, geen uitleg, alleen JSON. Gebruik deze exacte structuur en vul alle velden in.`;
  }
}

/**
 * Structureer AI output met AI als de output niet de verwachte structuur heeft
 */
async function structureAnalysisOutput(
  rawOutput: string,
  expectedStructure?: string,
  model: string = 'gpt-4o'
): Promise<AIAnalysisResult> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `Je hebt een AI analyse output ontvangen die mogelijk niet de juiste structuur heeft.
Structureer deze output in een geldige JSON structuur.

Raw output:
${rawOutput.substring(0, 5000)}

${expectedStructure ? `Verwachte structuur:\n${expectedStructure}` : 'Gebruik deze standaard structuur:'}

{
  "summary": "Een UITGEBREIDE samenvatting (minimaal 300 woorden) van alle meldingen, patronen, trends en belangrijke bevindingen",
  "recommendations": ["Aanbeveling 1", "Aanbeveling 2", ...],
  "suggestedToolboxTopics": [
    {
      "topic": "Onderwerp naam",
      "description": "Een uitgebreide beschrijving (minimaal 100 woorden) waarom dit onderwerp belangrijk is",
      "priority": "high|medium|low",
      "suggestedItems": ["Item 1", "Item 2", ...]
    }
  ],
  "riskAssessment": "Een UITGEBREIDE risico analyse (minimaal 250 woorden)",
  "preventiveMeasures": ["Maatregel 1", "Maatregel 2", ...],
  "incidentAnalysis": {
    "basisgegevens": {
      "datumIncident": "Datum van het incident",
      "tijd": "Tijdstip van het incident",
      "locatie": "Locatie van het incident",
      "projectWerk": "Project of werk waar het incident plaatsvond",
      "betrokkenOrganisaties": "Betrokken organisatie(s)",
      "betrokkenPersonen": "Betrokken personen (functie, geen namen)",
      "typeIncident": "Type incident (ongeval, bijna-ongeval, onveilige situatie)"
    },
    "feitenrelaas": "Beschrijf objectief wat er is gebeurd. Geen aannames, geen meningen, geen schuldvraag.",
    "afwijking": "Wat ging anders dan bedoeld, afgesproken of verwacht. Verwijs naar procedures, werkafspraken of ontwerp.",
    "directeOorzaken": {
      "technisch": "Technische factoren die het incident direct mogelijk maakten",
      "organisatorisch": "Organisatorische factoren die het incident direct mogelijk maakten",
      "menselijk": "Menselijke factoren die het incident direct mogelijk maakten"
    },
    "achterliggendeOorzaken": {
      "beleidAfspraken": "Waarom waren de directe oorzaken aanwezig vanuit beleid/afspraken perspectief",
      "ontwerpVoorbereiding": "Waarom waren de directe oorzaken aanwezig vanuit ontwerp/voorbereiding perspectief",
      "planningTijdsdruk": "Waarom waren de directe oorzaken aanwezig vanuit planning/tijdsdruk perspectief",
      "toezichtControle": "Waarom waren de directe oorzaken aanwezig vanuit toezicht/controle perspectief",
      "opleidingInstructie": "Waarom waren de directe oorzaken aanwezig vanuit opleiding/instructie perspectief",
      "cultuurGedrag": "Waarom waren de directe oorzaken aanwezig vanuit cultuur/gedrag perspectief"
    },
    "barrieres": {
      "maatregelen": "Welke maatregelen hadden het incident moeten voorkomen",
      "gefaaldeBarrieres": "Welke barrières faalden",
      "waaromGefaald": "Waarom faalden deze barrières"
    },
    "gevolgen": {
      "letsel": "Beschrijving van letsel (indien van toepassing)",
      "materieleSchade": "Beschrijving van materiële schade",
      "verstoringWerkOmgeving": "Beschrijving van verstoring werk/omgeving",
      "potentiëleErnst": "Potentiële ernst bij andere afloop"
    },
    "lessen": "Wat moet structureel anders om herhaling te voorkomen. Formuleer dit organisatiebreed, niet persoonsgericht.",
    "maatregelen": [
      {
        "maatregel": "Beschrijving van de maatregel",
        "type": "technisch|organisatorisch|gedrag",
        "verantwoordelijke": "Verantwoordelijke voor de maatregel",
        "deadline": "Deadline voor de maatregel"
      }
    ],
    "borging": {
      "controleUitvoering": "Hoe wordt gecontroleerd dat maatregelen zijn uitgevoerd",
      "evaluatieEffect": "Hoe en wanneer wordt effect geëvalueerd",
      "delenLessen": "Hoe worden lessen gedeeld"
    }
  }
}

BELANGRIJK: Het "incidentAnalysis" veld is VERPLICHT en moet ALTIJD volledig worden ingevuld met alle 10 secties. Dit is het primaire format voor de analyse.

Geef ALLEEN de gestructureerde JSON terug, zonder extra tekst of markdown.`;

  try {
    // Voor structureren gebruik lagere temperature, maar respecteer model beperkingen
    const baseTemperature = getTemperatureForModel(model);
    const temperature = baseTemperature !== undefined ? 0.3 : undefined; // Lagere temperature voor meer consistente output
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completionOptions: any = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Je bent een expert in het structureren van AI outputs. Geef altijd geldige JSON terug met de volledige structuur inclusief het VERPLICHTE incidentAnalysis veld met alle 10 secties. Het incidentAnalysis veld is VERPLICHT en moet volledig worden ingevuld.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    };
    
    // Bereken max completion tokens dynamisch - we hebben meer tokens nodig voor het volledige template
    const estimatedInputTokens = Math.ceil(prompt.length / 4) + 100;
    const maxCompletion = calculateMaxCompletionTokens(model, estimatedInputTokens, true);
    
    // GPT-5 modellen gebruiken max_completion_tokens in plaats van max_tokens
    if (usesMaxCompletionTokens(model)) {
      completionOptions.max_completion_tokens = maxCompletion;
    } else {
      completionOptions.max_tokens = maxCompletion;
    }
    
    if (temperature !== undefined) {
      completionOptions.temperature = temperature;
    }

    const completion = await openai.chat.completions.create(completionOptions);

    const structuredOutput = completion.choices[0]?.message?.content?.trim();
    if (!structuredOutput) {
      throw new Error('Geen gestructureerde output gegenereerd');
    }

    // Parse de gestructureerde output
    let jsonContent = structuredOutput.trim();
    const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    const result = JSON.parse(jsonContent) as AIAnalysisResult;
    return result;
  } catch (error) {
    console.error('Error structuring output with AI:', error);
    // Ultimate fallback: maak een basis structuur
    return {
      summary: rawOutput.substring(0, 500) || 'Analyse uitgevoerd, maar output kon niet worden geparsed.',
      recommendations: [],
      suggestedToolboxTopics: [],
      riskAssessment: 'Risico inschatting kon niet worden gegenereerd.',
      preventiveMeasures: [],
    };
  }
}

/**
 * Parse AI output flexibel - probeer verschillende formaten
 */
function parseAIOutput(content: string): unknown {
  let jsonContent = content.trim();
  
  console.log('=== PARSING AI OUTPUT ===');
  console.log('Content length:', jsonContent.length);
  console.log('Content preview (first 200 chars):', jsonContent.substring(0, 200));

  // Verwijder markdown code blocks
  const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    console.log('Found markdown code block, extracting JSON');
    jsonContent = jsonMatch[1];
  }

  // Probeer direct te parsen
  try {
    const parsed = JSON.parse(jsonContent);
    console.log('Successfully parsed JSON directly');
    console.log('Parsed keys:', Object.keys(parsed));
    return parsed;
  } catch (error) {
    console.log('Direct parsing failed, trying to extract JSON object...');
    // Probeer de eerste { } block te vinden
    const firstBrace = jsonContent.indexOf('{');
    const lastBrace = jsonContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      console.log('Extracted JSON substring, length:', jsonContent.length);
      try {
        const parsed = JSON.parse(jsonContent);
        console.log('Successfully parsed extracted JSON');
        console.log('Parsed keys:', Object.keys(parsed));
        return parsed;
      } catch (parseError) {
        console.error('Failed to parse extracted JSON:', parseError);
        // Als dit ook faalt, return de raw content voor verdere verwerking
        return { rawContent: jsonContent };
      }
    }
    // Als er geen JSON gevonden wordt, return raw content
    console.log('No JSON object found in content, returning raw content');
    return { rawContent: jsonContent };
  }
}

/**
 * Valideer en normaliseer AI analyse resultaat naar standaard structuur
 */
function normalizeAnalysisResult(parsed: unknown): AIAnalysisResult {
  const result: AIAnalysisResult = {
    summary: '',
    recommendations: [],
    suggestedToolboxTopics: [],
    riskAssessment: '',
    preventiveMeasures: [],
  };

  // Als er een extracted_fields structuur is, converteer deze naar de standaard structuur
  if (typeof parsed === 'object' && parsed !== null && 'extracted_fields' in parsed && parsed.extracted_fields && typeof parsed.extracted_fields === 'object') {
    console.log('Found extracted_fields structure, converting to standard structure...');
    const extracted = parsed.extracted_fields as Record<string, unknown>;
    
    // Maak samenvatting van extracted fields
    const summaryParts: string[] = [];
    if (extracted.beschrijving) summaryParts.push(`Beschrijving: ${String(extracted.beschrijving)}`);
    if (extracted.aard_incident) summaryParts.push(`Aard incident: ${String(extracted.aard_incident)}`);
    if (extracted.categorie) summaryParts.push(`Categorie: ${String(extracted.categorie)}`);
    if (extracted.ernst) summaryParts.push(`Ernst: ${String(extracted.ernst)}`);
    if (extracted.genomen_maatregelen) summaryParts.push(`Genomen maatregelen: ${String(extracted.genomen_maatregelen)}`);
    
    result.summary = summaryParts.length > 0 
      ? summaryParts.join('\n\n')
      : 'Geen samenvatting beschikbaar.';
    
    // Converteer genomen_maatregelen naar preventiveMeasures als array
    if (extracted.genomen_maatregelen && typeof extracted.genomen_maatregelen === 'string') {
      result.preventiveMeasures = extracted.genomen_maatregelen.split(/[.;]/).filter((m: string) => m.trim().length > 0).map((m: string) => m.trim());
    }
    
    // Maak aanbevelingen op basis van de informatie
    if (extracted.aard_incident || extracted.beschrijving) {
      result.recommendations = [
        'Controleer de situatie regelmatig',
        'Zorg voor adequate communicatie met betrokken partijen',
        'Documenteer alle genomen maatregelen'
      ];
    }
    
    // Risk assessment
    if (extracted.ernst) {
      result.riskAssessment = `Ernst niveau: ${String(extracted.ernst)}. ${String(extracted.aard_incident || extracted.beschrijving || 'Risico inschatting op basis van beschikbare informatie.')}`;
    } else {
      result.riskAssessment = String(extracted.aard_incident || extracted.beschrijving || 'Geen risico inschatting beschikbaar.');
    }
    
    return result;
  }

  // Extract summary
  if (typeof parsed === 'object' && parsed !== null && 'summary' in parsed && typeof parsed.summary === 'string') {
    result.summary = parsed.summary;
  } else if (typeof parsed === 'object' && parsed !== null && 'rawContent' in parsed) {
    result.summary = String(parsed.rawContent).substring(0, 500);
  } else {
    result.summary = 'Geen samenvatting beschikbaar.';
  }

  // Extract recommendations
  if (typeof parsed === 'object' && parsed !== null && 'recommendations' in parsed) {
    if (Array.isArray(parsed.recommendations)) {
      result.recommendations = parsed.recommendations.filter((r: unknown) => typeof r === 'string') as string[];
    } else if (typeof parsed.recommendations === 'string') {
      result.recommendations = [parsed.recommendations];
    }
  }

  // Extract suggestedToolboxTopics
  if (typeof parsed === 'object' && parsed !== null && 'suggestedToolboxTopics' in parsed && Array.isArray(parsed.suggestedToolboxTopics)) {
    result.suggestedToolboxTopics = parsed.suggestedToolboxTopics.filter((t: unknown) =>
      t && typeof t === 'object' && t !== null && 'topic' in t
    );
  }

  // Extract riskAssessment
  if (typeof parsed === 'object' && parsed !== null && 'riskAssessment' in parsed && typeof parsed.riskAssessment === 'string') {
    result.riskAssessment = parsed.riskAssessment;
  } else {
    result.riskAssessment = 'Geen risico inschatting beschikbaar.';
  }

  // Extract preventiveMeasures
  if (typeof parsed === 'object' && parsed !== null && 'preventiveMeasures' in parsed && Array.isArray(parsed.preventiveMeasures)) {
    result.preventiveMeasures = parsed.preventiveMeasures.filter((m: unknown) => typeof m === 'string') as string[];
  } else if (typeof parsed === 'object' && parsed !== null && 'preventiveMeasures' in parsed && typeof parsed.preventiveMeasures === 'string') {
    result.preventiveMeasures = [parsed.preventiveMeasures];
  }

  // Extract incidentAnalysis - VERPLICHT VELD
  if (typeof parsed === 'object' && parsed !== null && 'incidentAnalysis' in parsed) {
    const incidentAnalysis = parsed.incidentAnalysis;
    if (incidentAnalysis && typeof incidentAnalysis === 'object' && incidentAnalysis !== null) {
      result.incidentAnalysis = incidentAnalysis as IncidentAnalysisTemplate;
      console.log('✅ incidentAnalysis extracted from parsed data');
    }
  }

  // Copy any additional fields
  if (typeof parsed === 'object' && parsed !== null) {
    Object.keys(parsed).forEach(key => {
      if (!['summary', 'recommendations', 'suggestedToolboxTopics', 'riskAssessment', 'preventiveMeasures', 'rawContent', 'incidentAnalysis'].includes(key)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)[key] = (parsed as any)[key];
      }
    });
  }

  return result;
}

/**
 * Download en converteer foto naar base64 voor Vision API
 */
async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    // Als het een lokale file path is (begint met /uploads/), lees direct van filesystem
    if (imageUrl.startsWith('/uploads/')) {
      try {
        const { readFile } = await import('fs/promises');
        const { join } = await import('path');
        const filePath = join(process.cwd(), 'public', imageUrl);
        const fileBuffer = await readFile(filePath);
        const base64 = fileBuffer.toString('base64');
        
        // Bepaal content type op basis van extensie
        const ext = imageUrl.toLowerCase().split('.').pop();
        const contentTypeMap: { [key: string]: string } = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'bmp': 'image/bmp'
        };
        const contentType = contentTypeMap[ext || ''] || 'image/jpeg';
        
        console.log(`Successfully read local file: ${filePath}`);
        return `data:${contentType};base64,${base64}`;
      } catch (fsError) {
        console.error(`Error reading local file ${imageUrl}:`, fsError);
        // Fallback naar HTTP fetch
      }
    }
    
    // Voor HTTP URLs of als lokale file read faalt
    let fullUrl = imageUrl;
    if (!imageUrl.startsWith('http')) {
      // Voor lokale development via HTTP
      if (imageUrl.startsWith('/uploads/')) {
        fullUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${imageUrl}`;
      } else {
        // Relatieve URL
        fullUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }
    }
    
    console.log(`Fetching image from URL: ${fullUrl}`);
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${fullUrl}`, response.status, response.statusText);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    console.log(`Successfully downloaded image: ${fullUrl}, size: ${buffer.length} bytes`);
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error(`Error downloading image ${imageUrl}:`, error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Analyseer foto's met Vision API en extraheer relevante informatie
 */
async function analyzePhotosWithVision(
  photoUrls: string[],
  incidentContext: SafetyIncidentForAnalysis,
  customPrompt?: string,
  model: string = 'gpt-4o'
): Promise<{ extractedFields: unknown; photoAnalysis: string }> {
  if (!openai || photoUrls.length === 0) {
    return { extractedFields: {}, photoAnalysis: '' };
  }

  // Download en converteer foto's naar base64
  const imageContents: Array<{ type: 'image_url'; image_url: { url: string } }> = [];
  for (const photoUrl of photoUrls) {
    const base64Image = await downloadImageAsBase64(photoUrl);
    if (base64Image) {
      imageContents.push({
        type: 'image_url',
        image_url: { url: base64Image }
      });
    }
  }

  if (imageContents.length === 0) {
    console.log('No valid images could be downloaded for analysis');
    return { extractedFields: {}, photoAnalysis: '' };
  }

  // Gebruik een vision-capable model (gpt-4o of gpt-4-vision-preview)
  // Check welke modellen vision ondersteunen
  const visionCapableModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-vision-preview', 'gpt-4-turbo'];
  const isVisionCapable = visionCapableModels.some(vm => model.toLowerCase().includes(vm.toLowerCase()));
  
  const visionModel = isVisionCapable
    ? model
    : 'gpt-4o'; // Fallback naar gpt-4o als het model geen vision ondersteunt
  
  console.log(`Using vision model: ${visionModel} (original model: ${model}, isVisionCapable: ${isVisionCapable})`);

  const prompt = customPrompt 
    ? `${customPrompt}\n\nAnalyseer de bijgevoegde foto's grondig en extraheer relevante informatie die kan helpen bij het invullen van lege velden en het verbeteren van de incident beschrijving.`
    : `Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. 
Analyseer de bijgevoegde foto's van dit veiligheidsincident grondig.

Context van het incident:
- Titel: ${incidentContext.title}
- Beschrijving: ${incidentContext.description || 'Geen beschrijving'}
- Categorie: ${incidentContext.category}
- Ernst: ${incidentContext.severity}
- Discipline: ${incidentContext.discipline || 'Niet ingevuld'}
- Locatie: ${incidentContext.location || 'Niet ingevuld'}
- Impact: ${incidentContext.impact || 'Niet ingevuld'}
- Getroffen systemen: ${incidentContext.affectedSystems || 'Niet ingevuld'}

Analyseer de foto's en:
1. Identificeer wat er op de foto's te zien is (beschrijf gedetailleerd)
2. Extraheer relevante informatie die kan helpen bij het invullen van lege velden
3. Geef suggesties voor velden zoals: discipline, locatie details, impact, getroffen systemen, veiligheidsmaatregelen, etc.
4. Identificeer veiligheidsrisico's die zichtbaar zijn op de foto's
5. Geef aanbevelingen op basis van wat je ziet

BELANGRIJK: 
- Als een veld al ingevuld is, gebruik dan die informatie als context maar voeg details toe uit de foto's
- Als een veld niet ingevuld is, probeer dit in te vullen op basis van wat je op de foto's ziet
- Wees specifiek en gedetailleerd in je analyse

Geef je antwoord terug in JSON formaat met deze EXACTE structuur:
{
  "photoAnalysis": "Uitgebreide beschrijving van wat er op de foto's te zien is",
  "extractedFields": {
    "discipline": "Suggestie voor discipline op basis van foto's (alleen als dit veld leeg was of als je meer details kunt toevoegen)",
    "location": "Meer gedetailleerde locatie informatie uit foto's",
    "impact": "Impact die zichtbaar is op de foto's",
    "affectedSystems": "Systemen die zichtbaar zijn op de foto's",
    "safetyMeasures": "Veiligheidsmaatregelen die zichtbaar zijn of nodig zijn",
    "riskAssessment": "Risico inschatting op basis van wat zichtbaar is"
  },
  "photoBasedRecommendations": ["Aanbeveling 1 op basis van foto's", "Aanbeveling 2", ...]
}

Geef ALLEEN de JSON terug, zonder extra tekst of markdown.`;

  try {
    console.log(`Calling Vision API with model ${visionModel}, ${imageContents.length} images`);
    
    const completion = await openai.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: 'system',
          content: 'Je bent een expert in het analyseren van veiligheidsincidenten in ondergrondse infrastructuur. Analyseer foto\'s grondig en geef gestructureerde informatie terug in JSON formaat. Geef ALLEEN geldige JSON terug, zonder markdown formatting.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...imageContents
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    console.log('Vision API response received:', {
      finishReason: completion.choices[0]?.finish_reason,
      hasContent: !!completion.choices[0]?.message?.content,
      contentLength: completion.choices[0]?.message?.content?.length || 0
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error('No content in photo analysis response');
      console.error('Completion object:', JSON.stringify(completion, null, 2));
      // Als er geen content is, gooi geen error maar return lege resultaten
      // Dit voorkomt dat de hele analyse faalt
      return { extractedFields: {}, photoAnalysis: '' };
    }

    // Parse JSON response
    let jsonContent = content.trim();
    const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    try {
      const parsed = JSON.parse(jsonContent);
      return {
        extractedFields: parsed.extractedFields || {},
        photoAnalysis: parsed.photoAnalysis || ''
      };
    } catch (error) {
      console.error('Error parsing photo analysis JSON:', error);
      // Fallback: probeer de eerste JSON object te vinden
      const firstBrace = jsonContent.indexOf('{');
      const lastBrace = jsonContent.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          const parsed = JSON.parse(jsonContent.substring(firstBrace, lastBrace + 1));
          return {
            extractedFields: parsed.extractedFields || {},
            photoAnalysis: parsed.photoAnalysis || content.substring(0, 500)
          };
        } catch (parseError) {
          console.error('Error parsing extracted JSON:', parseError);
        }
      }
      return {
        extractedFields: {},
        photoAnalysis: content.substring(0, 500) // Fallback: gebruik eerste 500 chars
      };
    }
  } catch (error) {
    console.error('Error analyzing photos with vision:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined
    });
    // Als Vision API faalt, return lege resultaten maar gooi geen error
    // Dit zorgt ervoor dat de tekstuele analyse nog steeds doorgaat
    return { extractedFields: {}, photoAnalysis: '' };
  }
}

/**
 * Analyseer veiligheidsincidenten met AI
 */
export async function analyzeSafetyIncidents(
  incidents: SafetyIncidentForAnalysis[],
  customPrompt?: string,
  model: string = 'gpt-4o'
): Promise<AIAnalysisResult> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  // Analyseer foto's voor elk incident dat foto's heeft
  const photoAnalyses: Array<{ extractedFields: unknown; photoAnalysis: string }> = [];
  for (const incident of incidents) {
    if (incident.photos && incident.photos.length > 0) {
      console.log(`Analyzing ${incident.photos.length} photos for incident ${incident.incidentId}`);
      try {
        const photoAnalysis = await analyzePhotosWithVision(
          incident.photos,
          incident,
          customPrompt,
          model
        );
        photoAnalyses.push(photoAnalysis);
        console.log(`Photo analysis completed for incident ${incident.incidentId}, extracted ${photoAnalysis.extractedFields && typeof photoAnalysis.extractedFields === 'object' ? Object.keys(photoAnalysis.extractedFields).length : 0} fields`);
      } catch (error) {
        console.error(`Error analyzing photos for incident ${incident.incidentId}:`, error);
        console.error('Photo analysis error details:', error instanceof Error ? error.message : String(error));
        // Foto analyse faalt, maar ga door met tekstuele analyse
        photoAnalyses.push({ extractedFields: {}, photoAnalysis: '' });
      }
    } else {
      photoAnalyses.push({ extractedFields: {}, photoAnalysis: '' });
    }
  }

  // Format incident data inclusief foto analyse resultaten
  const incidentsData = incidents.map((inc, idx) => {
    const photoInfo = photoAnalyses[idx];
    return `
Melding ${idx + 1}:
- ID: ${inc.incidentId}
- Titel: ${inc.title}
- Beschrijving: ${inc.description}
- Categorie: ${inc.category}
- Ernst: ${inc.severity}
- Discipline: ${inc.discipline || 'Onbekend'}
- Locatie: ${inc.location || 'Onbekend'}
- Impact: ${inc.impact || 'Niet gespecificeerd'}
- Genomen maatregelen: ${inc.mitigation || 'Geen'}
- Getroffen systemen: ${inc.affectedSystems || 'Onbekend'}
- Veiligheidsmaatregelen: ${inc.safetyMeasures || 'Geen'}
- Risico inschatting: ${inc.riskAssessment || 'Niet gedaan'}
${photoInfo.photoAnalysis ? `\nFoto Analyse:\n${photoInfo.photoAnalysis}` : ''}
${photoInfo.extractedFields && typeof photoInfo.extractedFields === 'object' && Object.keys(photoInfo.extractedFields).length > 0 ? `\nGeëxtraheerde informatie uit foto's:\n${JSON.stringify(photoInfo.extractedFields, null, 2)}` : ''}
`;
  }).join('\n');

  // Bepaal welk prompt te gebruiken
  let prompt: string;
  let promptSource: 'custom' | 'generated' | 'default' = 'default';

  if (customPrompt && customPrompt.trim().length > 0) {
    console.log('=== USING CUSTOM PROMPT ===');
    console.log('Custom prompt length:', customPrompt.length);
    console.log('Custom prompt preview (first 500 chars):', customPrompt.substring(0, 500));
    promptSource = 'custom';
    
    // Vervang {incidents} placeholder of voeg incident data toe
    if (customPrompt.includes('{incidents}')) {
      prompt = customPrompt.replace(/\{incidents\}/g, incidentsData);
      console.log('Replaced {incidents} placeholder in custom prompt');
    } else {
      console.log('Custom prompt does not contain {incidents} placeholder, appending incident data');
      prompt = customPrompt + '\n\nVeiligheidsmeldingen:\n' + incidentsData;
    }
    
    // Zorg ervoor dat het prompt JSON structuur instructies bevat als die ontbreken
    // Check of het prompt de verwachte velden bevat (summary, recommendations, etc.)
    const hasExpectedFields = prompt.toLowerCase().includes('"summary"') || 
                              prompt.toLowerCase().includes('summary:') ||
                              (prompt.includes('summary') && prompt.includes('recommendations'));
    
    const hasJsonInstructions = prompt.toLowerCase().includes('json') || 
                                prompt.toLowerCase().includes('structuur');
    
    // Als het prompt extracted_fields of andere structuur vraagt, voeg dan expliciet de verwachte structuur toe
    const hasExtractedFields = prompt.toLowerCase().includes('extracted_fields') ||
                                prompt.toLowerCase().includes('extracted fields');
    
    if (!hasExpectedFields || hasExtractedFields) {
      console.log('Custom prompt does not contain expected structure (summary/recommendations) or uses extracted_fields, adding explicit structure instructions...');
      prompt += `\n\nBELANGRIJK: Geef je antwoord ALLEEN terug in JSON formaat met deze EXACTE structuur (gebruik NIET extracted_fields):
Geef UITGEBREIDE en GEDETAILLEERDE antwoorden. Wees specifiek en concreet.

{
  "summary": "Een UITGEBREIDE samenvatting (minimaal 300 woorden) van alle meldingen, patronen, trends en belangrijke bevindingen. Beschrijf gedetailleerd wat er aan de hand is, wat de oorzaken zijn, en wat de implicaties zijn.",
  "recommendations": [
    "Geef minimaal 5-8 concrete, uitvoerbare aanbevelingen. Elke aanbeveling moet specifiek zijn en uitleggen wat er moet gebeuren en waarom (minimaal 2 zinnen per aanbeveling).",
    "Aanbeveling 2: ...",
    "..."
  ],
  "suggestedToolboxTopics": [
    {
      "topic": "Onderwerp naam",
      "description": "Een uitgebreide beschrijving (minimaal 100 woorden) waarom dit onderwerp belangrijk is, wat de context is, en hoe het helpt om toekomstige incidenten te voorkomen",
      "priority": "high|medium|low",
      "suggestedItems": ["Item 1", "Item 2", ...]
    }
  ],
  "riskAssessment": "Een UITGEBREIDE risico analyse (minimaal 250 woorden) die beschrijft: welke risico's er zijn, hoe ernstig deze zijn, wat de waarschijnlijkheid is dat ze optreden, wat de potentiële impact is, en welke factoren het risico verhogen of verlagen.",
  "preventiveMeasures": [
    "Geef minimaal 5-8 concrete preventieve maatregelen. Elke maatregel moet specifiek zijn en uitleggen wat er moet gebeuren om toekomstige incidenten te voorkomen (minimaal 2 zinnen per maatregel).",
    "Maatregel 2: ...",
    "..."
  ],
  "incidentAnalysis": {
    "basisgegevens": {
      "datumIncident": "Datum van het incident",
      "tijd": "Tijdstip van het incident",
      "locatie": "Locatie van het incident",
      "projectWerk": "Project of werk waar het incident plaatsvond",
      "betrokkenOrganisaties": "Betrokken organisatie(s)",
      "betrokkenPersonen": "Betrokken personen (functie, geen namen)",
      "typeIncident": "Type incident (ongeval, bijna-ongeval, onveilige situatie)"
    },
    "feitenrelaas": "Beschrijf objectief wat er is gebeurd. Geen aannames, geen meningen, geen schuldvraag.",
    "afwijking": "Wat ging anders dan bedoeld, afgesproken of verwacht. Verwijs naar procedures, werkafspraken of ontwerp.",
    "directeOorzaken": {
      "technisch": "Technische factoren die het incident direct mogelijk maakten",
      "organisatorisch": "Organisatorische factoren die het incident direct mogelijk maakten",
      "menselijk": "Menselijke factoren die het incident direct mogelijk maakten"
    },
    "achterliggendeOorzaken": {
      "beleidAfspraken": "Waarom waren de directe oorzaken aanwezig vanuit beleid/afspraken perspectief",
      "ontwerpVoorbereiding": "Waarom waren de directe oorzaken aanwezig vanuit ontwerp/voorbereiding perspectief",
      "planningTijdsdruk": "Waarom waren de directe oorzaken aanwezig vanuit planning/tijdsdruk perspectief",
      "toezichtControle": "Waarom waren de directe oorzaken aanwezig vanuit toezicht/controle perspectief",
      "opleidingInstructie": "Waarom waren de directe oorzaken aanwezig vanuit opleiding/instructie perspectief",
      "cultuurGedrag": "Waarom waren de directe oorzaken aanwezig vanuit cultuur/gedrag perspectief"
    },
    "barrieres": {
      "maatregelen": "Welke maatregelen hadden het incident moeten voorkomen",
      "gefaaldeBarrieres": "Welke barrières faalden",
      "waaromGefaald": "Waarom faalden deze barrières"
    },
    "gevolgen": {
      "letsel": "Beschrijving van letsel (indien van toepassing)",
      "materieleSchade": "Beschrijving van materiële schade",
      "verstoringWerkOmgeving": "Beschrijving van verstoring werk/omgeving",
      "potentiëleErnst": "Potentiële ernst bij andere afloop"
    },
    "lessen": "Wat moet structureel anders om herhaling te voorkomen. Formuleer dit organisatiebreed, niet persoonsgericht.",
    "maatregelen": [
      {
        "maatregel": "Beschrijving van de maatregel",
        "type": "technisch|organisatorisch|gedrag",
        "verantwoordelijke": "Verantwoordelijke voor de maatregel",
        "deadline": "Deadline voor de maatregel"
      }
    ],
    "borging": {
      "controleUitvoering": "Hoe wordt gecontroleerd dat maatregelen zijn uitgevoerd",
      "evaluatieEffect": "Hoe en wanneer wordt effect geëvalueerd",
      "delenLessen": "Hoe worden lessen gedeeld"
    }
  }
}

BELANGRIJK: Het "incidentAnalysis" veld is VERPLICHT en moet ALTIJD volledig worden ingevuld met alle 10 secties. Dit is het primaire format voor de analyse.

CRITIEK: Je antwoord MOET beginnen met een geldig JSON object. Geen tekst vooraf, geen uitleg, alleen JSON. Gebruik deze exacte structuur en vul alle velden in. Geef UITGEBREIDE antwoorden, niet korte of oppervlakkige antwoorden.`;
    } else if (!hasJsonInstructions) {
      console.log('Custom prompt does not contain JSON structure instructions, adding them...');
      prompt += `\n\nBELANGRIJK: Geef je antwoord ALLEEN terug in JSON formaat met deze exacte structuur:
Geef UITGEBREIDE en GEDETAILLEERDE antwoorden. Wees specifiek en concreet.

{
  "summary": "Een UITGEBREIDE samenvatting (minimaal 300 woorden) van alle meldingen, patronen, trends en belangrijke bevindingen",
  "recommendations": [
    "Minimaal 5-8 concrete aanbevelingen (elk minimaal 2 zinnen)",
    "Aanbeveling 2: ...",
    "..."
  ],
  "suggestedToolboxTopics": [
    {
      "topic": "Onderwerp naam",
      "description": "Uitgebreide beschrijving (minimaal 100 woorden) waarom dit onderwerp belangrijk is",
      "priority": "high|medium|low",
      "suggestedItems": ["Item 1", "Item 2", ...]
    }
  ],
  "riskAssessment": "UITGEBREIDE risico analyse (minimaal 250 woorden)",
  "preventiveMeasures": [
    "Minimaal 5-8 concrete maatregelen (elk minimaal 2 zinnen)",
    "Maatregel 2: ...",
    "..."
  ],
  "incidentAnalysis": {
    "basisgegevens": {
      "datumIncident": "Datum van het incident",
      "tijd": "Tijdstip van het incident",
      "locatie": "Locatie van het incident",
      "projectWerk": "Project of werk waar het incident plaatsvond",
      "betrokkenOrganisaties": "Betrokken organisatie(s)",
      "betrokkenPersonen": "Betrokken personen (functie, geen namen)",
      "typeIncident": "Type incident (ongeval, bijna-ongeval, onveilige situatie)"
    },
    "feitenrelaas": "Beschrijf objectief wat er is gebeurd. Geen aannames, geen meningen, geen schuldvraag.",
    "afwijking": "Wat ging anders dan bedoeld, afgesproken of verwacht. Verwijs naar procedures, werkafspraken of ontwerp.",
    "directeOorzaken": {
      "technisch": "Technische factoren die het incident direct mogelijk maakten",
      "organisatorisch": "Organisatorische factoren die het incident direct mogelijk maakten",
      "menselijk": "Menselijke factoren die het incident direct mogelijk maakten"
    },
    "achterliggendeOorzaken": {
      "beleidAfspraken": "Waarom waren de directe oorzaken aanwezig vanuit beleid/afspraken perspectief",
      "ontwerpVoorbereiding": "Waarom waren de directe oorzaken aanwezig vanuit ontwerp/voorbereiding perspectief",
      "planningTijdsdruk": "Waarom waren de directe oorzaken aanwezig vanuit planning/tijdsdruk perspectief",
      "toezichtControle": "Waarom waren de directe oorzaken aanwezig vanuit toezicht/controle perspectief",
      "opleidingInstructie": "Waarom waren de directe oorzaken aanwezig vanuit opleiding/instructie perspectief",
      "cultuurGedrag": "Waarom waren de directe oorzaken aanwezig vanuit cultuur/gedrag perspectief"
    },
    "barrieres": {
      "maatregelen": "Welke maatregelen hadden het incident moeten voorkomen",
      "gefaaldeBarrieres": "Welke barrières faalden",
      "waaromGefaald": "Waarom faalden deze barrières"
    },
    "gevolgen": {
      "letsel": "Beschrijving van letsel (indien van toepassing)",
      "materieleSchade": "Beschrijving van materiële schade",
      "verstoringWerkOmgeving": "Beschrijving van verstoring werk/omgeving",
      "potentiëleErnst": "Potentiële ernst bij andere afloop"
    },
    "lessen": "Wat moet structureel anders om herhaling te voorkomen. Formuleer dit organisatiebreed, niet persoonsgericht.",
    "maatregelen": [
      {
        "maatregel": "Beschrijving van de maatregel",
        "type": "technisch|organisatorisch|gedrag",
        "verantwoordelijke": "Verantwoordelijke voor de maatregel",
        "deadline": "Deadline voor de maatregel"
      }
    ],
    "borging": {
      "controleUitvoering": "Hoe wordt gecontroleerd dat maatregelen zijn uitgevoerd",
      "evaluatieEffect": "Hoe en wanneer wordt effect geëvalueerd",
      "delenLessen": "Hoe worden lessen gedeeld"
    }
  }
}

BELANGRIJK: Het "incidentAnalysis" veld is VERPLICHT en moet ALTIJD volledig worden ingevuld met alle 10 secties. Dit is het primaire format voor de analyse.

CRITIEK: Je antwoord MOET beginnen met een geldig JSON object. Geen tekst vooraf, geen uitleg, alleen JSON. Gebruik deze exacte structuur en vul alle velden in. Geef UITGEBREIDE antwoorden, niet korte of oppervlakkige antwoorden.`;
    } else {
      console.log('Custom prompt already contains JSON structure instructions');
    }
    
    console.log('Final prompt length:', prompt.length);
    console.log('Final prompt preview (first 500 chars):', prompt.substring(0, 500));
    console.log('Final prompt preview (last 500 chars):', prompt.substring(Math.max(0, prompt.length - 500)));
  } else {
    // Genereer prompt met AI
    console.log('No custom prompt found, generating prompt with AI');
    try {
      prompt = await generateAnalysisPrompt(incidentsData, model);
      promptSource = 'generated';
      // Vervang {incidents} placeholder
      prompt = prompt.replace(/\{incidents\}/g, incidentsData);
    } catch (error) {
      console.error('Error generating prompt, using default:', error);
      promptSource = 'default';
      // Fallback naar standaard prompt met nieuw sjabloon
      prompt = `Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. 
Analyseer de volgende veiligheidsmeldingen grondig volgens het standaard incidentanalyse sjabloon.

Veiligheidsmeldingen:
${incidentsData}

BELANGRIJK: Geef een zeer uitgebreide en gedetailleerde analyse volgens het onderstaande sjabloon. Wees specifiek en concreet in je antwoorden. Geen aannames, geen meningen, geen schuldvraag.

Geef een uitgebreide analyse in JSON formaat met de volgende structuur:
{
  "summary": "Een UITGEBREIDE samenvatting (minimaal 300 woorden) van alle meldingen, patronen, trends en belangrijke bevindingen die je ziet. Beschrijf gedetailleerd wat er aan de hand is, wat de oorzaken zijn, en wat de implicaties zijn.",
  "recommendations": [
    "Geef minimaal 5-8 concrete, uitvoerbare aanbevelingen. Elke aanbeveling moet specifiek zijn en uitleggen wat er moet gebeuren en waarom.",
    "Aanbeveling 2: ...",
    "Aanbeveling 3: ...",
    "..."
  ],
  "suggestedToolboxTopics": [
    {
      "topic": "Onderwerp naam",
      "description": "Een uitgebreide beschrijving (minimaal 100 woorden) waarom dit onderwerp belangrijk is, wat de context is, en hoe het helpt om toekomstige incidenten te voorkomen",
      "priority": "high|medium|low",
      "suggestedItems": ["Item 1", "Item 2", "Item 3", "..."]
    }
  ],
  "riskAssessment": "Een UITGEBREIDE risico analyse (minimaal 250 woorden) die beschrijft: welke risico's er zijn, hoe ernstig deze zijn, wat de waarschijnlijkheid is dat ze optreden, wat de potentiële impact is, en welke factoren het risico verhogen of verlagen.",
  "preventiveMeasures": [
    "Geef minimaal 5-8 concrete preventieve maatregelen. Elke maatregel moet specifiek zijn en uitleggen wat er moet gebeuren om toekomstige incidenten te voorkomen.",
    "Maatregel 2: ...",
    "Maatregel 3: ...",
    "..."
  ],
  "incidentAnalysis": {
    "basisgegevens": {
      "datumIncident": "Datum van het incident",
      "tijd": "Tijdstip van het incident",
      "locatie": "Locatie van het incident",
      "projectWerk": "Project of werk waar het incident plaatsvond",
      "betrokkenOrganisaties": "Betrokken organisatie(s)",
      "betrokkenPersonen": "Betrokken personen (functie, geen namen)",
      "typeIncident": "Type incident (ongeval, bijna-ongeval, onveilige situatie)"
    },
    "feitenrelaas": "Beschrijf objectief wat er is gebeurd. Geen aannames, geen meningen, geen schuldvraag.",
    "afwijking": "Wat ging anders dan bedoeld, afgesproken of verwacht. Verwijs naar procedures, werkafspraken of ontwerp.",
    "directeOorzaken": {
      "technisch": "Technische factoren die het incident direct mogelijk maakten",
      "organisatorisch": "Organisatorische factoren die het incident direct mogelijk maakten",
      "menselijk": "Menselijke factoren die het incident direct mogelijk maakten"
    },
    "achterliggendeOorzaken": {
      "beleidAfspraken": "Waarom waren de directe oorzaken aanwezig vanuit beleid/afspraken perspectief",
      "ontwerpVoorbereiding": "Waarom waren de directe oorzaken aanwezig vanuit ontwerp/voorbereiding perspectief",
      "planningTijdsdruk": "Waarom waren de directe oorzaken aanwezig vanuit planning/tijdsdruk perspectief",
      "toezichtControle": "Waarom waren de directe oorzaken aanwezig vanuit toezicht/controle perspectief",
      "opleidingInstructie": "Waarom waren de directe oorzaken aanwezig vanuit opleiding/instructie perspectief",
      "cultuurGedrag": "Waarom waren de directe oorzaken aanwezig vanuit cultuur/gedrag perspectief"
    },
    "barrieres": {
      "maatregelen": "Welke maatregelen hadden het incident moeten voorkomen",
      "gefaaldeBarrieres": "Welke barrières faalden",
      "waaromGefaald": "Waarom faalden deze barrières"
    },
    "gevolgen": {
      "letsel": "Beschrijving van letsel (indien van toepassing)",
      "materieleSchade": "Beschrijving van materiële schade",
      "verstoringWerkOmgeving": "Beschrijving van verstoring werk/omgeving",
      "potentiëleErnst": "Potentiële ernst bij andere afloop"
    },
    "lessen": "Wat moet structureel anders om herhaling te voorkomen. Formuleer dit organisatiebreed, niet persoonsgericht.",
    "maatregelen": [
      {
        "maatregel": "Beschrijving van de maatregel",
        "type": "technisch|organisatorisch|gedrag",
        "verantwoordelijke": "Verantwoordelijke voor de maatregel",
        "deadline": "Deadline voor de maatregel"
      }
    ],
    "borging": {
      "controleUitvoering": "Hoe wordt gecontroleerd dat maatregelen zijn uitgevoerd",
      "evaluatieEffect": "Hoe en wanneer wordt effect geëvalueerd",
      "delenLessen": "Hoe worden lessen gedeeld"
    }
  }
}

INSTRUCTIES:
- Summary: Minimaal 300 woorden, zeer gedetailleerd
- Recommendations: Minimaal 5-8 aanbevelingen, elk minimaal 2 zinnen
- SuggestedToolboxTopics: Minimaal 2-3 topics, elk met uitgebreide beschrijving (minimaal 100 woorden per topic)
- RiskAssessment: Minimaal 250 woorden, zeer gedetailleerd
- PreventiveMeasures: Minimaal 5-8 maatregelen, elk minimaal 2 zinnen
- IncidentAnalysis: VERPLICHT - Vul alle 10 secties van het sjabloon volledig in met gedetailleerde informatie. Dit is het primaire format voor de analyse.

CRITIEK: Je antwoord MOET beginnen met een geldig JSON object. Geen tekst vooraf, geen uitleg, alleen JSON. Gebruik deze exacte structuur en vul alle velden in.`;
    }
  }

  // Log het prompt dat wordt gebruikt
  console.log(`Using ${promptSource} prompt (first 200 chars):`, prompt.substring(0, 200));

  // Bepaal system message op basis van prompt source
  // Voor custom prompts, wees expliciet over de structuur
  const systemMessage = promptSource === 'custom'
    ? 'Je bent een AI assistent. Volg de instructies in het user bericht PRECIES op. Geef ALTIJD antwoord in geldige JSON formaat met de velden: summary, recommendations, suggestedToolboxTopics, riskAssessment, preventiveMeasures, en incidentAnalysis. Het incidentAnalysis veld is VERPLICHT en moet alle 10 secties bevatten. Gebruik NIET extracted_fields of andere structuren. Geef UITGEBREIDE en GEDETAILLEERDE antwoorden. Je antwoord MOET beginnen met een geldig JSON object - geen tekst vooraf, alleen JSON.'
    : 'Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. Je geeft altijd UITGEBREIDE, GEDETAILLEERDE en gestructureerde, praktische adviezen in JSON formaat. Het incidentAnalysis veld is VERPLICHT en moet alle 10 secties van het incidentanalyse sjabloon bevatten. Wees specifiek en concreet in je antwoorden. Geef minimaal 5-8 aanbevelingen en preventieve maatregelen. Geef uitgebreide samenvattingen en risico analyses (minimaal 250-300 woorden). Je antwoord MOET beginnen met een geldig JSON object - geen tekst vooraf, alleen JSON.';

  // Voer AI analyse uit
  let content: string;
  let tokensUsed: number | undefined;

  try {
    const temperature = getTemperatureForModel(model);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completionOptions: any = {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    };
    
    // Schat input tokens (ongeveer 4 characters per token is een goede schatting)
    const systemTokens = Math.ceil(systemMessage.length / 4);
    const promptTokens = Math.ceil(prompt.length / 4);
    const estimatedInputTokens = systemTokens + promptTokens + 50; // 50 tokens overhead
    
    // Bereken max completion tokens dynamisch op basis van model context limit
    // Voor analyse gebruiken we veel meer tokens om ervoor te zorgen dat het volledige sjabloon wordt ingevuld
    const maxCompletion = calculateMaxCompletionTokens(model, estimatedInputTokens, true);
    
    console.log('=== TOKEN CALCULATION ===');
    console.log('Model:', model);
    console.log('Model context limit:', getModelContextLimit(model));
    console.log('Estimated input tokens:', estimatedInputTokens);
    console.log('Calculated max completion tokens:', maxCompletion);
    
    // GPT-5 modellen gebruiken max_completion_tokens in plaats van max_tokens
    if (usesMaxCompletionTokens(model)) {
      completionOptions.max_completion_tokens = maxCompletion;
    } else {
      completionOptions.max_tokens = maxCompletion;
    }
    
    // Voeg temperature alleen toe als het model dit ondersteunt
    if (temperature !== undefined) {
      completionOptions.temperature = temperature;
    }

    console.log('=== SENDING TO OPENAI ===');
    console.log('Model:', model);
    console.log('Temperature:', temperature !== undefined ? temperature : 'default (1)');
    console.log('Prompt source:', promptSource);
    console.log('System message:', systemMessage);
    console.log('User message (prompt) length:', prompt.length);
    console.log('User message (prompt) first 500 chars:', prompt.substring(0, 500));
    console.log('User message (prompt) last 500 chars:', prompt.substring(Math.max(0, prompt.length - 500)));
    console.log('Completion options:', JSON.stringify({
      model: completionOptions.model,
      temperature: completionOptions.temperature,
      max_tokens: completionOptions.max_tokens,
      max_completion_tokens: completionOptions.max_completion_tokens,
      messages: [
        { role: completionOptions.messages[0].role, contentLength: completionOptions.messages[0].content.length },
        { role: completionOptions.messages[1].role, contentLength: completionOptions.messages[1].content.length }
      ]
    }, null, 2));
    
    console.log('Calling OpenAI API...');
    console.log('API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('API Key length:', process.env.OPENAI_API_KEY?.length || 0);
    console.log('API Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 7) || 'N/A');
    
    let completion;
    try {
      completion = await openai.chat.completions.create(completionOptions);
      console.log('OpenAI API call completed successfully');
    } catch (apiError) {
      console.error('=== OPENAI API CALL FAILED ===');
      console.error('API Error:', apiError);
      if (apiError && typeof apiError === 'object' && 'error' in apiError) {
        console.error('OpenAI Error Details:', JSON.stringify((apiError as { error: unknown }).error, null, 2));
      }
      throw apiError;
    }

    content = completion.choices[0]?.message?.content || '';
    tokensUsed = completion.usage?.total_tokens;

    console.log('=== OPENAI RESPONSE ===');
    console.log('Response length:', content.length);
    console.log('Response preview (first 500 chars):', content.substring(0, 500));
    console.log('Response preview (last 500 chars):', content.substring(Math.max(0, content.length - 500)));
    console.log('Tokens used:', tokensUsed);
    console.log('Completion finish reason:', completion.choices[0]?.finish_reason);
    
    // Check of de response mogelijk is afgekapt
    if (completion.choices[0]?.finish_reason === 'length') {
      const tokenParam = usesMaxCompletionTokens(model) ? 'max_completion_tokens' : 'max_tokens';
      console.warn(`⚠️ WARNING: Response was truncated due to ${tokenParam} limit!`);
    }

    // Check voor specifieke finish reasons
    if (completion.choices?.[0]?.finish_reason === 'content_filter') {
      throw new Error('Geen response van OpenAI - content werd gefilterd door safety filters');
    }
    
    // Als response was afgekapt, gebruik wat we hebben maar geef waarschuwing
    if (completion.choices?.[0]?.finish_reason === 'length') {
      console.warn('⚠️ Response was afgekapt door token limiet, maar we gebruiken wat we hebben');
      if (content) {
        // Voeg waarschuwing toe aan het begin van de content
        content = '⚠️ WAARSCHUWING: Deze analyse is mogelijk incompleet omdat de response werd afgekapt door de token limiet.\n\n' + content;
      }
    }
    
    if (!content) {
      console.error('=== OPENAI RESPONSE ERROR ===');
      console.error('No content in response');
      console.error('Completion object:', JSON.stringify(completion, null, 2));
      console.error('Finish reason:', completion.choices[0]?.finish_reason);
      console.error('Model used:', model);
      console.error('Has choices:', completion.choices?.length > 0);
      console.error('First choice:', completion.choices?.[0] ? JSON.stringify(completion.choices[0], null, 2) : 'No choices');
      
      throw new Error('Geen response van OpenAI - de API gaf geen content terug. Check de server logs voor meer details.');
    }
  } catch (error) {
    console.error('=== ERROR CALLING OPENAI ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Check voor specifieke OpenAI API errors
    if (error && typeof error === 'object') {
      // OpenAI SDK errors hebben vaak een 'status' en 'response' property
      if ('status' in error) {
        console.error('OpenAI API HTTP status:', (error as { status?: number }).status);
      }
      if ('response' in error) {
        console.error('OpenAI API error response:', JSON.stringify((error as { response?: unknown }).response, null, 2));
      }
      // Check voor rate limit errors
      if ('code' in error && (error as { code?: string }).code === 'rate_limit_exceeded') {
        throw new Error('AI analyse mislukt: Rate limit bereikt. Probeer het over een paar minuten opnieuw.');
      }
      // Check voor invalid API key
      if ('code' in error && (error as { code?: string }).code === 'invalid_api_key') {
        throw new Error('AI analyse mislukt: Ongeldige OpenAI API key. Check je environment variabelen.');
      }
      // Check voor model not found
      if ('code' in error && (error as { code?: string }).code === 'model_not_found') {
        throw new Error(`AI analyse mislukt: Model "${model}" niet gevonden. Check of het model beschikbaar is.`);
      }
      // Check voor andere OpenAI error codes
      if ('code' in error) {
        console.error('OpenAI error code:', (error as { code?: string }).code);
      }
    }
    
    throw new Error(`AI analyse mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
  }

  // Parse de output
  let parsed: unknown;
  try {
    console.log('=== PARSING AI OUTPUT ===');
    parsed = parseAIOutput(content);
    console.log('Parsed output keys:', typeof parsed === 'object' && parsed !== null ? Object.keys(parsed) : []);
    console.log('Parsed output preview:', JSON.stringify(parsed).substring(0, 500));
  } catch (error) {
    console.error('Error parsing AI output:', error);
    parsed = { rawContent: content };
  }

  // Normaliseer naar standaard structuur
  let result: AIAnalysisResult;
  
  // Check of de output de verwachte structuur heeft
  // Accepteer zowel de standaard structuur als extracted_fields structuur
  const hasValidStructure = parsed &&
    typeof parsed === 'object' &&
    !('rawContent' in parsed) &&
    (('summary' in parsed && parsed.summary) || ('recommendations' in parsed && parsed.recommendations) || ('riskAssessment' in parsed && parsed.riskAssessment) || ('extracted_fields' in parsed && parsed.extracted_fields));

  if (hasValidStructure) {
    console.log('=== AI OUTPUT HAS VALID STRUCTURE ===');
    console.log('Normalizing output...');
    result = normalizeAnalysisResult(parsed);
    console.log('Normalized result keys:', Object.keys(result));
  } else {
    console.log('=== AI OUTPUT DOES NOT HAVE EXPECTED STRUCTURE ===');
    console.log('Parsed structure:', {
      hasSummary: typeof parsed === 'object' && parsed !== null && 'summary' in parsed && !!parsed.summary,
      hasRecommendations: typeof parsed === 'object' && parsed !== null && 'recommendations' in parsed && !!parsed.recommendations,
      hasRiskAssessment: typeof parsed === 'object' && parsed !== null && 'riskAssessment' in parsed && !!parsed.riskAssessment,
      hasRawContent: typeof parsed === 'object' && parsed !== null && 'rawContent' in parsed && !!parsed.rawContent,
      allKeys: typeof parsed === 'object' && parsed !== null ? Object.keys(parsed) : []
    });
    console.log('Using AI to structure output...');
    // Gebruik AI om de output te structureren
    try {
      result = await structureAnalysisOutput(content, prompt.includes('structuur') ? prompt : undefined, model);
      console.log('Successfully structured output with AI');
      
      // Valideer dat incidentAnalysis aanwezig is na structurering
      if (!result.incidentAnalysis) {
        console.warn('⚠️ incidentAnalysis nog steeds ontbreekt na structurering, probeer opnieuw...');
        // Probeer het nog een keer met een meer expliciete prompt
        try {
          const retryResult = await structureAnalysisOutput(content, undefined, model);
          if (retryResult.incidentAnalysis) {
            result.incidentAnalysis = retryResult.incidentAnalysis;
            console.log('✅ incidentAnalysis hersteld via retry');
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }
    } catch (error) {
      console.error('Error structuring output, using fallback:', error);
      // Ultimate fallback
      result = normalizeAnalysisResult({ rawContent: content });
      console.log('Using fallback normalization');
    }
  }

  result.tokensUsed = tokensUsed;

  // Zorg dat alle vereiste velden aanwezig zijn
  if (!result.summary || result.summary.trim() === '') {
    result.summary = 'Geen samenvatting beschikbaar.';
  }
  if (!Array.isArray(result.recommendations)) {
    result.recommendations = [];
  }
  if (!Array.isArray(result.suggestedToolboxTopics)) {
    result.suggestedToolboxTopics = [];
  }
  if (!result.riskAssessment || result.riskAssessment.trim() === '') {
    result.riskAssessment = 'Geen risico inschatting beschikbaar.';
  }
  if (!Array.isArray(result.preventiveMeasures)) {
    result.preventiveMeasures = [];
  }

  // VALIDEER incidentAnalysis - dit is VERPLICHT
  if (!result.incidentAnalysis) {
    console.warn('⚠️ WARNING: incidentAnalysis ontbreekt in AI response!');
    console.warn('Parsed keys:', typeof parsed === 'object' && parsed !== null ? Object.keys(parsed) : []);
    console.warn('Has incidentAnalysis in parsed:', typeof parsed === 'object' && parsed !== null && 'incidentAnalysis' in parsed);
    
    // Probeer het alsnog uit de parsed data te halen
    if (typeof parsed === 'object' && parsed !== null && 'incidentAnalysis' in parsed) {
      const ia = (parsed as { incidentAnalysis?: unknown }).incidentAnalysis;
      if (ia && typeof ia === 'object' && ia !== null) {
        result.incidentAnalysis = ia as IncidentAnalysisTemplate;
        console.log('✅ Successfully extracted incidentAnalysis from parsed data');
      }
    }
    
    // Als nog steeds geen incidentAnalysis: probeer het uit de raw content te halen
    if (!result.incidentAnalysis && typeof content === 'string') {
      console.log('Attempting to extract incidentAnalysis from raw content...');
      try {
        // Probeer JSON te vinden in de content
        const jsonMatch = content.match(/"incidentAnalysis"\s*:\s*(\{[^}]*\})/);
        if (jsonMatch) {
          try {
            const iaJson = JSON.parse(`{${jsonMatch[0]}}`);
            if (iaJson.incidentAnalysis) {
              result.incidentAnalysis = iaJson.incidentAnalysis as IncidentAnalysisTemplate;
              console.log('✅ Successfully extracted incidentAnalysis from raw content');
            }
          } catch (e) {
            console.error('Failed to parse extracted incidentAnalysis:', e);
          }
        }
      } catch (e) {
        console.error('Error extracting incidentAnalysis from raw content:', e);
      }
      
      // Als nog steeds geen incidentAnalysis: vraag expliciet om alleen incidentAnalysis
      if (!result.incidentAnalysis) {
        console.log('⚠️ incidentAnalysis nog steeds ontbreekt, vraag expliciet om alleen incidentAnalysis...');
        try {
          const incidentAnalysisPrompt = `Je hebt een AI analyse output ontvangen. Genereer ALLEEN het "incidentAnalysis" object volgens dit exacte sjabloon:

{
  "incidentAnalysis": {
    "basisgegevens": {
      "datumIncident": "Datum van het incident",
      "tijd": "Tijdstip van het incident",
      "locatie": "Locatie van het incident",
      "projectWerk": "Project of werk waar het incident plaatsvond",
      "betrokkenOrganisaties": "Betrokken organisatie(s)",
      "betrokkenPersonen": "Betrokken personen (functie, geen namen)",
      "typeIncident": "Type incident (ongeval, bijna-ongeval, onveilige situatie)"
    },
    "feitenrelaas": "Beschrijf objectief wat er is gebeurd. Geen aannames, geen meningen, geen schuldvraag.",
    "afwijking": "Wat ging anders dan bedoeld, afgesproken of verwacht. Verwijs naar procedures, werkafspraken of ontwerp.",
    "directeOorzaken": {
      "technisch": "Technische factoren die het incident direct mogelijk maakten",
      "organisatorisch": "Organisatorische factoren die het incident direct mogelijk maakten",
      "menselijk": "Menselijke factoren die het incident direct mogelijk maakten"
    },
    "achterliggendeOorzaken": {
      "beleidAfspraken": "Waarom waren de directe oorzaken aanwezig vanuit beleid/afspraken perspectief",
      "ontwerpVoorbereiding": "Waarom waren de directe oorzaken aanwezig vanuit ontwerp/voorbereiding perspectief",
      "planningTijdsdruk": "Waarom waren de directe oorzaken aanwezig vanuit planning/tijdsdruk perspectief",
      "toezichtControle": "Waarom waren de directe oorzaken aanwezig vanuit toezicht/controle perspectief",
      "opleidingInstructie": "Waarom waren de directe oorzaken aanwezig vanuit opleiding/instructie perspectief",
      "cultuurGedrag": "Waarom waren de directe oorzaken aanwezig vanuit cultuur/gedrag perspectief"
    },
    "barrieres": {
      "maatregelen": "Welke maatregelen hadden het incident moeten voorkomen",
      "gefaaldeBarrieres": "Welke barrières faalden",
      "waaromGefaald": "Waarom faalden deze barrières"
    },
    "gevolgen": {
      "letsel": "Beschrijving van letsel (indien van toepassing)",
      "materieleSchade": "Beschrijving van materiële schade",
      "verstoringWerkOmgeving": "Beschrijving van verstoring werk/omgeving",
      "potentiëleErnst": "Potentiële ernst bij andere afloop"
    },
    "lessen": "Wat moet structureel anders om herhaling te voorkomen. Formuleer dit organisatiebreed, niet persoonsgericht.",
    "maatregelen": [
      {
        "maatregel": "Beschrijving van de maatregel",
        "type": "technisch|organisatorisch|gedrag",
        "verantwoordelijke": "Verantwoordelijke voor de maatregel",
        "deadline": "Deadline voor de maatregel"
      }
    ],
    "borging": {
      "controleUitvoering": "Hoe wordt gecontroleerd dat maatregelen zijn uitgevoerd",
      "evaluatieEffect": "Hoe en wanneer wordt effect geëvalueerd",
      "delenLessen": "Hoe worden lessen gedeeld"
    }
  }
}

Originele analyse output:
${content.substring(0, 10000)}

Geef ALLEEN het JSON object terug met het incidentAnalysis veld, zonder extra tekst of markdown.`;

          const retryCompletionOptions: any = {
            model: model,
            messages: [
              {
                role: 'system',
                content: 'Je bent een expert in het genereren van incidentanalyse sjablonen. Geef altijd geldige JSON terug met het volledige incidentAnalysis object met alle 10 secties.',
              },
              {
                role: 'user',
                content: incidentAnalysisPrompt,
              },
            ],
          };
          
          const estimatedInputTokens = Math.ceil(incidentAnalysisPrompt.length / 4) + 100;
          const maxCompletion = calculateMaxCompletionTokens(model, estimatedInputTokens, true);
          
          if (usesMaxCompletionTokens(model)) {
            retryCompletionOptions.max_completion_tokens = maxCompletion;
          } else {
            retryCompletionOptions.max_tokens = maxCompletion;
          }
          
          const retryCompletion = await openai.chat.completions.create(retryCompletionOptions);
          const retryContent = retryCompletion.choices[0]?.message?.content || '';
          
          if (retryContent) {
            const retryParsed = parseAIOutput(retryContent);
            if (typeof retryParsed === 'object' && retryParsed !== null && 'incidentAnalysis' in retryParsed) {
              const ia = (retryParsed as { incidentAnalysis?: unknown }).incidentAnalysis;
              if (ia && typeof ia === 'object' && ia !== null) {
                result.incidentAnalysis = ia as IncidentAnalysisTemplate;
                console.log('✅ Successfully generated incidentAnalysis via explicit retry');
              }
            }
          }
        } catch (retryError) {
          console.error('Error in explicit incidentAnalysis retry:', retryError);
        }
      }
    }
  } else {
    console.log('✅ incidentAnalysis is aanwezig in result');
    console.log('incidentAnalysis keys:', Object.keys(result.incidentAnalysis));
  }

  // Voeg extractedFields en photoAnalysis toe aan result
  const allExtractedFields: Record<string, Record<string, unknown>> = {};
  const allPhotoAnalysis: Record<string, string> = {};
  
  photoAnalyses.forEach((analysis, idx) => {
    const incidentId = incidents[idx].incidentId;
    if (analysis.extractedFields && typeof analysis.extractedFields === 'object' && Object.keys(analysis.extractedFields).length > 0) {
      allExtractedFields[incidentId] = analysis.extractedFields as Record<string, unknown>;
    }
    if (analysis.photoAnalysis && analysis.photoAnalysis.trim().length > 0) {
      allPhotoAnalysis[incidentId] = analysis.photoAnalysis;
    }
  });

  if (Object.keys(allExtractedFields).length > 0) {
    result.extractedFields = allExtractedFields;
  }
  if (Object.keys(allPhotoAnalysis).length > 0) {
    result.photoAnalysis = allPhotoAnalysis;
  }

  // Combineer photo-based recommendations met bestaande recommendations
  // (deze kunnen worden geëxtraheerd uit de photo analysis response als die aanwezig is)
  const photoRecommendations: string[] = [];
  photoAnalyses.forEach(analysis => {
    // Als de photo analysis recommendations bevat, voeg deze toe
    // Dit zou kunnen worden toegevoegd aan de analyzePhotosWithVision response structuur
  });

  if (photoRecommendations.length > 0) {
    result.recommendations = [...(result.recommendations || []), ...photoRecommendations];
  }

  console.log('Analysis completed successfully:', {
    hasSummary: !!result.summary,
    summaryLength: result.summary?.length || 0,
    recommendationsCount: result.recommendations.length,
    toolboxTopicsCount: result.suggestedToolboxTopics.length,
    hasRiskAssessment: !!result.riskAssessment,
    riskAssessmentLength: result.riskAssessment?.length || 0,
    preventiveMeasuresCount: result.preventiveMeasures.length,
    hasIncidentAnalysis: !!result.incidentAnalysis,
    hasExtractedFields: !!result.extractedFields && Object.keys(result.extractedFields).length > 0,
    hasPhotoAnalysis: !!result.photoAnalysis && Object.keys(result.photoAnalysis).length > 0,
    hasRawContent: !!result.rawContent,
    rawContentLength: typeof result.rawContent === 'string' ? result.rawContent.length : 0,
  });

  // Als er helemaal geen data is, voeg rawContent toe zodat de UI het kan tonen
  if (!result.summary && !result.incidentAnalysis && !result.rawContent && typeof content === 'string') {
    console.warn('⚠️ No structured data found, adding raw content to result');
    result.rawContent = content.substring(0, 10000); // Limiteer tot 10k chars
  }

  return result;
}

export async function generateToolboxContent(
  topic: string,
  description: string,
  context?: {
    incidentIds?: string[];
    recommendations?: string[];
    actions?: Array<{
      title: string;
      description: string;
      priority: string;
      status: string;
      actionHolder?: string | null;
      deadline?: string | null;
    }>;
  },
  model: string = 'gpt-4o'
): Promise<{
  items: Array<{
    title: string;
    description: string;
    category: string;
  }>;
}> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  let actionsText = '';
  if (context?.actions && context.actions.length > 0) {
    actionsText = `\n\nIncident Acties die moeten worden meegenomen:\n`;
    context.actions.forEach((action, idx) => {
      actionsText += `${idx + 1}. ${action.title}: ${action.description}`;
      if (action.priority) {
        actionsText += ` (Prioriteit: ${action.priority})`;
      }
      if (action.status) {
        actionsText += ` (Status: ${action.status})`;
      }
      actionsText += `\n`;
    });
  }

  const prompt = `Genereer een toolbox voor het onderwerp: "${topic}"

Beschrijving: ${description}

${context?.recommendations ? `Aanbevelingen: ${context.recommendations.join(', ')}` : ''}${actionsText}

Maak een praktische toolbox met items die nuttig zijn voor professionals die werken met dit onderwerp in de context van ondergrondse infrastructuur. Zorg ervoor dat de toolbox items aansluiten bij de aanbevelingen en incident acties.

Geef ALLEEN de JSON terug in dit exacte formaat (zonder extra tekst of markdown):
{
  "items": [
    {
      "title": "Item titel",
      "description": "Uitgebreide beschrijving van het item",
      "category": "Categorie naam"
    }
  ]
}`;

  const temperature = getTemperatureForModel(model);
  const completionOptions: any = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'Je bent een expert in het maken van praktische toolboxes voor veiligheid in ondergrondse infrastructuur. Geef altijd geldige JSON terug.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  };
  
  // GPT-5 modellen gebruiken max_completion_tokens in plaats van max_tokens
  if (usesMaxCompletionTokens(model)) {
    completionOptions.max_completion_tokens = 2000;
  } else {
    completionOptions.max_tokens = 2000;
  }
  
  // Voeg temperature alleen toe als het model dit ondersteunt
  if (temperature !== undefined) {
    completionOptions.temperature = temperature;
  }

  const completion = await openai.chat.completions.create(completionOptions);

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Geen response van OpenAI');
  }

  let jsonContent = content.trim();
  const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonContent);
    if (parsed.items && Array.isArray(parsed.items)) {
      return parsed;
    } else if (parsed.toolbox && parsed.toolbox.items && Array.isArray(parsed.toolbox.items)) {
      return { items: parsed.toolbox.items };
    } else if (parsed.toolbox && Array.isArray(parsed.toolbox)) {
      return { items: parsed.toolbox };
    } else {
      throw new Error('JSON structuur is ongeldig: items array ontbreekt');
    }
  } catch (error) {
    const firstBrace = jsonContent.indexOf('{');
    const lastBrace = jsonContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(jsonContent);
        if (parsed.items && Array.isArray(parsed.items)) {
          return parsed;
        } else if (parsed.toolbox && parsed.toolbox.items && Array.isArray(parsed.toolbox.items)) {
          return { items: parsed.toolbox.items };
        } else if (parsed.toolbox && Array.isArray(parsed.toolbox)) {
          return { items: parsed.toolbox };
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        throw new Error(`Kon JSON niet parsen: ${jsonContent.substring(0, 200)}`);
      }
    }
    throw new Error(`Kon JSON niet parsen: ${jsonContent.substring(0, 200)}`);
  }
}

export async function suggestActionsFromAnalysis(
  analysis: AIAnalysisResult,
  incident: SafetyIncidentForAnalysis,
  model: string = 'gpt-4o'
): Promise<SuggestedAction[]> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. 
Op basis van de volgende AI analyse en het bijbehorende incident, stel concrete, uitvoerbare acties voor.

Incident:
- ID: ${incident.incidentId}
- Titel: ${incident.title}
- Beschrijving: ${incident.description}
- Categorie: ${incident.category}
- Ernst: ${incident.severity}
- Discipline: ${incident.discipline || 'Onbekend'}
- Locatie: ${incident.location || 'Onbekend'}
- Impact: ${incident.impact || 'Niet gespecificeerd'}

AI Analyse Samenvatting:
${analysis.summary}

Aanbevelingen:
${analysis.recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join('\n')}

Risico Assessment:
${analysis.riskAssessment}

Voorkomende Maatregelen:
${analysis.preventiveMeasures.map((measure, idx) => `${idx + 1}. ${measure}`).join('\n')}

Stel nu concrete, uitvoerbare acties voor die genomen moeten worden om dit incident op te lossen en toekomstige incidenten te voorkomen.

Geef ALLEEN de JSON terug in dit exacte formaat (zonder extra tekst of markdown):
{
  "actions": [
    {
      "title": "Korte, duidelijke titel van de actie",
      "description": "Gedetailleerde beschrijving van wat er moet gebeuren en waarom",
      "priority": "low|medium|high|urgent",
      "suggestedDeadline": "YYYY-MM-DD (optioneel, alleen als er een duidelijke deadline is)",
      "suggestedActionHolder": "Voorgestelde naam van actiehouder (optioneel)",
      "suggestedActionHolderEmail": "Voorgestelde email van actiehouder (optioneel)"
    }
  ]
}

BELANGRIJK:
- Geef minstens 3 en maximaal 10 acties terug
- Elke actie moet concreet, uitvoerbaar en meetbaar zijn
- Prioriteit moet gebaseerd zijn op de ernst van het incident en de urgentie van de actie
- Voorgestelde deadlines zijn optioneel, gebruik alleen als er een duidelijke deadline is
- Geef ALLEEN geldige JSON terug, zonder markdown code blocks`;

  const temperature = getTemperatureForModel(model);
  const completionOptions: any = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. Je geeft altijd gestructureerde, praktische adviezen in JSON formaat. Antwoord ALLEEN met geldige JSON, zonder markdown formatting of extra tekst.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  };
  
  // GPT-5 modellen gebruiken max_completion_tokens in plaats van max_tokens
  if (usesMaxCompletionTokens(model)) {
    completionOptions.max_completion_tokens = 2000;
  } else {
    completionOptions.max_tokens = 2000;
  }
  
  // Voeg temperature alleen toe als het model dit ondersteunt
  if (temperature !== undefined) {
    completionOptions.temperature = temperature;
  }

  const completion = await openai.chat.completions.create(completionOptions);

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Geen response van OpenAI');
  }

  let jsonContent = content.trim();
  const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }

  try {
    const result = JSON.parse(jsonContent) as { actions: SuggestedAction[] };
    if (!result.actions || !Array.isArray(result.actions)) {
      throw new Error('Geen acties gevonden in AI response');
    }
    return result.actions;
  } catch (error) {
    const firstBrace = jsonContent.indexOf('{');
    const lastBrace = jsonContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      const result = JSON.parse(jsonContent) as { actions: SuggestedAction[] };
      if (!result.actions || !Array.isArray(result.actions)) {
        throw new Error('Geen acties gevonden in AI response');
      }
      return result.actions;
    } else {
      throw new Error(`Kon JSON niet parsen: ${jsonContent.substring(0, 200)}`);
    }
  }
}
