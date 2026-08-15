// Download client-side de um texto gerado na hora (CSV de leads, por ora).
// Blob + objectURL em vez de data: URI porque o CSV pode passar do limite de
// tamanho de URL em exportações grandes.
export function downloadText(
  filename: string,
  content: string,
  mimeType = "text/csv;charset=utf-8",
): void {
  if (typeof document === "undefined") return;

  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revogar no mesmo tick cancelaria o download em alguns browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
