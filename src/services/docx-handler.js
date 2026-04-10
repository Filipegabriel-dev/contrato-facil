import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';

/**
 * Read a .docx file and extract its text preview and placeholders
 * @param {File|Blob} file - The .docx file
 * @returns {Object} - { textPreview, htmlPreview, placeholders[] }
 */
export async function readDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  
  // Extract HTML preview using mammoth
  let htmlPreview = '';
  try {
    const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
    htmlPreview = mammothResult.value;
  } catch (e) {
    console.warn('Mammoth preview failed:', e);
  }

  // Extract text and detect placeholders using PizZip
  const zip = new PizZip(arrayBuffer);
  const placeholders = [];
  
  // Read the main document XML
  const docXml = zip.file('word/document.xml');
  if (docXml) {
    const xmlContent = docXml.asText();
    
    // Detect placeholders: {FIELD_NAME}
    // In docx XML, the text might be split across runs, so we need to handle both cases
    const textContent = extractTextFromXml(xmlContent);
    
    // Find all {PLACEHOLDER} patterns
    const placeholderRegex = /\{([a-zA-Z0-9_ áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ-]+)\}/g;
    let match;
    while ((match = placeholderRegex.exec(textContent)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }
  }

  // Also get plain text preview
  const textPreview = htmlPreview
    ? htmlPreview.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500)
    : '';

  return {
    textPreview,
    htmlPreview,
    placeholders
  };
}

/**
 * Extract text content from Word XML
 */
function extractTextFromXml(xmlContent) {
  // Extract text from <w:t> tags
  const textParts = [];
  const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let tMatch;
  while ((tMatch = tRegex.exec(xmlContent)) !== null) {
    textParts.push(tMatch[1]);
  }
  return textParts.join('');
}

/**
 * Robust file download utility to ensure correct filenames in Chrome
 */
export function downloadFile(blob, filename) {
  // 1. Sanitize filename (remove accents and symbols that break the download attribute)
  const name = filename
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');

  // 2. Use FileReader to create a Data URL
  // This is often more reliable for filenames in local environments than Blobs
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
    }, 1000);
  };
  
  // 3. Trigger reading
  reader.readAsDataURL(blob);

  // Still try saveAs in parallel as it's the official library method
  try {
    saveAs(blob, name);
  } catch (err) {
    console.warn('FileSaver failed, relied on DataURL fallback.');
  }
}

/**
 * Generate a new .docx by replacing placeholders in the template
 * @returns {Promise<Blob>} - The generated DOCX blob
 */
export async function generateDocx(fileData, data, outputName = 'contrato_gerado.docx') {
  const arrayBuffer = await fileData.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  
  let doc;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
      nullGetter: function(part) {
        if (!part.module) {
          return '{' + part.value + '}';
        }
        return '';
      }
    });
  } catch (error) {
    console.error('Error creating docxtemplater instance:', error);
    throw new Error('Erro ao processar o template do contrato.');
  }

  try {
    doc.render(data);
  } catch (error) {
    console.error('Error rendering document:', error);
    return await manualReplaceAndDownload(fileData, data, outputName);
  }

  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return out;
}

/**
 * Fallback: Manual XML replacement
 * @returns {Promise<Blob>}
 */
async function manualReplaceAndDownload(fileData, data, outputName) {
  const arrayBuffer = await fileData.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  
  const docXml = zip.file('word/document.xml');
  if (docXml) {
    let xmlContent = docXml.asText();
    xmlContent = fixSplitPlaceholders(xmlContent);
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{${key}}`;
      const escapedValue = escapeXml(value);
      xmlContent = xmlContent.split(placeholder).join(escapedValue);
    }
    zip.file('word/document.xml', xmlContent);
  }

  const headerFooterFiles = Object.keys(zip.files).filter(
    f => f.match(/word\/(header|footer)\d+\.xml/)
  );
  
  for (const filePath of headerFooterFiles) {
    let content = zip.file(filePath).asText();
    content = fixSplitPlaceholders(content);
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{${key}}`;
      content = content.split(placeholder).join(escapeXml(value));
    }
    zip.file(filePath, content);
  }

  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Generate a PDF from a DOCX blob
 * @param {Blob} docxBlob 
 * @param {string} filename 
 * @returns {Promise<Blob>}
 */
export async function generatePdf(docxBlob, filename) {
  // 1. Convert DOCX to HTML using Mammoth
  const arrayBuffer = await docxBlob.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  // 2. Use a temporary container for PDF generation
  const container = document.createElement('div');
  container.className = 'pdf-generation-container';
  container.innerHTML = `
    <div style="padding: 40px; font-family: 'Times New Roman', serif; line-height: 1.5; color: black; background: white;">
      ${html}
    </div>
  `;
  document.body.appendChild(container);

  try {
    // 3. Convert HTML to PDF using html2pdf
    const { default: html2pdf } = await import('html2pdf.js');
    
    const opt = {
      margin: [15, 15],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const pdfBlob = await html2pdf().from(container).set(opt).output('blob');
    return pdfBlob;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Fix placeholders that are split across multiple XML runs
 * e.g., <w:t>{CONTRATADO</w:t><w:t>_NOME}</w:t> → <w:t>{CONTRATADO_NOME}</w:t>
 */
function fixSplitPlaceholders(xml) {
  // Regex to find paragraph content and merge split placeholders
  // This handles the common case where Word splits text into multiple runs
  
  // Strategy: collect all text content in each paragraph, find placeholders,
  // then reconstruct
  
  // Simple approach: find sequences of w:t tags and merge if they form a placeholder
  let result = xml;
  
  // Pattern: find { in one w:t and } in a subsequent w:t within the same paragraph
  const paragraphRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  
  result = result.replace(paragraphRegex, (paragraph) => {
    // Get all text content
    const tTags = [];
    const tRegex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
    let m;
    let fullText = '';
    
    while ((m = tRegex.exec(paragraph)) !== null) {
      tTags.push({ fullMatch: m[0], attrs: m[1], text: m[2], index: m.index });
      fullText += m[2];
    }
    
    // Check if the combined text has placeholders
    if (!fullText.includes('{') || !fullText.includes('}')) return paragraph;
    
    // Find placeholder positions in the combined text
    const placeholderRegex = /\{[a-zA-Z0-9_ áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ-]+\}/g;
    let pm;
    const placeholdersFound = [];
    while ((pm = placeholderRegex.exec(fullText)) !== null) {
      placeholdersFound.push({ text: pm[0], start: pm.index, end: pm.index + pm[0].length });
    }
    
    if (placeholdersFound.length === 0) return paragraph;
    
    // Check if any placeholder spans multiple w:t tags
    let offset = 0;
    let needsFix = false;
    
    for (const tag of tTags) {
      const tagStart = offset;
      const tagEnd = offset + tag.text.length;
      
      for (const ph of placeholdersFound) {
        if (ph.start >= tagStart && ph.end <= tagEnd) {
          // Placeholder is within this single tag - OK
        } else if (
          (ph.start >= tagStart && ph.start < tagEnd && ph.end > tagEnd) ||
          (ph.start < tagStart && ph.end > tagStart && ph.end <= tagEnd)
        ) {
          needsFix = true;
          break;
        }
      }
      
      if (needsFix) break;
      offset += tag.text.length;
    }
    
    if (!needsFix) return paragraph;
    
    // Merge all text into the first w:t tag and empty the rest
    if (tTags.length > 0) {
      let modified = paragraph;
      // Set first w:t to contain all text
      modified = modified.replace(
        tTags[0].fullMatch,
        `<w:t xml:space="preserve">${fullText}</w:t>`
      );
      // Empty remaining w:t tags
      for (let i = 1; i < tTags.length; i++) {
        modified = modified.replace(tTags[i].fullMatch, '<w:t></w:t>');
      }
      return modified;
    }
    
    return paragraph;
  });
  
  return result;
}

/**
 * Escape special XML characters
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get HTML preview of a docx blob
 */
export async function getDocxPreview(fileData) {
  const arrayBuffer = await fileData.arrayBuffer();
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
  } catch (e) {
    console.error('Preview error:', e);
    return '<p style="color: #999;">Não foi possível gerar preview.</p>';
  }
}
