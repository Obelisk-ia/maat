/** Wraps one JPEG in a single-page PDF, stretched to fill the page. Page size is in points (1/72 in). */
export function jpegToPdf(jpeg: Uint8Array, image: { width: number; height: number }, page: { width: number; height: number }) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  function write(chunk: string | Uint8Array) {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  }
  function object(...body: (string | Uint8Array)[]) {
    offsets.push(length);
    write(`${offsets.length} 0 obj\n`);
    body.forEach(write);
    write("\nendobj\n");
  }

  const content = `q ${page.width} 0 0 ${page.height} 0 0 cm /Page Do Q`;
  write("%PDF-1.4\n");
  // PrintScaling None asks the print dialog to keep the real size.
  object("<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None >> >>");
  object("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /XObject << /Page 4 0 R >> >> /Contents 5 0 R >>`);
  object(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    jpeg, "\nendstream");
  object(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xref = length;
  write(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((offset) => write(`${String(offset).padStart(10, "0")} 00000 n \n`));
  write(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const pdf = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, position);
    position += chunk.length;
  }
  return pdf;
}
