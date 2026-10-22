type ArchiveSummary = { title: string; model: string; variants?: string[]; timestamp?: string };

export function summarizePartArchive({ title, model, variants, timestamp }: ArchiveSummary): string {
  const snapshot = timestamp && /^\d{14}$/.test(timestamp)
    ? ` vom ${timestamp.slice(6, 8)}.${timestamp.slice(4, 6)}.${timestamp.slice(0, 4)}` : '';
  const options = [...new Set(variants?.filter((variant) => variant.trim() && variant !== title) ?? [])];
  return `${title} ist als historischer Shop-Eintrag${snapshot} dokumentiert.${options.length ? ` Erfasste Ausführungen: ${options.join(', ')}.` : ' Eine gesonderte Ausführung ist im Datensatz nicht benannt.'} Die Zuordnung „${model}“ ersetzt keine Bestätigung für ein konkretes Baujahr. Aktuelle Lieferbarkeit und Passform sind nicht belegt.`;
}
