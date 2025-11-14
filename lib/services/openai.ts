import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set in environment variables');
}

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

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

export interface AIAnalysisResult {
  summary: string;
  recommendations: string[];
  suggestedToolboxTopics: SuggestedToolboxTopic[];
  riskAssessment: string;
  preventiveMeasures: string[];
  extractedFields?: { // Geëxtraheerde velden uit foto's
    [incidentId: string]: {
      [key: string]: any;
    };
  };
  photoAnalysis?: { // Foto analyse per incident
    [incidentId: string]: string;
  };
  tokensUsed?: number;
  [key: string]: any; // Allow additional fields from custom prompts
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
 * Genereer een AI prompt voor incident analyse als er geen custom prompt is
 */
async function generateAnalysisPrompt(incidentsData: string, model: string = 'gpt-4'): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. 
Maak een uitgebreid analyse prompt voor veiligheidsmeldingen.

De incident data die geanalyseerd moet worden:
${incidentsData.substring(0, 500)}...

Maak een prompt dat:
1. De incidenten grondig analyseert
2. Patronen en risico's identificeert
3. Praktische aanbevelingen geeft
4. Toolbox onderwerpen voorstelt
5. Preventieve maatregelen benoemt

Geef het prompt terug als een complete instructie die direct gebruikt kan worden voor AI analyse.
Het prompt moet de {incidents} placeholder bevatten waar de incident data wordt ingevoegd.

Geef ALLEEN het prompt terug, zonder extra uitleg.`;

  try {
    const temperature = getTemperatureForModel(model);
    const completionOptions: any = {
      model: model,
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
    // Fallback naar standaard prompt
    return `Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. 
Analyseer de volgende veiligheidsmeldingen grondig en geef uitgebreid advies.

Veiligheidsmeldingen:
{incidents}

Geef een uitgebreide analyse in JSON formaat met de volgende structuur:
{
  "summary": "Een samenvatting van alle meldingen en patronen die je ziet",
  "recommendations": ["Aanbeveling 1", "Aanbeveling 2", ...],
  "suggestedToolboxTopics": [
    {
      "topic": "Onderwerp naam",
      "description": "Waarom dit onderwerp belangrijk is",
      "priority": "high|medium|low",
      "suggestedItems": ["Item 1", "Item 2", ...]
    }
  ],
  "riskAssessment": "Uitgebreide risico analyse",
  "preventiveMeasures": ["Maatregel 1", "Maatregel 2", ...]
}

Geef alleen de JSON terug, zonder extra tekst.`;
  }
}

/**
 * Structureer AI output met AI als de output niet de verwachte structuur heeft
 */
async function structureAnalysisOutput(
  rawOutput: string,
  expectedStructure?: string,
  model: string = 'gpt-4'
): Promise<AIAnalysisResult> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `Je hebt een AI analyse output ontvangen die mogelijk niet de juiste structuur heeft.
Structureer deze output in een geldige JSON structuur.

Raw output:
${rawOutput.substring(0, 2000)}

${expectedStructure ? `Verwachte structuur:\n${expectedStructure}` : 'Gebruik deze standaard structuur:'}

{
  "summary": "Een samenvatting van de analyse",
  "recommendations": ["Aanbeveling 1", "Aanbeveling 2", ...],
  "suggestedToolboxTopics": [
    {
      "topic": "Onderwerp naam",
      "description": "Waarom dit onderwerp belangrijk is",
      "priority": "high|medium|low",
      "suggestedItems": ["Item 1", "Item 2", ...]
    }
  ],
  "riskAssessment": "Uitgebreide risico analyse",
  "preventiveMeasures": ["Maatregel 1", "Maatregel 2", ...]
}

Geef ALLEEN de gestructureerde JSON terug, zonder extra tekst of markdown.`;

  try {
    // Voor structureren gebruik lagere temperature, maar respecteer model beperkingen
    const baseTemperature = getTemperatureForModel(model);
    const temperature = baseTemperature !== undefined ? 0.3 : undefined; // Lagere temperature voor meer consistente output
    
    const completionOptions: any = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Je bent een expert in het structureren van AI outputs. Geef altijd geldige JSON terug.',
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
function parseAIOutput(content: string): any {
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
function normalizeAnalysisResult(parsed: any): AIAnalysisResult {
  const result: AIAnalysisResult = {
    summary: '',
    recommendations: [],
    suggestedToolboxTopics: [],
    riskAssessment: '',
    preventiveMeasures: [],
  };

  // Als er een extracted_fields structuur is, converteer deze naar de standaard structuur
  if (parsed.extracted_fields && typeof parsed.extracted_fields === 'object') {
    console.log('Found extracted_fields structure, converting to standard structure...');
    const extracted = parsed.extracted_fields;
    
    // Maak samenvatting van extracted fields
    const summaryParts: string[] = [];
    if (extracted.beschrijving) summaryParts.push(`Beschrijving: ${extracted.beschrijving}`);
    if (extracted.aard_incident) summaryParts.push(`Aard incident: ${extracted.aard_incident}`);
    if (extracted.categorie) summaryParts.push(`Categorie: ${extracted.categorie}`);
    if (extracted.ernst) summaryParts.push(`Ernst: ${extracted.ernst}`);
    if (extracted.genomen_maatregelen) summaryParts.push(`Genomen maatregelen: ${extracted.genomen_maatregelen}`);
    
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
      result.riskAssessment = `Ernst niveau: ${extracted.ernst}. ${extracted.aard_incident || extracted.beschrijving || 'Risico inschatting op basis van beschikbare informatie.'}`;
    } else {
      result.riskAssessment = extracted.aard_incident || extracted.beschrijving || 'Geen risico inschatting beschikbaar.';
    }
    
    return result;
  }

  // Extract summary
  if (parsed.summary && typeof parsed.summary === 'string') {
    result.summary = parsed.summary;
  } else if (parsed.rawContent) {
    result.summary = parsed.rawContent.substring(0, 500);
  } else {
    result.summary = 'Geen samenvatting beschikbaar.';
  }

  // Extract recommendations
  if (Array.isArray(parsed.recommendations)) {
    result.recommendations = parsed.recommendations.filter((r: any) => typeof r === 'string');
  } else if (parsed.recommendations && typeof parsed.recommendations === 'string') {
    result.recommendations = [parsed.recommendations];
  }

  // Extract suggestedToolboxTopics
  if (Array.isArray(parsed.suggestedToolboxTopics)) {
    result.suggestedToolboxTopics = parsed.suggestedToolboxTopics.filter((t: any) => 
      t && typeof t === 'object' && t.topic
    );
  }

  // Extract riskAssessment
  if (parsed.riskAssessment && typeof parsed.riskAssessment === 'string') {
    result.riskAssessment = parsed.riskAssessment;
  } else {
    result.riskAssessment = 'Geen risico inschatting beschikbaar.';
  }

  // Extract preventiveMeasures
  if (Array.isArray(parsed.preventiveMeasures)) {
    result.preventiveMeasures = parsed.preventiveMeasures.filter((m: any) => typeof m === 'string');
  } else if (parsed.preventiveMeasures && typeof parsed.preventiveMeasures === 'string') {
    result.preventiveMeasures = [parsed.preventiveMeasures];
  }

  // Copy any additional fields
  Object.keys(parsed).forEach(key => {
    if (!['summary', 'recommendations', 'suggestedToolboxTopics', 'riskAssessment', 'preventiveMeasures', 'rawContent'].includes(key)) {
      result[key] = parsed[key];
    }
  });

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
): Promise<{ extractedFields: any; photoAnalysis: string }> {
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
  model: string = 'gpt-4'
): Promise<AIAnalysisResult> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  // Analyseer foto's voor elk incident dat foto's heeft
  const photoAnalyses: Array<{ extractedFields: any; photoAnalysis: string }> = [];
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
        console.log(`Photo analysis completed for incident ${incident.incidentId}, extracted ${Object.keys(photoAnalysis.extractedFields).length} fields`);
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
${Object.keys(photoInfo.extractedFields).length > 0 ? `\nGeëxtraheerde informatie uit foto's:\n${JSON.stringify(photoInfo.extractedFields, null, 2)}` : ''}
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
{
  "summary": "Een uitgebreide samenvatting van alle meldingen en patronen die je ziet",
  "recommendations": ["Aanbeveling 1", "Aanbeveling 2", ...],
  "suggestedToolboxTopics": [
    {
      "topic": "Onderwerp naam",
      "description": "Waarom dit onderwerp belangrijk is",
      "priority": "high|medium|low",
      "suggestedItems": ["Item 1", "Item 2", ...]
    }
  ],
  "riskAssessment": "Uitgebreide risico analyse",
  "preventiveMeasures": ["Maatregel 1", "Maatregel 2", ...]
}

GEBRUIK DEZE STRUCTUUR. Geef ALLEEN de JSON terug, zonder extra tekst of markdown formatting.`;
    } else if (!hasJsonInstructions) {
      console.log('Custom prompt does not contain JSON structure instructions, adding them...');
      prompt += `\n\nBELANGRIJK: Geef je antwoord ALLEEN terug in JSON formaat met deze exacte structuur:
{
  "summary": "Een samenvatting van alle meldingen en patronen die je ziet",
  "recommendations": ["Aanbeveling 1", "Aanbeveling 2", ...],
  "suggestedToolboxTopics": [
    {
      "topic": "Onderwerp naam",
      "description": "Waarom dit onderwerp belangrijk is",
      "priority": "high|medium|low",
      "suggestedItems": ["Item 1", "Item 2", ...]
    }
  ],
  "riskAssessment": "Uitgebreide risico analyse",
  "preventiveMeasures": ["Maatregel 1", "Maatregel 2", ...]
}

Geef ALLEEN de JSON terug, zonder extra tekst of markdown formatting.`;
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
      // Fallback naar standaard prompt
      prompt = `Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. 
Analyseer de volgende veiligheidsmeldingen grondig en geef uitgebreid advies.

Veiligheidsmeldingen:
${incidentsData}

Geef een uitgebreide analyse in JSON formaat met de volgende structuur:
{
  "summary": "Een samenvatting van alle meldingen en patronen die je ziet",
  "recommendations": ["Aanbeveling 1", "Aanbeveling 2", ...],
  "suggestedToolboxTopics": [
    {
      "topic": "Onderwerp naam",
      "description": "Waarom dit onderwerp belangrijk is",
      "priority": "high|medium|low",
      "suggestedItems": ["Item 1", "Item 2", ...]
    }
  ],
  "riskAssessment": "Uitgebreide risico analyse",
  "preventiveMeasures": ["Maatregel 1", "Maatregel 2", ...]
}

Geef alleen de JSON terug, zonder extra tekst.`;
    }
  }

  // Log het prompt dat wordt gebruikt
  console.log(`Using ${promptSource} prompt (first 200 chars):`, prompt.substring(0, 200));

  // Bepaal system message op basis van prompt source
  // Voor custom prompts, wees expliciet over de structuur
  const systemMessage = promptSource === 'custom'
    ? 'Je bent een AI assistent. Volg de instructies in het user bericht PRECIES op. Geef ALTIJD antwoord in geldige JSON formaat met de velden: summary, recommendations, suggestedToolboxTopics, riskAssessment, en preventiveMeasures. Gebruik NIET extracted_fields of andere structuren. Geef ALLEEN de JSON terug, zonder markdown formatting of extra tekst.'
    : 'Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. Je geeft altijd gestructureerde, praktische adviezen in JSON formaat. Antwoord ALLEEN met geldige JSON, zonder markdown formatting of extra tekst.';

  // Voer AI analyse uit
  let content: string;
  let tokensUsed: number | undefined;

  try {
    const temperature = getTemperatureForModel(model);
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
    
    // GPT-5 modellen gebruiken max_completion_tokens in plaats van max_tokens
    // Verhoogde limiet voor uitgebreide analyses (inclusief foto analyses)
    if (usesMaxCompletionTokens(model)) {
      completionOptions.max_completion_tokens = 16000;
    } else {
      completionOptions.max_tokens = 16000;
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
        console.error('OpenAI Error Details:', JSON.stringify((apiError as any).error, null, 2));
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
        console.error('OpenAI API HTTP status:', (error as any).status);
      }
      if ('response' in error) {
        console.error('OpenAI API error response:', JSON.stringify((error as any).response, null, 2));
      }
      // Check voor rate limit errors
      if ('code' in error && (error as any).code === 'rate_limit_exceeded') {
        throw new Error('AI analyse mislukt: Rate limit bereikt. Probeer het over een paar minuten opnieuw.');
      }
      // Check voor invalid API key
      if ('code' in error && (error as any).code === 'invalid_api_key') {
        throw new Error('AI analyse mislukt: Ongeldige OpenAI API key. Check je environment variabelen.');
      }
      // Check voor model not found
      if ('code' in error && (error as any).code === 'model_not_found') {
        throw new Error(`AI analyse mislukt: Model "${model}" niet gevonden. Check of het model beschikbaar is.`);
      }
      // Check voor andere OpenAI error codes
      if ('code' in error) {
        console.error('OpenAI error code:', (error as any).code);
      }
    }
    
    throw new Error(`AI analyse mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
  }

  // Parse de output
  let parsed: any;
  try {
    console.log('=== PARSING AI OUTPUT ===');
    parsed = parseAIOutput(content);
    console.log('Parsed output keys:', Object.keys(parsed));
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
    !parsed.rawContent &&
    (parsed.summary || parsed.recommendations || parsed.riskAssessment || parsed.extracted_fields);

  if (hasValidStructure) {
    console.log('=== AI OUTPUT HAS VALID STRUCTURE ===');
    console.log('Normalizing output...');
    result = normalizeAnalysisResult(parsed);
    console.log('Normalized result keys:', Object.keys(result));
  } else {
    console.log('=== AI OUTPUT DOES NOT HAVE EXPECTED STRUCTURE ===');
    console.log('Parsed structure:', {
      hasSummary: !!parsed.summary,
      hasRecommendations: !!parsed.recommendations,
      hasRiskAssessment: !!parsed.riskAssessment,
      hasRawContent: !!parsed.rawContent,
      allKeys: Object.keys(parsed)
    });
    console.log('Using AI to structure output...');
    // Gebruik AI om de output te structureren
    try {
      result = await structureAnalysisOutput(content, prompt.includes('structuur') ? prompt : undefined, model);
      console.log('Successfully structured output with AI');
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

  // Voeg extractedFields en photoAnalysis toe aan result
  const allExtractedFields: { [incidentId: string]: { [key: string]: any } } = {};
  const allPhotoAnalysis: { [incidentId: string]: string } = {};
  
  photoAnalyses.forEach((analysis, idx) => {
    const incidentId = incidents[idx].incidentId;
    if (Object.keys(analysis.extractedFields).length > 0) {
      allExtractedFields[incidentId] = analysis.extractedFields;
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
    recommendationsCount: result.recommendations.length,
    toolboxTopicsCount: result.suggestedToolboxTopics.length,
    hasRiskAssessment: !!result.riskAssessment,
    preventiveMeasuresCount: result.preventiveMeasures.length,
    hasExtractedFields: !!result.extractedFields && Object.keys(result.extractedFields).length > 0,
    hasPhotoAnalysis: !!result.photoAnalysis && Object.keys(result.photoAnalysis).length > 0,
  });

  return result;
}

export async function generateToolboxContent(
  topic: string,
  description: string,
  context?: {
    incidentIds?: string[];
    recommendations?: string[];
  },
  model: string = 'gpt-4'
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

  const prompt = `Genereer een toolbox voor het onderwerp: "${topic}"

Beschrijving: ${description}

${context?.recommendations ? `Aanbevelingen: ${context.recommendations.join(', ')}` : ''}

Maak een praktische toolbox met items die nuttig zijn voor professionals die werken met dit onderwerp in de context van ondergrondse infrastructuur.

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
  model: string = 'gpt-4'
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
