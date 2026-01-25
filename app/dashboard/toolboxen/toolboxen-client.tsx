'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Download, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Toolbox {
  id: number;
  toolboxId: string;
  title: string;
  description: string | null;
  topic: string | null;
  category: string;
  gammaDeckId: string | null;
  gammaDeckUrl: string | null;
  incidentId: number | null;
  items: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface ToolboxenClientProps {
  initialToolboxes: Toolbox[];
}

export default function ToolboxenClient({ initialToolboxes }: ToolboxenClientProps) {
  const [toolboxes] = useState<Toolbox[]>(initialToolboxes);

  const handleOpenGamma = (url: string) => {
    window.open(url, '_blank');
  };

  const handleOpenToolbox = (toolbox: Toolbox) => {
    // Voor toolboxen zonder Gamma deck, toon de toolbox items in een modal of redirect naar een toolbox detail pagina
    // Voor nu tonen we een alert met de toolbox informatie
    const items = JSON.parse(toolbox.items || '[]');
    alert(`Toolbox: ${toolbox.title}\n\nItems:\n${items.map((item: any, index: number) => `${index + 1}. ${item.title || item}`).join('\n')}\n\nDeze toolbox heeft nog geen Gamma presentatie. Gebruik de toolbox vanuit een incident analyse om een volledige presentatie te genereren.`);
  };

  const handleDownload = async (toolbox: Toolbox) => {
    if (!toolbox.gammaDeckUrl) {
      alert('Geen Gamma deck URL beschikbaar');
      return;
    }
    // Gamma.app heeft een export functionaliteit, open in nieuw tabblad
    // Gebruikers kunnen dan zelf exporteren via Gamma interface
    // Voorlopig tonen we een bericht dat de export functie binnenkort komt
    alert('Export naar PowerPoint/PDF is momenteel nog in ontwikkeling. De toolbox is wel zichtbaar in Gamma.app.');
    window.open(toolbox.gammaDeckUrl, '_blank');
  };

  const handleDownloadToolbox = (toolbox: Toolbox) => {
    // Voor toolboxen zonder Gamma deck, download als JSON of toon items
    const items = JSON.parse(toolbox.items || '[]');
    const toolboxData = {
      title: toolbox.title,
      description: toolbox.description,
      topic: toolbox.topic,
      category: toolbox.category,
      items: items,
      createdAt: toolbox.createdAt,
    };

    const dataStr = JSON.stringify(toolboxData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `toolbox-${toolbox.toolboxId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-foreground">
              Toolboxen
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Overzicht van alle toolbox presentaties
            </p>
          </div>

          {toolboxes.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  Nog geen toolboxen beschikbaar. Maak een toolbox vanuit een incident analyse.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {toolboxes.map((toolbox) => (
                <Card key={toolbox.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{toolbox.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {toolbox.description || toolbox.topic || 'Geen beschrijving'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary">{toolbox.category}</Badge>
                      {toolbox.topic && (
                        <Badge variant="outline">{toolbox.topic}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex-1 space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(toolbox.createdAt).toLocaleDateString('nl-NL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      {toolbox.incidentId && (
                        <div className="text-sm text-muted-foreground">
                          <Link
                            href={`/dashboard/ai-safety/${toolbox.incidentId}`}
                            className="text-primary hover:underline"
                          >
                            Bekijk gerelateerd incident
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {toolbox.gammaDeckUrl ? (
                        <>
                          <Button
                            onClick={() => handleOpenGamma(toolbox.gammaDeckUrl!)}
                            className="flex-1"
                            variant="default"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Openen
                          </Button>
                          <Button
                            onClick={() => handleDownload(toolbox)}
                            variant="outline"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleOpenToolbox(toolbox)}
                            className="flex-1"
                            variant="default"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Openen
                          </Button>
                          <Button
                            onClick={() => handleDownloadToolbox(toolbox)}
                            variant="outline"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}