/**
 * Text Parser - Interpreta texto livre e extrai campos de contrato
 * 
 * Exemplo de input:
 * "O contratado será João da Silva, CPF 123.456.789-00, RG 12.345.678-9,
 *  residente na Rua das Flores 123, São Paulo/SP, CEP 01234-567.
 *  Valor de R$ 2.500,00, plano Anual, início em 01/05/2026."
 */

const PLAN_OPTIONS = ['anual', 'semestral', 'dupla', 'grupo'];

const PATTERNS = {
  CONTRATADO_NOME: {
    patterns: [
      /contratad[oa]\s+(?:será|sera|é|e|:|,)?\s*(.+?)(?:,|\.|;|\s+CPF|\s+RG|\s+residente|\s+morador|\s+portador|\s+nascid|\s+brasileiro|\s+com\s+CPF)/i,
      /nome\s*(?:do\s+contratad[oa])?\s*(?::|é|sera|será)?\s*(.+?)(?:,|\.|;|\s+CPF)/i,
      /contratad[oa]\s*:\s*(.+?)(?:,|\.|;|\n)/i,
    ],
    label: 'Nome do Contratado'
  },
  CONTRATADO_CPF: {
    patterns: [
      /CPF\s*(?:n[°ºo.]?\s*)?(?::|é)?\s*(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\s]?\d{2})/i,
    ],
    label: 'CPF'
  },
  CONTRATADO_RG: {
    patterns: [
      /RG\s*(?:n[°ºo.]?\s*)?(?::|é)?\s*([\d\.\-\/]+[A-Za-z]?)/i,
    ],
    label: 'RG'
  },
  CONTRATADO_ENDERECO: {
    patterns: [
      /(?:residente|morador[a]?|endere[çc]o|resid[eê]ncia)\s*(?:na|no|em|:)?\s*(.+?)(?:,\s*(?:CEP|cidade|bairro|\d{5}[\-\s]?\d{3})|\.\s|;\s|\n)/i,
      /endere[çc]o\s*:\s*(.+?)(?:,\s*(?:CEP|\d{5})|\.|;|\n)/i,
      /(?:rua|avenida|av\.|travessa|alameda|pra[çc]a)\s+(.+?)(?:,\s*(?:CEP|\d{5})|\.\s|;\s|\n)/i,
    ],
    label: 'Endereço'
  },
  CONTRATADO_CIDADE: {
    patterns: [
      /cidade\s*(?:de|:)?\s*(.+?)(?:\/|\s*[\-,;.]|\s+CEP|\n)/i,
      /(?:em|,)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-Zd][a-zà-ú]+)*)\s*\/\s*[A-Z]{2}/i,
    ],
    label: 'Cidade'
  },
  CONTRATADO_ESTADO: {
    patterns: [
      /\/\s*([A-Z]{2})(?:\s|,|\.|;|\n|$)/,
      /estado\s*(?:de|do|:)?\s*([A-Z]{2}|[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-Zd][a-zà-ú]+)*)(?:\s|,|\.|;|\n|$)/i,
    ],
    label: 'Estado'
  },
  CONTRATADO_CEP: {
    patterns: [
      /CEP\s*(?::)?\s*(\d{5}[\-\s]?\d{3})/i,
      /(\d{5}[\-]\d{3})/,
    ],
    label: 'CEP'
  },
  CONTRATADO_EMAIL: {
    patterns: [
      /e[\-]?mail\s*(?::)?\s*([\w\.\-]+@[\w\.\-]+\.\w+)/i,
      /([\w\.\-]+@[\w\.\-]+\.\w+)/i,
    ],
    label: 'E-mail'
  },
  CONTRATADO_TELEFONE: {
    patterns: [
      /(?:telefone|tel|celular|fone|whatsapp|whats)\s*(?::)?\s*\(?\s*(\(?\d{2}\)?\s*\d{4,5}[\-\s]?\d{4})/i,
    ],
    label: 'Telefone'
  },
  CONTRATADO_NACIONALIDADE: {
    patterns: [
      /nacional(?:idade)?\s*(?::)?\s*(\w+)/i,
      /(brasileir[oa]|estrangeir[oa]|portugu[eê]s[a]?)/i,
    ],
    label: 'Nacionalidade'
  },
  CONTRATADO_ESTADO_CIVIL: {
    patterns: [
      /estado\s+civil\s*(?::)?\s*(\w+)/i,
      /(solteir[oa]|casad[oa]|divorciad[oa]|vi[uú]v[oa]|uni[aã]o\s*est[aá]vel)/i,
    ],
    label: 'Estado Civil'
  },
  CONTRATADO_PROFISSAO: {
    patterns: [
      /profiss[aã]o\s*(?::)?\s*(.+?)(?:,|\.|;|\n)/i,
    ],
    label: 'Profissão'
  },
  VALOR: {
    patterns: [
      /R\$\s*([\d\.\s]+(?:,\s*\d+)?)/i, 
      /valor\s*(?:de|do\s+contrato|mensal|total)?\s*(?::)?\s*R?\$?\s*([\d\.\s]+(?:,\s*\d+)?)/i,
    ],
    label: 'Valor',
    transform: (v) => {
      // Ensure R$ prefix and clean excess spaces
      const clean = v.trim().replace(/\s{2,}/g, ' ');
      if (!clean.toUpperCase().startsWith('R$')) return 'R$ ' + clean;
      return clean;
    }
  },
  VALOR_EXTENSO: {
    patterns: [
      /(?:valor\s+)?(?:por\s+)?extenso\s*(?::)?\s*(.+?)(?:\.|;|\n|$)/i,
    ],
    label: 'Valor por Extenso'
  },
  PLANO: {
    patterns: [
      /plano\s*(?::)?\s*(\w+)/i,
      new RegExp(`(?:plano|modalidade|tipo)\\s*(?::|é)?\\s*(${PLAN_OPTIONS.join('|')})`, 'i'),
    ],
    label: 'Plano',
    transform: (v) => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
  },
  DATA_INICIO: {
    patterns: [
      /(?:in[ií]cio|come[çc]o|a\s+partir\s+de|data\s+de\s+in[ií]cio)\s*(?:em|:)?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(?:in[ií]cio|come[çc]o)\s*(?:em|:)?\s*(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i,
    ],
    label: 'Data de Início'
  },
  DATA_FIM: {
    patterns: [
      /(?:t[eé]rmino|fim|encerramento|vencimento|data\s+(?:de\s+)?fim)\s*(?:em|:)?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(?:t[eé]rmino|fim|encerramento)\s*(?:em|:)?\s*(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i,
    ],
    label: 'Data de Fim'
  },
  DURACAO: {
    patterns: [
      /dura[çc][aã]o\s*(?:de|do\s+contrato)?\s*(?::)?\s*(\d+\s*(?:meses|anos|dias|mes|ano|dia)\w*)/i,
      /(?:vig[eê]ncia|per[ií]odo)\s*(?:de)?\s*(\d+\s*(?:meses|anos|dias|mes|ano|dia)\w*)/i,
    ],
    label: 'Duração'
  }
};

/**
 * Parse free text and extract contract fields
 * @param {string} text - Free text input from user
 * @param {string[]} availablePlaceholders - Placeholders found in the template
 * @returns {Object} - { fieldName: value } mapping
 */
export function parseText(text, availablePlaceholders = []) {
  const result = {};
  
  if (!text || !text.trim()) return result;

  // 1. List of known keywords that act as field delimiters
  const keywords = [
    'NOME COMPLETO', 'NOME', 'CONTRATADO', 'NACIONALIDADE', 'ESTADO CIVIL', 
    'PROFISSÃO', 'PROFISSAO', 'RG', 'CPF', 'TELEFONE', 'TEL', 'CELULAR', 
    'WHATSAPP', 'ENDEREÇO', 'ENDERECO', 'RESIDENTE', 'CIDADE', 'ESTADO', 'CEP', 
    'EMAIL', 'E-MAIL', 'VALOR DO PLANO', 'VALOR POR ESCRITO', 'VALOR_EXTENSO', 
    'VALOR', 'PLANO ESCOLHIDO', 'PLANO', 'DATA DE INÍCIO', 'DATA_INICIO', 'INICIO', 
    'INÍCIO', 'DATA DE FIM', 'DATA_FIM', 'FIM', 'TERMINO', 'TÉRMINO', 'DURAÇÃO', 'DURACAO'
  ];

  // Escape keywords for regex
  const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  
  // Greedy extraction logic:
  // Identify blocks starting with "Keyword[:]" and ending before the next "Keyword" or end of line.
  const keywordRegex = new RegExp(`(?:^|[,;\\s])(${escapedKeywords})\\s*[:]?\\s*(.+?)(?=(?:[,;\\s]+(?:${escapedKeywords})\\s*[:]?)|[;]|$|(?:\r?\n))`, 'gi');
  
  let match;
  while ((match = keywordRegex.exec(text)) !== null) {
    const rawKey = match[1].trim().toUpperCase().replace(/\s+/g, '_');
    const value = match[2].trim();
    const mappedKey = mapFieldName(rawKey);
    
    // Only set if not already set or if using a more specific mapping
    if (!result[mappedKey] || mappedKey !== rawKey) {
      result[mappedKey] = value;
    }
  }

  // 2. Second Pass: NLP patterns for anything missed (redundant but safe)
  for (const [fieldName, config] of Object.entries(PATTERNS)) {
    if (result[fieldName]) continue;
    for (const pattern of config.patterns) {
      const nlpMatch = text.match(pattern);
      if (nlpMatch && nlpMatch[1]) {
        let value = nlpMatch[1].trim();
        if (config.transform) value = config.transform(value);
        result[fieldName] = value;
        break;
      }
    }
  }

  // Map to available placeholders
  const finalResult = {};
  if (availablePlaceholders && availablePlaceholders.length > 0) {
    for (const ph of availablePlaceholders) {
      // Clean target placeholder
      const cleanPh = ph.toUpperCase().replace(/\s+/g, '_');
      const canonicalPh = mapFieldName(cleanPh);
      
      if (result[canonicalPh]) {
        finalResult[ph] = result[canonicalPh];
      } else if (result[cleanPh]) {
        finalResult[ph] = result[cleanPh];
      } else if (result[ph]) {
        finalResult[ph] = result[ph];
      } else {
        // Try loose matching
        const looseMatch = Object.keys(result).find(k => {
          const kStr = k.toLowerCase().replace(/_/g, '').normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
          const pStr = cleanPh.toLowerCase().replace(/_/g, '').normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
          return kStr.includes(pStr) || pStr.includes(kStr);
        });
        if (looseMatch) {
          finalResult[ph] = result[looseMatch];
        }
      }
    }
    return finalResult;
  }

  return result;
}

/**
 * Map common Portuguese field names to placeholder names
 */
function mapFieldName(key) {
  const mapping = {
    'NOME_COMPLETO': 'CONTRATADO_NOME',
    'NOME': 'CONTRATADO_NOME',
    'CONTRATADO': 'CONTRATADO_NOME',
    'CPF': 'CONTRATADO_CPF',
    'RG': 'CONTRATADO_RG',
    'ENDERECO': 'CONTRATADO_ENDERECO',
    'ENDEREÇO': 'CONTRATADO_ENDERECO',
    'RESIDENTE': 'CONTRATADO_ENDERECO',
    'CIDADE': 'CONTRATADO_CIDADE',
    'ESTADO': 'CONTRATADO_ESTADO',
    'UF': 'CONTRATADO_ESTADO',
    'CEP': 'CONTRATADO_CEP',
    'EMAIL': 'CONTRATADO_EMAIL',
    'E_MAIL': 'CONTRATADO_EMAIL',
    'TELEFONE': 'CONTRATADO_TELEFONE',
    'TEL': 'CONTRATADO_TELEFONE',
    'CELULAR': 'CONTRATADO_TELEFONE',
    'VALOR': 'VALOR',
    'VALOR_DO_PLANO': 'VALOR',
    'VALOR_PLANO': 'VALOR',
    'VALOR_ESCRITO': 'VALOR_EXTENSO',
    'VALOR_POR_ESCRITO': 'VALOR_EXTENSO',
    'VALOR_EXTENSO': 'VALOR_EXTENSO',
    'PRECO': 'VALOR',
    'PREÇO': 'VALOR',
    'PLANO': 'PLANO',
    'PLANO_ESCOLHIDO': 'PLANO',
    'PLANO_ESCOLHIDO_ADICIONAL': 'PLANO',
    'DATA_INICIO': 'DATA_INICIO',
    'INICIO': 'DATA_INICIO',
    'INÍCIO': 'DATA_INICIO',
    'DATA_FIM': 'DATA_FIM',
    'FIM': 'DATA_FIM',
    'TERMINO': 'DATA_FIM',
    'TÉRMINO': 'DATA_FIM',
    'DURACAO': 'DURACAO',
    'DURAÇÃO': 'DURACAO',
    'VIGENCIA': 'DURACAO',
    'NACIONALIDADE': 'CONTRATADO_NACIONALIDADE',
    'ESTADO_CIVIL': 'CONTRATADO_ESTADO_CIVIL',
    'ESTADO_CÍVIL': 'CONTRATADO_ESTADO_CIVIL',
    'PROFISSAO': 'CONTRATADO_PROFISSAO',
    'PROFISSÃO': 'CONTRATADO_PROFISSAO',
  };
  return mapping[key] || key;
}

/**
 * Identify the most likely "Contratado" name from the extracted data
 * @param {Object} data - Extracted field data
 * @returns {string} - The detected name or 'Não identificado'
 */
export function getBestName(data) {
  if (!data) return 'Não identificado';

  // 1. High-priority canonical keys
  const priorityKeys = [
    'CONTRATADO_NOME', 'NOME', 'NOME_COMPLETO', 'CONTRATADO', 'ALUNO', 'STUDENT'
  ];

  for (const key of priorityKeys) {
    if (data[key] && data[key].length > 2) return data[key].trim();
  }

  // 2. Scan all keys for "NOME" or "CONTRATADO" in them
  const nameKeys = Object.keys(data).filter(k => 
    k.toUpperCase().includes('NOME') || 
    k.toUpperCase().includes('CONTRATADO') ||
    k.toUpperCase().includes('ALUNO')
  );

  for (const key of nameKeys) {
    if (data[key] && data[key].length > 2) return data[key].trim();
  }

  // 3. Fallback to first non-numeric value longer than 5 chars
  const fallbackValue = Object.values(data).find(v => 
    typeof v === 'string' && 
    v.length > 5 && 
    !/^\d/.test(v) && 
    !v.includes('@') && 
    !v.includes('/')
  );

  return fallbackValue || 'Não identificado';
}

/**
 * Get the label for a field name
 */
export function getFieldLabel(fieldName) {
  if (PATTERNS[fieldName]) return PATTERNS[fieldName].label;
  // Try to humanize the key
  return fieldName
    .replace(/_/g, ' ')
    .replace(/CONTRATADO\s*/i, '')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get available plan options
 */
export function getPlanOptions() {
  return PLAN_OPTIONS.map(p => p.charAt(0).toUpperCase() + p.slice(1));
}

export { PATTERNS, PLAN_OPTIONS };
