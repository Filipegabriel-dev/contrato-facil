// Script to generate a sample contract template .docx for testing
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

// Create a minimal valid .docx from scratch
// A .docx is a zip file with specific XML structure

const zip = new PizZip();

// [Content_Types].xml
zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

// _rels/.rels
zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

// word/_rels/document.xml.rels
zip.folder('word').folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

// word/document.xml - The actual contract content with placeholders
const contractText = `AVISO: ESTE É APENAS UM MODELO DE EXEMPLO. NÃO TEM VALIDADE JURÍDICA.

CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: Academia Power Fitness Ltda, inscrita no CNPJ sob o nº 12.345.678/0001-90, com sede na Rua Principal, 500 - Centro, São Paulo/SP, CEP 01000-000, neste ato representada por seu administrador, Sr. Carlos Eduardo Mendes.

CONTRATADO(A): {CONTRATADO_NOME}, portador(a) do CPF nº {CONTRATADO_CPF}, RG nº {CONTRATADO_RG}, residente e domiciliado(a) em {CONTRATADO_ENDERECO}, {CONTRATADO_CIDADE}/{CONTRATADO_ESTADO}, CEP {CONTRATADO_CEP}.

CLÁUSULA PRIMEIRA - DO OBJETO

O presente contrato tem por objeto a prestação de serviços de acesso às instalações e equipamentos da academia CONTRATANTE, conforme o plano escolhido.

CLÁUSULA SEGUNDA - DO PLANO

O(A) CONTRATADO(A) opta pelo plano: {PLANO}

CLÁUSULA TERCEIRA - DO VALOR

O valor total do presente contrato é de {VALOR} ({VALOR_EXTENSO}), a ser pago conforme as condições estabelecidas para o plano escolhido.

CLÁUSULA QUARTA - DA VIGÊNCIA

O presente contrato terá início em {DATA_INICIO} e término em {DATA_FIM}, com duração de {DURACAO}.

CLÁUSULA QUINTA - DAS OBRIGAÇÕES DO CONTRATADO

O(A) CONTRATADO(A) se compromete a:
a) Respeitar as normas internas da academia;
b) Utilizar os equipamentos de forma adequada;
c) Manter em dia os pagamentos devidos;
d) Apresentar atestado médico quando solicitado.

CLÁUSULA SEXTA - DO FORO

Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer questões oriundas deste contrato.

São Paulo, {DATA_INICIO}.

_________________________________
CONTRATANTE: Academia Power Fitness Ltda

_________________________________
CONTRATADO(A): {CONTRATADO_NOME}`;

// Build the document XML with proper paragraphs
const paragraphs = contractText.split('\n').map(line => {
  const escapedLine = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  
  // Make title bold
  const isBold = line.startsWith('CONTRATO DE') || line.startsWith('CLÁUSULA');
  
  const runProps = isBold ? '<w:rPr><w:b/><w:bCs/></w:rPr>' : '';
  
  return `<w:p>
    <w:r>${runProps}<w:t xml:space="preserve">${escapedLine}</w:t></w:r>
  </w:p>`;
}).join('\n');

zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${paragraphs}
  </w:body>
</w:document>`);

// Generate the .docx file
const output = zip.generate({ type: 'nodebuffer' });
const outputPath = path.join(__dirname, 'public', 'template_exemplo.docx');

// ensure public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

fs.writeFileSync(outputPath, output);
console.log('Template created:', outputPath);
console.log('File size:', output.length, 'bytes');
