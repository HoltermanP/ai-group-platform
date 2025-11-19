"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ExcelImportDialogProps {
  onImportComplete: () => void;
}

const AVAILABLE_FIELDS = {
  projectId: "Project ID",
  name: "Naam",
  description: "Beschrijving",
  status: "Status",
  plaats: "Plaats",
  gemeente: "Gemeente",
  projectManager: "Project Manager",
  category: "Categorie",
  discipline: "Discipline",
  startDate: "Startdatum",
  endDate: "Einddatum",
  plannedEndDate: "Geplande einddatum",
  budget: "Budget",
  organizationId: "Organisatie ID",
} as const;

export function ExcelImportDialog({ onImportComplete }: ExcelImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: number;
    details?: {
      inserted?: Array<{ id: number; projectId: string; name: string }>;
      skipped?: Array<{ projectId: string; reason: string }>;
      errors?: string[];
    };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Valideer bestandstype
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const validExtensions = [".xlsx", ".xls", ".csv"];

    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    const isValidType = validTypes.includes(selectedFile.type) || validExtensions.includes(fileExtension);

    if (!isValidType) {
      alert("Ongeldig bestandstype. Selecteer een Excel bestand (.xlsx, .xls) of CSV bestand.");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setImportResult(null);
    setMapping({});

    try {
      // Lees Excel bestand
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      if (data.length === 0) {
        alert("Het Excel bestand bevat geen data.");
        setIsProcessing(false);
        return;
      }

      // Eerste rij zijn headers
      const headers = (data[0] || []).map((h: unknown) => String(h || "").trim()).filter(Boolean);
      setExcelHeaders(headers);

      // Auto-map headers (probeer te matchen op naam)
      const autoMapping: Record<string, string> = {};
      headers.forEach((header) => {
        const headerLower = header.toLowerCase();
        for (const [field, label] of Object.entries(AVAILABLE_FIELDS)) {
          const labelLower = label.toLowerCase();
          if (
            headerLower === labelLower ||
            headerLower.includes(labelLower) ||
            labelLower.includes(headerLower)
          ) {
            autoMapping[field] = header;
            break;
          }
        }
      });

      // Zorg dat projectId en name altijd gemapt zijn (als ze bestaan)
      if (!autoMapping.projectId && headers.some((h) => h.toLowerCase().includes("project"))) {
        const projectIdHeader = headers.find((h) => h.toLowerCase().includes("project"));
        if (projectIdHeader) autoMapping.projectId = projectIdHeader;
      }
      if (!autoMapping.name && headers.some((h) => h.toLowerCase().includes("naam"))) {
        const nameHeader = headers.find((h) => h.toLowerCase().includes("naam"));
        if (nameHeader) autoMapping.name = nameHeader;
      }

      setMapping(autoMapping);
    } catch (error) {
      console.error("Error reading Excel file:", error);
      alert("Er is een fout opgetreden bij het lezen van het Excel bestand.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      alert("Selecteer eerst een Excel bestand.");
      return;
    }

    // Valideer dat projectId en name gemapt zijn
    if (!mapping.projectId || !mapping.name) {
      alert("Project ID en Naam zijn verplichte velden en moeten gemapt worden.");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));

      const response = await fetch("/api/projects/import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult({
          success: true,
          imported: result.imported || 0,
          skipped: result.skipped || 0,
          errors: result.errors || 0,
          details: result.details,
        });
        onImportComplete();
      } else {
        setImportResult({
          success: false,
          imported: 0,
          skipped: 0,
          errors: 1,
          details: { errors: [result.error || "Onbekende fout"] },
        });
      }
    } catch (error) {
      console.error("Error importing projects:", error);
      const errorMessage = error instanceof Error ? error.message : "Er is een fout opgetreden bij het importeren";
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: 1,
        details: { errors: [errorMessage] },
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExcelHeaders([]);
    setMapping({});
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isImporting) {
        setOpen(isOpen);
        if (!isOpen && importResult?.success) {
          handleReset();
        }
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importeer Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Projecten Importeren uit Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <Label htmlFor="excel-file">Excel Bestand</Label>
            <div className="mt-2 flex items-center gap-4">
              <Input
                id="excel-file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={isProcessing || isImporting}
                className="flex-1"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                </div>
              )}
            </div>
            {isProcessing && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Bestand wordt verwerkt...</span>
              </div>
            )}
          </div>

          {/* Column Mapping */}
          {excelHeaders.length > 0 && (
            <div>
              <Label>Kolom Mapping</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Koppel Excel kolommen aan project velden. Project ID en Naam zijn verplicht.
              </p>
              <div className="space-y-3 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                {Object.entries(AVAILABLE_FIELDS).map(([field, label]) => {
                  const isRequired = field === "projectId" || field === "name";
                  return (
                    <div key={field} className="flex items-center gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <Label htmlFor={`mapping-${field}`} className="text-sm">
                          {label}
                          {isRequired && <span className="text-destructive ml-1">*</span>}
                        </Label>
                      </div>
                      <Select
                        value={mapping[field] || undefined}
                        onValueChange={(value) => {
                          if (value === "__none__") {
                            const newMapping = { ...mapping };
                            delete newMapping[field];
                            setMapping(newMapping);
                          } else {
                            setMapping({ ...mapping, [field]: value });
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecteer kolom..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Geen</SelectItem>
                          {excelHeaders.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div
              className={`p-4 rounded-lg border ${
                importResult.success
                  ? "bg-chart-1/10 border-chart-1/20"
                  : "bg-destructive/10 border-destructive/20"
              }`}
            >
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-chart-1 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">
                    {importResult.success ? "Import Voltooid" : "Import Mislukt"}
                  </h4>
                  {importResult.success ? (
                    <div className="space-y-1 text-sm">
                      <p>✓ {importResult.imported} project(en) geïmporteerd</p>
                      {importResult.skipped > 0 && (
                        <p className="text-muted-foreground">
                          ⚠ {importResult.skipped} project(en) overgeslagen (duplicaten)
                        </p>
                      )}
                      {importResult.errors > 0 && (
                        <p className="text-destructive">
                          ✗ {importResult.errors} fout(en) opgetreden
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm">
                      {importResult.details?.errors && (
                        <ul className="list-disc list-inside space-y-1">
                          {importResult.details.errors.map((error: string, idx: number) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleReset} disabled={isImporting}>
              Reset
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || excelHeaders.length === 0 || !mapping.projectId || !mapping.name || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importeren...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importeren
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

