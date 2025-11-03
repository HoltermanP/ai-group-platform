import PptxGenJS from 'pptxgenjs';
import { generateToolboxContent, openai } from './openai';
import { searchImage, downloadImageAsBase64, getIncidentPhotos } from './images';
import { existsSync } from 'fs';

export interface ToolboxPresentationOptions {
  topic: string;
  description: string;
  incidentId?: string;
  incidentTitle?: string;
  recommendations?: string[];
  suggestedItems?: string[];
  incident?: {
    title: string;
    description: string;
    category: string;
    severity: string;
    discipline: string | null;
    location: string | null;
    impact: string | null;
    mitigation: string | null;
    safetyMeasures: string | null;
    riskAssessment: string | null;
    photos: string | null;
  };
  aiAnalysis?: {
    summary: string;
    recommendations: string[];
    riskAssessment: string | null;
    preventiveMeasures: string[];
  };
}

/**
 * Haal web kennis op met AI over het onderwerp
 */
async function getWebKnowledge(topic: string, incidentInfo?: string): Promise<string> {
  if (!openai) return '';
  
  try {
    const prompt = `Je bent een expert op het gebied van veiligheid in ondergrondse infrastructuur. 
Geef een korte samenvatting (max 200 woorden) van actuele kennis, best practices en belangrijke informatie over: "${topic}"

${incidentInfo ? `Context van incident: ${incidentInfo}` : ''}

Gebruik je kennis over:
- Actuele veiligheidsrichtlijnen
- Best practices in de industrie
- Veelvoorkomende risico's en preventiemethoden
- Relevante normen en voorschriften

Geef een beknopte, praktische samenvatting terug.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Je bent een veiligheidsexpert die praktische, actuele informatie geeft over ondergrondse infrastructuur veiligheid.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error getting web knowledge:', error);
    return '';
  }
}

/**
 * Genereer verbeterde toolbox content met alle beschikbare informatie
 */
async function generateEnhancedToolboxContent(
  topic: string,
  description: string,
  options: ToolboxPresentationOptions
): Promise<{
  items: Array<{
    title: string;
    description: string;
    category: string;
    imageQuery?: string;
  }>;
  webKnowledge: string;
}> {
  // Bouw context string met alle beschikbare informatie
  let contextInfo = '';
  
  if (options.incident) {
    contextInfo += `\n\nINCIDENT INFORMATIE:
- Titel: ${options.incident.title}
- Categorie: ${options.incident.category}
- Ernst: ${options.incident.severity}
- Discipline: ${options.incident.discipline || 'Niet gespecificeerd'}
- Locatie: ${options.incident.location || 'Niet gespecificeerd'}
- Beschrijving: ${options.incident.description}
${options.incident.impact ? `- Impact: ${options.incident.impact}` : ''}
${options.incident.mitigation ? `- Genomen maatregelen: ${options.incident.mitigation}` : ''}
${options.incident.safetyMeasures ? `- Veiligheidsmaatregelen: ${options.incident.safetyMeasures}` : ''}
${options.incident.riskAssessment ? `- Risico inschatting: ${options.incident.riskAssessment}` : ''}`;
  }

  if (options.aiAnalysis) {
    contextInfo += `\n\nAI ANALYSE:
- Samenvatting: ${options.aiAnalysis.summary}
${options.aiAnalysis.riskAssessment ? `- Uitgebreide risico analyse: ${options.aiAnalysis.riskAssessment}` : ''}
- Aanbevelingen: ${options.aiAnalysis.recommendations.join(', ')}
- Voorkomende maatregelen: ${options.aiAnalysis.preventiveMeasures.join(', ')}`;
  }

  // Haal web kennis op
  const webKnowledge = await getWebKnowledge(topic, contextInfo);

  // Genereer toolbox content met alle context
  const toolboxContent = await generateToolboxContent(
    topic,
    description + contextInfo,
    {
      recommendations: options.recommendations || options.aiAnalysis?.recommendations,
    }
  );

  // Voeg image queries toe aan items
  const itemsWithImages = toolboxContent.items.map(item => ({
    ...item,
    imageQuery: `${item.title} ${item.category} ondergrondse infrastructuur veiligheid`,
  }));

  return {
    items: itemsWithImages,
    webKnowledge,
  };
}

export async function generateToolboxPresentation(
  options: ToolboxPresentationOptions
): Promise<Buffer> {
  // Genereer verbeterde toolbox content
  const { items: toolboxItems, webKnowledge } = await generateEnhancedToolboxContent(
    options.topic,
    options.description,
    options
  );

  // Valideer items
  if (!toolboxItems || !Array.isArray(toolboxItems) || toolboxItems.length === 0) {
    throw new Error('Geen geldige toolbox items ontvangen van AI. Probeer het opnieuw.');
  }

  // Haal incident foto's op
  const incidentPhotos = options.incident?.photos 
    ? getIncidentPhotos(options.incident.photos) 
    : [];

  // Maak nieuwe presentatie met betere styling
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 aspect ratio
  pptx.defineLayout({ name: 'CUSTOM', width: 10, height: 5.625 });

  // === SLIDE 1: TITEL SLIDE ===
  const titleSlide = pptx.addSlide();
  
  // Gradient background (simulated with colored shapes)
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 5.625,
    fill: { color: '1F2937' },
  });

  // Main title
  titleSlide.addText('TOOLBOX MEETING', {
    x: 0.5,
    y: 1.8,
    w: 9,
    h: 0.8,
    fontSize: 56,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Arial',
  });

  // Topic
  titleSlide.addText(options.topic, {
    x: 0.5,
    y: 2.8,
    w: 9,
    h: 0.7,
    fontSize: 40,
    color: 'F3F4F6',
    align: 'center',
    fontFace: 'Arial',
  });

  // Subtitle met incident info
  if (options.incidentTitle) {
    titleSlide.addText(`Gebaseerd op: ${options.incidentTitle}`, {
      x: 0.5,
      y: 4,
      w: 9,
      h: 0.4,
      fontSize: 20,
      color: 'D1D5DB',
      align: 'center',
      fontFace: 'Arial',
    });
  }

  if (options.incident?.category) {
    titleSlide.addText(`${options.incident.category} • ${options.incident.severity}`, {
      x: 0.5,
      y: 4.5,
      w: 9,
      h: 0.3,
      fontSize: 16,
      color: '9CA3AF',
      align: 'center',
      fontFace: 'Arial',
    });
  }

  // === SLIDE 2: INCIDENT OVERZICHT ===
  if (options.incident) {
    const overviewSlide = pptx.addSlide();
    
    // Header met gradient background
    overviewSlide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.8,
      fill: { color: '3B82F6' },
    });

    overviewSlide.addText('INCIDENT OVERZICHT', {
      x: 0.5,
      y: 0.15,
      w: 9,
      h: 0.5,
      fontSize: 32,
      bold: true,
      color: 'FFFFFF',
      align: 'left',
      fontFace: 'Arial',
    });

    // Incident details in grid layout
    let yPos = 1.2;
    const details = [
      { label: 'Titel', value: options.incident.title },
      { label: 'Categorie', value: options.incident.category },
      { label: 'Ernst', value: options.incident.severity },
      { label: 'Discipline', value: options.incident.discipline || 'Niet gespecificeerd' },
      { label: 'Locatie', value: options.incident.location || 'Niet gespecificeerd' },
    ];

    details.forEach(detail => {
      if (yPos < 4.5) {
        overviewSlide.addText(`${detail.label}:`, {
          x: 0.5,
          y: yPos,
          w: 2.5,
          h: 0.3,
          fontSize: 18,
          bold: true,
          color: '1F2937',
          fontFace: 'Arial',
        });
        overviewSlide.addText(detail.value, {
          x: 3,
          y: yPos,
          w: 6.5,
          h: 0.3,
          fontSize: 18,
          color: '374151',
          fontFace: 'Arial',
        });
        yPos += 0.5;
      }
    });

    // Beschrijving box
    if (options.incident.description) {
      overviewSlide.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: 4,
        w: 9,
        h: 1.3,
        fill: { color: 'F3F4F6' },
        line: { color: 'E5E7EB', width: 1 },
      });
      overviewSlide.addText(options.incident.description.substring(0, 300), {
        x: 0.7,
        y: 4.1,
        w: 8.6,
        h: 1.1,
        fontSize: 14,
        color: '374151',
        align: 'left',
        fontFace: 'Arial',
        valign: 'top',
      });
    }

    // Foto toevoegen als beschikbaar
    if (incidentPhotos.length > 0 && incidentPhotos[0]) {
      try {
        const photoPath = `${process.cwd()}/public${incidentPhotos[0]}`;
        if (existsSync(photoPath)) {
          overviewSlide.addImage({
            path: photoPath,
            x: 6.5,
            y: 1.2,
            w: 3,
            h: 2,
          });
        }
      } catch (error) {
        console.error('Error adding incident photo:', error);
      }
    }
  }

  // === SLIDE 3: AI ANALYSE SAMENVATTING ===
  if (options.aiAnalysis) {
    const analysisSlide = pptx.addSlide();
    
    // Header
    analysisSlide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.8,
      fill: { color: '10B981' },
    });

    analysisSlide.addText('AI ANALYSE', {
      x: 0.5,
      y: 0.15,
      w: 9,
      h: 0.5,
      fontSize: 32,
      bold: true,
      color: 'FFFFFF',
      align: 'left',
      fontFace: 'Arial',
    });

    // Samenvatting
    analysisSlide.addText('Samenvatting', {
      x: 0.5,
      y: 1,
      w: 9,
      h: 0.4,
      fontSize: 24,
      bold: true,
      color: '1F2937',
      fontFace: 'Arial',
    });

    analysisSlide.addText(options.aiAnalysis.summary.substring(0, 400), {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 1.5,
      fontSize: 16,
      color: '374151',
      align: 'left',
      fontFace: 'Arial',
      valign: 'top',
    });

    // Risico inschatting als beschikbaar
    if (options.aiAnalysis.riskAssessment) {
      analysisSlide.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: 3.2,
        w: 9,
        h: 1.5,
        fill: { color: 'FEF3C7' },
        line: { color: 'F59E0B', width: 2 },
      });

      analysisSlide.addText('Risico Inschatting', {
        x: 0.7,
        y: 3.3,
        w: 8.6,
        h: 0.3,
        fontSize: 20,
        bold: true,
        color: '92400E',
        fontFace: 'Arial',
      });

      analysisSlide.addText(options.aiAnalysis.riskAssessment.substring(0, 300), {
        x: 0.7,
        y: 3.6,
        w: 8.6,
        h: 1,
        fontSize: 14,
        color: '78350F',
        align: 'left',
        fontFace: 'Arial',
        valign: 'top',
      });
    }
  }

  // === SLIDE 4: ACTUELE KENNIS & BEST PRACTICES ===
  if (webKnowledge) {
    const knowledgeSlide = pptx.addSlide();
    
    knowledgeSlide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.8,
      fill: { color: '8B5CF6' },
    });

    knowledgeSlide.addText('ACTUELE KENNIS & BEST PRACTICES', {
      x: 0.5,
      y: 0.15,
      w: 9,
      h: 0.5,
      fontSize: 32,
      bold: true,
      color: 'FFFFFF',
      align: 'left',
      fontFace: 'Arial',
    });

    knowledgeSlide.addText(webKnowledge, {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 3.8,
      fontSize: 18,
      color: '374151',
      align: 'left',
      fontFace: 'Arial',
      valign: 'top',
      bullet: { type: 'number' },
    });
  }

  // === SLIDES VOOR ELK TOOLBOX ITEM ===
  for (let index = 0; index < toolboxItems.length; index++) {
    const item = toolboxItems[index];
    const slide = pptx.addSlide();
    
    // Gradient header
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.8,
      fill: { color: index % 2 === 0 ? '3B82F6' : '10B981' },
    });

    // Slide nummer
    slide.addText(`${index + 1} / ${toolboxItems.length}`, {
      x: 8.5,
      y: 0.15,
      w: 1.3,
      h: 0.5,
      fontSize: 18,
      color: 'FFFFFF',
      align: 'right',
      fontFace: 'Arial',
    });

    // Item titel
    slide.addText(item.title || 'Toolbox Item', {
      x: 0.5,
      y: 0.15,
      w: 8,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: 'FFFFFF',
      align: 'left',
      fontFace: 'Arial',
    });

    // Categorie badge
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: 1,
      w: 2.5,
      h: 0.5,
      fill: { color: '6366F1' },
    });

    slide.addText(item.category || 'Algemeen', {
      x: 0.5,
      y: 1,
      w: 2.5,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
      valign: 'middle',
    });

    // Content area met twee kolommen (text + image)
    // Tekst kolom
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 1.7,
      w: 5.5,
      h: 3.2,
      fill: { color: 'FFFFFF' },
      line: { color: 'E5E7EB', width: 1 },
    });

    slide.addText(item.description || 'Geen beschrijving beschikbaar', {
      x: 0.7,
      y: 1.9,
      w: 5.1,
      h: 2.8,
      fontSize: 16,
      color: '374151',
      align: 'left',
      fontFace: 'Arial',
      valign: 'top',
    });

    // Image kolom - probeer afbeelding toe te voegen
    const imageArea = {
      x: 6.2,
      y: 1.7,
      w: 3.3,
      h: 3.2,
    };

    let imageAdded = false;

    // Probeer eerst incident foto's te gebruiken
    if (incidentPhotos.length > index && incidentPhotos[index]) {
      try {
        const photoPath = `${process.cwd()}/public${incidentPhotos[index]}`;
        if (existsSync(photoPath)) {
          slide.addImage({
            path: photoPath,
            ...imageArea,
          });
          imageAdded = true;
        }
      } catch (error) {
        console.error('Error adding photo:', error);
      }
    }

    // Anders probeer externe afbeelding te downloaden
    if (!imageAdded && item.imageQuery) {
      try {
        const imageUrl = await searchImage(item.imageQuery);
        if (imageUrl) {
          const base64Image = await downloadImageAsBase64(imageUrl);
          if (base64Image) {
            slide.addImage({
              data: base64Image,
              ...imageArea,
            });
            imageAdded = true;
          }
        }
      } catch (error) {
        console.error('Error adding external image:', error);
      }
    }

    // Fallback: placeholder shape als geen image beschikbaar
    if (!imageAdded) {
      slide.addShape(pptx.ShapeType.rect, {
        ...imageArea,
        fill: { color: 'F3F4F6' },
        line: { color: 'D1D5DB', width: 2 },
      });

      slide.addText('Afbeelding', {
        x: imageArea.x,
        y: imageArea.y + imageArea.h / 2 - 0.2,
        w: imageArea.w,
        h: 0.4,
        fontSize: 14,
        color: '9CA3AF',
        align: 'center',
        fontFace: 'Arial',
        valign: 'middle',
      });
    }
  }

  // === LAATSTE SLIDE: AANBEVELINGEN ===
  const recommendations = options.recommendations || options.aiAnalysis?.recommendations || [];
  const preventiveMeasures = options.aiAnalysis?.preventiveMeasures || [];

  if (recommendations.length > 0 || preventiveMeasures.length > 0) {
    const recSlide = pptx.addSlide();
    
    recSlide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.8,
      fill: { color: 'EF4444' },
    });

    recSlide.addText('AANBEVELINGEN & ACTIEPUNTEN', {
      x: 0.5,
      y: 0.15,
      w: 9,
      h: 0.5,
      fontSize: 32,
      bold: true,
      color: 'FFFFFF',
      align: 'left',
      fontFace: 'Arial',
    });

    let yPos = 1.2;
    
    if (recommendations.length > 0) {
      recSlide.addText('Aanbevelingen:', {
        x: 0.5,
        y: yPos,
        w: 9,
        h: 0.4,
        fontSize: 22,
        bold: true,
        color: '1F2937',
        fontFace: 'Arial',
      });
      yPos += 0.5;

      recommendations.slice(0, 6).forEach((rec, index) => {
        if (yPos < 5.5) {
          recSlide.addShape(pptx.ShapeType.roundRect, {
            x: 0.5,
            y: yPos - 0.1,
            w: 9,
            h: 0.5,
            fill: { color: 'FEF2F2' },
            line: { color: 'EF4444', width: 1 },
          });

          recSlide.addText(`${index + 1}. ${rec}`, {
            x: 0.7,
            y: yPos,
            w: 8.6,
            h: 0.3,
            fontSize: 16,
            color: '991B1B',
            align: 'left',
            fontFace: 'Arial',
            valign: 'middle',
          });
          yPos += 0.6;
        }
      });
    }

    if (preventiveMeasures.length > 0 && yPos < 5) {
      yPos += 0.2;
      recSlide.addText('Voorkomende Maatregelen:', {
        x: 0.5,
        y: yPos,
        w: 9,
        h: 0.4,
        fontSize: 22,
        bold: true,
        color: '1F2937',
        fontFace: 'Arial',
      });
      yPos += 0.5;

      preventiveMeasures.slice(0, 4).forEach((measure, index) => {
        if (yPos < 5.5) {
          recSlide.addShape(pptx.ShapeType.roundRect, {
            x: 0.5,
            y: yPos - 0.1,
            w: 9,
            h: 0.4,
            fill: { color: 'F0FDF4' },
            line: { color: '10B981', width: 1 },
          });

          recSlide.addText(`✓ ${measure}`, {
            x: 0.7,
            y: yPos,
            w: 8.6,
            h: 0.2,
            fontSize: 14,
            color: '065F46',
            align: 'left',
            fontFace: 'Arial',
            valign: 'middle',
          });
          yPos += 0.5;
        }
      });
    }
  }

  // Genereer buffer
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer as Buffer;
}
