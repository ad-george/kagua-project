import jsPDF from "jspdf";

export function generateSummaryPDF(extractedContext, comparison) {
  const doc = new jsPDF();
  const { crop, reported_problem } = extractedContext;
  const { observed, perspectives, uncertainty } = comparison;

  let y = 20;

  doc.setFontSize(18);
  doc.text("Kagua Summary", 14, y);
  y += 12;

  doc.setFontSize(11);
  doc.text(`Crop: ${crop}`, 14, y);
  y += 8;
  doc.text(`Reported problem: ${reported_problem}`, 14, y);
  y += 12;

  if (observed && observed.length > 0) {
    doc.setFontSize(13);
    doc.text("What was observed:", 14, y);
    y += 8;
    doc.setFontSize(11);
    observed.forEach((item) => {
      doc.text(`- ${item}`, 18, y);
      y += 7;
    });
    y += 5;
  }

  if (perspectives && perspectives.length > 0) {
    doc.setFontSize(13);
    doc.text("Advice received:", 14, y);
    y += 8;
    doc.setFontSize(11);
    perspectives.forEach((p) => {
      doc.text(`- ${p.source}: ${p.view}`, 18, y);
      y += 7;
    });
    y += 5;
  }

  if (uncertainty && uncertainty.length > 0) {
    doc.setFontSize(13);
    doc.text("Remaining Questions:", 14, y);
    y += 8;
    doc.setFontSize(11);
    uncertainty.forEach((item) => {
      doc.text(`- ${item}`, 18, y);
      y += 7;
    });
  }

  doc.save(`kagua-summary-${crop}.pdf`);
}

export function buildWhatsAppLink(extractedContext, comparison) {
  const { crop, reported_problem } = extractedContext;
  const { observed, perspectives, uncertainty } = comparison;

  let message = `*Kagua Summary*\n\nCrop: ${crop}\nReported problem: ${reported_problem}\n\n`;

  if (observed && observed.length > 0) {
    message += `*Observed:*\n${observed.map((i) => `- ${i}`).join("\n")}\n\n`;
  }
  if (perspectives && perspectives.length > 0) {
    message += `*Advice received:*\n${perspectives.map((p) => `- ${p.source}: ${p.view}`).join("\n")}\n\n`;
  }
  if (uncertainty && uncertainty.length > 0) {
    message += `*Still unclear:*\n${uncertainty.map((i) => `- ${i}`).join("\n")}`;
  }

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}