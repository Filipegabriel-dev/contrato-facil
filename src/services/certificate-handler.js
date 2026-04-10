import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

/**
 * Generates a certificate by stamping the student's name on a provided PDF template.
 * @param {Blob|File} pdfFile - The template PDF file
 * @param {string} studentName - The name to stamp
 * @param {Object} options - { fontSize, verticalOffset, colorRgb, fontName }
 */
export async function generateCertificate(pdfFile, studentName, options = {}) {
  const {
    fontSize = 48,
    verticalOffset = 0,
    colorRgb = [0, 0, 0]
  } = options;

  // Read file as ArrayBuffer
  const arrayBuffer = await pdfFile.arrayBuffer();
  
  // Load the PDFDocument without updating metadata
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  // Embed the standard font
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Get the first page
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  
  // Measure text width to center it
  const textWidth = font.widthOfTextAtSize(studentName, fontSize);
  const textHeight = font.heightAtSize(fontSize);
  
  // Calculate X (centered horizontally)
  const x = (width / 2) - (textWidth / 2);
  
  // Calculate Y (centered vertically by default, plus user's offset)
  // pdf-lib's origin (0,0) is bottom-left
  const y = (height / 2) - (textHeight / 2) + parseInt(verticalOffset);
  
  // Draw the text
  firstPage.drawText(studentName, {
    x,
    y,
    size: parseInt(fontSize),
    font,
    color: rgb(colorRgb[0]/255, colorRgb[1]/255, colorRgb[2]/255),
  });
  
  // Serialize the PDFDocument to bytes
  const pdfBytes = await pdfDoc.save();
  
  // Trigger download
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  saveAs(blob, `Certificado_-_${studentName}.pdf`);
}
