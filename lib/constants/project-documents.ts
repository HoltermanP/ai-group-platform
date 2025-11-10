export const PROJECT_DOCUMENT_TYPES = [
  { value: "intake-d2-formulier", label: "Intake/D2-formulier" },
  { value: "vo-kl", label: "VO K&L" },
  { value: "do-kl", label: "DO K&L" },
  { value: "bodem-tracetekening", label: "Bodem tracétekening" },
  { value: "integrale-tekening", label: "Integrale tekening" },
  { value: "bodemrapport", label: "Bodemrapport" },
  { value: "conditionerende-onderzoeken", label: "Conditionerende onderzoeken (vooronderzoek en eventuele vervolgonderzoeken)" },
  { value: "schouwrapport", label: "Schouwrapport" },
  { value: "plantekening", label: "Plantekening" },
  { value: "vergunning-aangevraagd", label: "Vergunning aangevraagd" },
  { value: "vergunningen-ontvangen", label: "Vergunningen ontvangen" },
  { value: "werktekeningen", label: "Werktekeningen" },
  { value: "voorcalculatie", label: "Voorcalculatie" },
  { value: "rie-vgm-plan-ontwerpfase", label: "RI&E/VGM-plan ontwerpfase" },
  { value: "rie-vgm-plan-uitvoeringsfase", label: "RI&E/VGM-plan uitvoeringsfase" },
  { value: "uitvoeringsmap-netbeheerder", label: "Uitvoeringsmap netbeheerder" },
  { value: "startwerkformulier", label: "Startwerkformulier" },
  { value: "revisie-documenten", label: "Revisie documenten" },
  { value: "uitvoeringsmap-aannemer", label: "Uitvoeringsmap aannemer" },
  { value: "betaalbaar-stellen-akkoord", label: "Betaalbaar stellen akkoord" },
  { value: "evaluatieverslag", label: "Evaluatieverslag" },
] as const;

export type ProjectDocumentType = typeof PROJECT_DOCUMENT_TYPES[number]["value"];

