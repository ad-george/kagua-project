import jsPDF from "jspdf";

export function generateSummaryPDF(extractedContext, comparison, summary) {
  const doc = new jsPDF();
  const { crop, reported_problem } = extractedContext;
  const { observed, perspectives, uncertainty } = comparison;

  let y = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;

  // Helper: wraps long text and advances y
  const addWrappedText = (text, fontSize, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += fontSize * 0.5;
    });
    y += 3;
  };

  // If the AI generated a full summary text, use it as the main body —
  // it's properly attributed, uncertainty-aware, and farmer-friendly.
  // summary_text already starts with its own "KAGUA SUMMARY" /
  // "MUHTASARI WA KAGUA" header (baked in by generate_summary.py), so we
  // must NOT add a second header here — only the fallback path below,
  // which has no header of its own, needs one added.
  if (summary?.summary_text) {
    const lines = summary.summary_text.split("\n").filter(Boolean);
    lines.forEach((line) => {
      const isSectionLabel = /^[A-Z][a-z ]+:/.test(line);
      const isHeader = line === "KAGUA SUMMARY" || line === "MUHTASARI WA KAGUA";
      addWrappedText(line, isHeader ? 18 : 11, isHeader || isSectionLabel);
      if (isHeader) y += 2;
    });
  } else {
    addWrappedText("KAGUA SUMMARY", 18, true);
    y += 2;

    // Fallback: build from raw fields
    addWrappedText(`Crop: ${crop}`, 11, true);
    addWrappedText(`Reported problem: ${reported_problem}`, 11);
    y += 4;

    if (observed && observed.length > 0) {
      addWrappedText("Field observations:", 12, true);
      observed.forEach((item) => addWrappedText(`• ${item}`, 11));
      y += 4;
    }

    if (perspectives && perspectives.length > 0) {
      addWrappedText("Advice received:", 12, true);
      perspectives.forEach((p) => addWrappedText(`• ${p.source}: ${p.view}`, 11));
      y += 4;
    }

    if (uncertainty && uncertainty.length > 0) {
      addWrappedText("What remains uncertain:", 12, true);
      uncertainty.forEach((item) => addWrappedText(`• ${item}`, 11));
    }
  }

  // Discussion points if present
  if (summary?.discussion_points && summary.discussion_points.length > 0) {
    y += 6;
    addWrappedText("Questions to bring up:", 12, true);
    summary.discussion_points.forEach((point) => addWrappedText(`• ${point}`, 11));
  }

  // Footer
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  doc.text("Prepared by Kagua", margin, y);

  doc.save(`kagua-summary-${crop}.pdf`);
}

export function buildWhatsAppLink(extractedContext, comparison, summary) {
  const { crop, reported_problem } = extractedContext;
  const { observed, perspectives, uncertainty } = comparison;

  let message = "";

  // Use AI-generated summary text if available — it's cleaner and
  // properly attributed, exactly what the farmer should share.
  // summary_text already opens with its own header, so don't prepend
  // another one here — only the fallback branch needs a manual header.
  if (summary?.summary_text) {
    message += summary.summary_text;
  } else {
    message += `*KAGUA SUMMARY*\n\n`;
    message += `Crop: ${crop}\nReported problem: ${reported_problem}\n\n`;

    if (observed && observed.length > 0) {
      message += `*Observed:*\n${observed.map((i) => `• ${i}`).join("\n")}\n\n`;
    }
    if (perspectives && perspectives.length > 0) {
      message += `*Advice received:*\n${perspectives.map((p) => `• ${p.source}: ${p.view}`).join("\n")}\n\n`;
    }
    if (uncertainty && uncertainty.length > 0) {
      message += `*Still unclear:*\n${uncertainty.map((i) => `• ${i}`).join("\n")}`;
    }
  }

  if (summary?.discussion_points && summary.discussion_points.length > 0) {
    message += `\n\n*Questions to bring up:*\n${summary.discussion_points.map((p) => `• ${p}`).join("\n")}`;
  }

  message += "\n\nPrepared by Kagua";

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}