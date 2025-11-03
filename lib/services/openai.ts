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
}

export async function analyzeSafetyIncidents(
  incidents: SafetyIncidentForAnalysis[]
): Promise<AIAnalysisResult> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. 
Analyseer de volgende veiligheidsmeldingen en geef advies.

Veiligheidsmeldingen:
${incidents.map((inc, idx) => `
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
`).join('\n')}

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

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
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
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Geen response van OpenAI');
  }

  // Haal JSON uit de response (kan tussen markdown code blocks zitten)
  let jsonContent = content.trim();
  
  // Verwijder markdown code blocks als die er zijn
  const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }

  // Probeer de JSON te parsen
  let result: AIAnalysisResult;
  try {
    result = JSON.parse(jsonContent) as AIAnalysisResult;
  } catch (error) {
    // Als parsing faalt, probeer de eerste { } block te vinden
    const firstBrace = jsonContent.indexOf('{');
    const lastBrace = jsonContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      result = JSON.parse(jsonContent) as AIAnalysisResult;
    } else {
      throw new Error(`Kon JSON niet parsen: ${jsonContent.substring(0, 200)}`);
    }
  }

  result.tokensUsed = completion.usage?.total_tokens;

  return result;
}

export async function generateToolboxContent(
  topic: string,
  description: string,
  context?: {
    incidentIds?: string[];
    recommendations?: string[];
  }
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
      "title": "Naam van het toolbox item",
      "description": "Uitleg wat dit item is en waarom het nuttig is",
      "category": "categorie (bijv. 'documentatie', 'checklist', 'procedures', 'tools', etc.)"
    }
  ]
}

BELANGRIJK:
- Gebruik ALLEEN de structuur met "items" als array
- Geef minstens 8 items terug
- Geef GEEN "toolbox" wrapper, "title", "description" of "recommendations" velden - alleen "items"
- Geef ALLEEN geldige JSON terug, zonder markdown code blocks
- Zorg dat alle strings correct ge-escaped zijn`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Je bent een expert die praktische toolboxes maakt voor professionals in de ondergrondse infrastructuur. Antwoord ALLEEN met geldige JSON, zonder markdown formatting of extra tekst.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Geen response van OpenAI');
  }

  // Haal JSON uit de response (kan tussen markdown code blocks zitten)
  let jsonContent = content.trim();
  
  // Verwijder markdown code blocks als die er zijn
  const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }
  
  // Als de JSON incomplete lijkt, probeer het laatste complete object te vinden
  // Telt de aantal { en } om te zien of het compleet is
  const openBraces = (jsonContent.match(/\{/g) || []).length;
  const closeBraces = (jsonContent.match(/\}/g) || []).length;
  
  // Als er meer { dan } zijn, is de JSON mogelijk incomplete
  if (openBraces > closeBraces) {
    // Zoek het laatste complete } en snij alles daarna af
    let braceCount = 0;
    let lastCompleteIndex = -1;
    for (let i = 0; i < jsonContent.length; i++) {
      if (jsonContent[i] === '{') braceCount++;
      if (jsonContent[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastCompleteIndex = i;
        }
      }
    }
    if (lastCompleteIndex > 0) {
      jsonContent = jsonContent.substring(0, lastCompleteIndex + 1);
    }
  }

  // Probeer de JSON te parsen
  try {
    const parsed = JSON.parse(jsonContent);
    // Check voor verschillende structuren
    if (parsed.items && Array.isArray(parsed.items)) {
      return parsed;
    } else if (parsed.toolbox && parsed.toolbox.items && Array.isArray(parsed.toolbox.items)) {
      // Als het een nested structuur is, extract items
      return { items: parsed.toolbox.items };
    } else if (parsed.toolbox && Array.isArray(parsed.toolbox)) {
      // Als toolbox zelf een array is
      return { items: parsed.toolbox };
    } else {
      // Probeer items direct te vinden
      throw new Error('JSON structuur is ongeldig: items array ontbreekt');
    }
  } catch (error) {
    // Als parsing faalt, probeer de eerste { } block te vinden
    const firstBrace = jsonContent.indexOf('{');
    const lastBrace = jsonContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(jsonContent);
        // Check voor verschillende structuren
        if (parsed.items && Array.isArray(parsed.items)) {
          return parsed;
        } else if (parsed.toolbox && parsed.toolbox.items && Array.isArray(parsed.toolbox.items)) {
          return { items: parsed.toolbox.items };
        } else if (parsed.toolbox && Array.isArray(parsed.toolbox)) {
          return { items: parsed.toolbox };
        } else {
          throw new Error('JSON structuur is ongeldig: items array ontbreekt na reparatie');
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('JSON content:', jsonContent.substring(0, 500));
        throw new Error(`Kon JSON niet parsen: ${jsonContent.substring(0, 200)}`);
      }
    } else {
      throw new Error(`Kon JSON niet parsen: ${jsonContent.substring(0, 200)}`);
    }
  }
}

