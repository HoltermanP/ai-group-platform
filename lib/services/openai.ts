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

  // Format incident data
  const incidentsData = incidents.map((inc, idx) => `
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
`).join('\n');

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
    if (usesMaxCompletionTokens(model)) {
      completionOptions.max_completion_tokens = 4000;
    } else {
      completionOptions.max_tokens = 4000;
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
    const completion = await openai.chat.completions.create(completionOptions);
    console.log('OpenAI API call completed successfully');

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

    if (!content) {
      console.error('=== OPENAI RESPONSE ERROR ===');
      console.error('No content in response');
      console.error('Completion object:', JSON.stringify(completion, null, 2));
      throw new Error('Geen response van OpenAI - de API gaf geen content terug');
    }
  } catch (error) {
    console.error('=== ERROR CALLING OPENAI ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Als het een OpenAI API error is, geef meer details
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('OpenAI API error response:', (error as any).response);
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

  console.log('Analysis completed successfully:', {
    hasSummary: !!result.summary,
    recommendationsCount: result.recommendations.length,
    toolboxTopicsCount: result.suggestedToolboxTopics.length,
    hasRiskAssessment: !!result.riskAssessment,
    preventiveMeasuresCount: result.preventiveMeasures.length,
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
