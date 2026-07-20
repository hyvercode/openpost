import { jsPDF } from "jspdf";
import { ApiCollection, RequestItem } from "../types";

export interface PdfExportOptions {
  title?: string;
  includeIntro?: boolean;
  accentColor?: string;
  showPageNumbers?: boolean;
  includeMockResponse?: boolean;
}

export function generateCollectionPdf(
  collection: ApiCollection,
  selectedRequestIds: Set<string>,
  options: PdfExportOptions = {}
) {
  const {
    title = collection.name,
    includeIntro = true,
    accentColor = collection.color || "#4F46E5",
    showPageNumbers = true,
    includeMockResponse = true,
  } = options;

  // Create jsPDF instance
  // A4 size: 210mm x 297mm
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2; // 170mm
  
  let y = 25; // Cursor vertical coordinate

  // Colors
  const darkGray = "#1F2937"; // text primary
  const mediumGray = "#4B5563"; // text secondary
  const lightGray = "#F3F4F6"; // background box
  const borderSubtle = "#E5E7EB"; // border color

  // Helper: check page space and add new page if needed
  const checkSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 25) {
      doc.addPage();
      y = 25;
      return true;
    }
    return false;
  };

  // Helper: hex to RGB array
  const hexToRgb = (hex: string): [number, number, number] => {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16) || 79;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 70;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 229;
    return [r, g, b];
  };

  // Helper: Draw method badge
  const drawMethodBadge = (method: string, xPos: number, yPos: number) => {
    let badgeBg = "#E5E7EB";
    let badgeText = "#4B5563";

    const m = method.toUpperCase();
    if (m === "GET") {
      badgeBg = "#E0F2FE"; // sky-100
      badgeText = "#0369A1"; // sky-700
    } else if (m === "POST") {
      badgeBg = "#DCFCE7"; // green-100
      badgeText = "#15803D"; // green-700
    } else if (m === "PUT") {
      badgeBg = "#FEF3C7"; // amber-100
      badgeText = "#B45309"; // amber-700
    } else if (m === "DELETE") {
      badgeBg = "#FEE2E2"; // red-100
      badgeText = "#B91C1C"; // red-700
    } else if (m === "PATCH") {
      badgeBg = "#F3E8FF"; // purple-100
      badgeText = "#6B21A8"; // purple-700
    }

    const textWidth = doc.getTextWidth(m);
    const badgeW = textWidth + 4;
    const badgeH = 5.5;

    // Background
    const [bgR, bgG, bgB] = hexToRgb(badgeBg);
    doc.setFillColor(bgR, bgG, bgB);
    doc.roundedRect(xPos, yPos - 4, badgeW, badgeH, 1, 1, "F");

    // Text
    const [txR, txG, txB] = hexToRgb(badgeText);
    doc.setTextColor(txR, txG, txB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(m, xPos + 2, yPos - 0.2);

    return badgeW;
  };

  // Helper: Draw nice section title
  const drawSectionTitle = (text: string) => {
    checkSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const [r, g, b] = hexToRgb(accentColor);
    doc.setTextColor(r, g, b);
    doc.text(text, marginX, y);
    y += 4;
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, marginX + 15, y); // Small aesthetic underline
    y += 5;
  };

  // Helper: Draw table-like structure for Headers and Params
  const drawParamsTable = (items: Array<{ key: string; value: string }>) => {
    if (items.length === 0) return;
    
    checkSpace(15);
    
    // Table Header
    doc.setFillColor(249, 250, 251); // gray-50
    doc.roundedRect(marginX, y, contentWidth, 7, 1, 1, "F");
    
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setLineWidth(0.1);
    doc.line(marginX, y + 7, marginX + contentWidth, y + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99); // gray-600
    doc.text("Key", marginX + 4, y + 4.5);
    doc.text("Value", marginX + 60, y + 4.5);
    
    y += 7.2;

    items.forEach(item => {
      // Split value if too long
      const wrappedVal = doc.splitTextToSize(item.value, contentWidth - 65);
      const rowHeight = Math.max(wrappedVal.length * 4.5 + 2.5, 7);
      
      checkSpace(rowHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55); // dark gray
      doc.text(item.key, marginX + 4, y + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99); // medium gray
      doc.text(wrappedVal, marginX + 60, y + 4.5);

      // Border bottom
      doc.setDrawColor(243, 244, 246);
      doc.line(marginX, y + rowHeight, marginX + contentWidth, y + rowHeight);
      
      y += rowHeight;
    });
    y += 4; // Spacing after table
  };

  // Helper: Draw Code Box (JSON payload/mock)
  const drawCodeBox = (codeText: string, titleLabel: string) => {
    let formatted = codeText;
    try {
      formatted = JSON.stringify(JSON.parse(codeText), null, 2);
    } catch (_) {}

    const wrappedLines = doc.splitTextToSize(formatted, contentWidth - 10);
    const boxHeight = wrappedLines.length * 4.5 + 14;

    checkSpace(boxHeight);

    // Gray Shaded Card
    doc.setFillColor(249, 250, 251); // slate background
    doc.setDrawColor(229, 231, 235); // light border
    doc.setLineWidth(0.25);
    doc.roundedRect(marginX, y, contentWidth, boxHeight, 2, 2, "FD");

    // Code Box Header/Tab
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(marginX, y, contentWidth, 7, 2, 2, "F");
    doc.rect(marginX, y + 5, contentWidth, 2, "F"); // cover bottom corners
    doc.line(marginX, y + 7, marginX + contentWidth, y + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(titleLabel.toUpperCase(), marginX + 4, y + 4.5);

    // Code Text
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(55, 65, 81); // gray-700
    
    let textY = y + 11.5;
    wrappedLines.forEach((line: string) => {
      doc.text(line, marginX + 5, textY);
      textY += 4.2;
    });

    y += boxHeight + 5;
  };

  // --- BEGIN DOCUMENT DRAWING ---

  // Accent Line at the absolute top of the first page
  const [accentR, accentG, accentB] = hexToRgb(accentColor);
  doc.setFillColor(accentR, accentG, accentB);
  doc.rect(0, 0, pageWidth, 5, "F");

  // 1. Cover / Title Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39); // deep black/slate
  doc.text(title, marginX, y);
  y += 7;

  // API Reference Badge
  doc.setFillColor(accentR, accentG, accentB);
  doc.roundedRect(marginX, y, 26, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("API REFERENCE", marginX + 2.5, y + 3.5);

  // Metadata block (Date & Specs)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Generated: ${dateStr}`, marginX + 32, y + 3.5);
  y += 10;

  // Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(marginX, y, marginX + contentWidth, y);
  y += 8;

  // Collection introduction/description
  if (includeIntro && collection.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(75, 85, 99); // gray-600
    
    const introText = collection.description.replace(/[#>*\-`\[\]()]/g, "").trim();
    const wrappedIntro = doc.splitTextToSize(introText, contentWidth);
    
    wrappedIntro.forEach((line: string) => {
      checkSpace(5);
      doc.text(line, marginX, y);
      y += 4.5;
    });
    
    y += 8;
  }

  // Filter requests to those selected
  const requestsToInclude = collection.requests.filter((req) =>
    selectedRequestIds.has(req.id)
  );

  // Endpoint Index listing on page 1 (Aesthetic Directory)
  if (requestsToInclude.length > 0) {
    checkSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text("Endpoint Directory", marginX, y);
    y += 5;

    requestsToInclude.forEach((req, idx) => {
      checkSpace(7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`${idx + 1}.`, marginX, y);

      const badgeWidth = drawMethodBadge(req.method, marginX + 6, y);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(31, 41, 55);
      doc.text(req.name, marginX + 6 + badgeWidth + 4, y - 0.5);

      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const urlText = req.url || "/";
      const cutUrl = urlText.length > 55 ? urlText.slice(0, 52) + "..." : urlText;
      doc.text(cutUrl, marginX + 110, y - 0.5);
      
      y += 6.5;
    });

    y += 12; // Spacing after directory
  }

  // 2. Render each Request/Endpoint Details on new/current page
  requestsToInclude.forEach((req, index) => {
    // Start each major endpoint on a clean slate if there's less than 80mm left
    if (y > 100) {
      doc.addPage();
      y = 25;
    } else if (index > 0) {
      // Small spacing or page divider
      checkSpace(15);
      doc.setDrawColor(243, 244, 246);
      doc.setLineWidth(1);
      doc.line(marginX, y, marginX + contentWidth, y);
      y += 10;
    }

    // Endpoint Title Card
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.roundedRect(marginX, y, contentWidth, 12, 1.5, 1.5, "FD");

    // Badge
    const badgeW = drawMethodBadge(req.method, marginX + 4, y + 8);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(17, 24, 39);
    doc.text(req.name, marginX + 4 + badgeW + 3, y + 7.5);

    y += 18;

    // Subtitle Endpoint URL
    checkSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("ENDPOINT PATH", marginX, y);
    y += 4.5;

    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(245, 158, 11); // Amber accent for URL
    const wrappedUrl = doc.splitTextToSize(req.url || "/", contentWidth);
    wrappedUrl.forEach((line: string) => {
      checkSpace(5);
      doc.text(line, marginX, y);
      y += 4.5;
    });
    y += 4;

    // Draw Headers if present
    const enabledHeaders = req.headers.filter((h) => h.enabled && h.key);
    if (enabledHeaders.length > 0) {
      drawSectionTitle("Request Headers");
      drawParamsTable(enabledHeaders);
    }

    // Draw Query Parameters if present
    const enabledParams = req.params.filter((p) => p.enabled && p.key);
    if (enabledParams.length > 0) {
      drawSectionTitle("Query Parameters");
      drawParamsTable(enabledParams);
    }

    // Draw Request Body Payload if present
    if (req.body && req.body.type !== "none" && req.body.content) {
      drawSectionTitle(`Request Body (${req.body.type})`);
      drawCodeBox(req.body.content, "Payload");
    }

    // Draw Mock/Example Response if present
    if (includeMockResponse && req.mockResponse && req.mockResponse.body) {
      drawSectionTitle(`Example Response (${req.mockResponse.status || 200})`);
      drawCodeBox(req.mockResponse.body, "Response Body");
    }
  });

  // --- PASS 2: PAGE NUMBERS & HEADER FOOTERS ---
  if (showPageNumbers) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Top Header
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text(collection.name, marginX, 15);
      doc.text("OpenPost API Hub", pageWidth - marginX - doc.getTextWidth("OpenPost API Hub"), 15);
      
      doc.setDrawColor(243, 244, 246);
      doc.setLineWidth(0.2);
      doc.line(marginX, 17, pageWidth - marginX, 17);

      // Bottom Footer
      doc.line(marginX, pageHeight - 15, pageWidth - marginX, pageHeight - 15);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - marginX - doc.getTextWidth(`Page ${i} of ${totalPages}`),
        pageHeight - 11
      );
      doc.text("Confidential / Team Shareable Documentation", marginX, pageHeight - 11);
    }
  }

  // Save the PDF
  const filename = `${collection.name.replace(/\s+/g, "_").toLowerCase()}_docs.pdf`;
  doc.save(filename);
}
