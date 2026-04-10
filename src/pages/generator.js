/**
 * Generator Page - Select template, input data, generate modified .docx
 */

import { getContracts, getContract, saveToHistory, getGenerationHistory } from '../services/db.js';
import { generateDocx, getDocxPreview, generatePdf, downloadFile } from '../services/docx-handler.js';
import { parseText, getFieldLabel, getPlanOptions, getBestName } from '../services/text-parser.js';
import { getCategoryStyle } from '../components/card.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../main.js';

let selectedTemplate = null;
let extractedFields = {};
let currentStep = 1;
let rawInputText = ''; // Track raw user input to avoid overwriting with extracted text

const PLAN_OPTIONS = getPlanOptions();

export async function renderGeneratorPage(container) {
  const contracts = await getContracts();
  const history = await getGenerationHistory();
  const lastGeneration = history.length > 0 ? history[0] : null;

  container.innerHTML = `
    <div class="generator-page">
      <!-- Header -->
      <div class="generator-header">
        <div class="generator-header-left">
          <h1>📝 Gerar Contrato</h1>
          <p>Selecione um template, descreva as alterações e gere o documento</p>
        </div>
        
        ${lastGeneration ? `
          <div class="last-gen-quick-access card animate-fade">
            <div class="last-gen-info">
              <span class="material-icons-round" style="color: var(--success);">history</span>
              <div>
                <p class="text-xs uppercase font-bold text-muted">Último Gerado</p>
                <p class="text-sm font-semibold">${lastGeneration.studentName}</p>
              </div>
            </div>
            <div class="last-gen-actions">
              <button class="btn btn-ghost btn-sm" id="btn-quick-redownload" data-id="${lastGeneration.id}">
                <span class="material-icons-round">download</span>
                Baixar Novamente
              </button>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Steps -->
      <div class="generator-steps">
        <div class="step-item ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}" data-step="1">
          <div class="step-number">${currentStep > 1 ? '<span class="material-icons-round" style="font-size: 1rem;">check</span>' : '1'}</div>
          <div class="step-info">
            <span class="step-label">Template</span>
            <span class="step-sublabel">Selecione o contrato</span>
          </div>
        </div>
        <div class="step-divider"></div>
        <div class="step-item ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}" data-step="2">
          <div class="step-number">${currentStep > 2 ? '<span class="material-icons-round" style="font-size: 1rem;">check</span>' : '2'}</div>
          <div class="step-info">
            <span class="step-label">Dados</span>
            <span class="step-sublabel">Descreva as alterações</span>
          </div>
        </div>
        <div class="step-divider"></div>
        <div class="step-item ${currentStep >= 3 ? 'active' : ''}" data-step="3">
          <div class="step-number">3</div>
          <div class="step-info">
            <span class="step-label">Gerar</span>
            <span class="step-sublabel">Baixe o contrato</span>
          </div>
        </div>
      </div>

      <!-- Content area -->
      <div id="generator-content">
        ${contracts.length === 0 ? renderNoContracts() : renderStep(contracts)}
      </div>
    </div>
  `;

  bindGeneratorEvents(container, contracts);
}

function renderNoContracts() {
  return `
    <div class="no-template-state card">
      <span class="material-icons-round" style="font-size: 5rem; color: var(--gray-200);">folder_off</span>
      <h3 style="margin-top: 16px; color: var(--text-secondary);">Nenhum contrato disponível</h3>
      <p style="color: var(--text-muted); margin-top: 8px;">Envie contratos na Biblioteca antes de gerar documentos.</p>
      <button class="btn btn-primary mt-6" onclick="window.navigateTo('library')">
        <span class="material-icons-round">folder_copy</span>
        Ir para Biblioteca
      </button>
    </div>
  `;
}

function renderStep(contracts) {
  if (currentStep === 1) return renderStep1(contracts);
  if (currentStep === 2) return renderStep2();
  if (currentStep === 3) return renderStep3();
  return '';
}

function renderStep1(contracts) {
  return `
    <div class="template-selector animate-fade">
      <h2>Selecione o template do contrato</h2>
      <p class="text-sm text-muted mt-4 mb-4">Escolha o modelo base para gerar o novo contrato</p>
      <div class="template-grid stagger-children">
        ${contracts.map(c => {
          const style = getCategoryStyle(c.category);
          return `
            <button class="template-option ${selectedTemplate?.id === c.id ? 'selected' : ''}" data-id="${c.id}">
              <div class="template-option-header">
                <div class="template-option-icon" style="background: ${style.bg}; color: ${style.color};">
                  <span class="material-icons-round">${style.icon}</span>
                </div>
                <div>
                  <div class="template-option-name">${c.name}</div>
                  <div class="template-option-category">${c.category}</div>
                </div>
              </div>
              <div class="template-placeholders">
                ${c.placeholders?.length > 0 
                  ? `${c.placeholders.length} campo(s): ${c.placeholders.slice(0, 3).map(p => `{${p}}`).join(', ')}${c.placeholders.length > 3 ? '...' : ''}`
                  : 'Sem placeholders detectados'
                }
              </div>
            </button>
          `;
        }).join('')}
      </div>
      
      ${selectedTemplate ? `
        <div class="generate-actions mt-8 animate-slide-up">
          <div class="generate-info">
            <h3>Template selecionado: ${selectedTemplate.name}</h3>
            <p>${selectedTemplate.placeholders?.length || 0} campos para preencher</p>
          </div>
          <button class="btn btn-primary btn-lg" id="btn-next-step2">
            Próximo
            <span class="material-icons-round">arrow_forward</span>
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderStep2() {
  if (!selectedTemplate) return '';

  const hasPlaceholders = selectedTemplate.placeholders && selectedTemplate.placeholders.length > 0;
  const hasPlanoField = selectedTemplate.placeholders?.includes('PLANO');

  return `
    <div class="animate-fade">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <button class="btn btn-ghost" id="btn-back-step1">
          <span class="material-icons-round">arrow_back</span>
          Voltar
        </button>
        <h2 style="flex:1;">Informações do contratado</h2>
      </div>

      <div class="generator-input-section">
        <!-- Input Panel -->
        <div class="input-panel">
          <div class="card">
            <div class="input-card-header">
              <span class="material-icons-round">edit_note</span>
              <h3>Descreva as alterações</h3>
            </div>
            <p class="text-sm text-muted mb-4">
              Escreva livremente os dados do contratado e as alterações desejadas. Os campos serão extraídos automaticamente.
            </p>
            <textarea 
              class="form-textarea" 
              id="input-free-text" 
              rows="8"
              placeholder="Ex: O contratado será João da Silva, CPF 123.456.789-00, RG 12.345.678-9, residente na Rua das Flores 123 - Centro, São Paulo/SP, CEP 01234-567. Valor de R$ 2.500,00, plano Anual, início em 01/05/2026."
              style="min-height: 180px;"
            >${rawInputText || buildTextFromFields()}</textarea>
            
            <button class="btn btn-accent mt-4 w-full" id="btn-extract-fields">
              <span class="material-icons-round">auto_fix_high</span>
              Extrair Campos Automaticamente
            </button>
          </div>

          ${hasPlanoField ? `
            <div class="card">
              <div class="input-card-header">
                <span class="material-icons-round" style="color: var(--orange-500);">workspace_premium</span>
                <h3>Plano</h3>
              </div>
              <div class="plan-selector" id="plan-selector">
                ${PLAN_OPTIONS.map(plan => `
                  <button class="plan-option ${extractedFields.PLANO === plan ? 'selected' : ''}" data-plan="${plan}">
                    ${plan}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Fields Preview Panel -->
        <div class="input-panel">
          <div class="card" style="flex:1;">
            <div class="input-card-header">
              <span class="material-icons-round" style="color: var(--success);">fact_check</span>
              <h3>Campos Extraídos</h3>
            </div>
            
            <div id="fields-preview" class="fields-preview">
              ${Object.keys(extractedFields).length > 0 
                ? renderFieldsPreview() 
                : `
                  <div class="empty-state" style="padding: 32px 16px;">
                    <span class="material-icons-round" style="font-size: 2.5rem;">pending</span>
                    <h3>Aguardando dados</h3>
                    <p>Escreva na caixa de texto e clique em "Extrair Campos"</p>
                  </div>
                `
              }
            </div>
          </div>

          ${hasPlaceholders ? `
            <div class="card" style="background: var(--blue-50); border: 1px solid var(--blue-100);">
              <div class="input-card-header">
                <span class="material-icons-round" style="color: var(--blue-500);">info</span>
                <h3 style="font-size: 0.875rem;">Campos do template</h3>
              </div>
              <div class="placeholder-list">
                ${selectedTemplate.placeholders.map(p => `
                  <span class="placeholder-tag" style="${extractedFields[p] ? 'background: #D1FAE5; color: #065F46;' : ''}">
                    <span class="material-icons-round">${extractedFields[p] ? 'check_circle' : 'radio_button_unchecked'}</span>
                    {${p}}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      ${Object.keys(extractedFields).length > 0 ? `
        <div class="generate-actions animate-slide-up">
          <div class="generate-info">
            <h3>Pronto para gerar</h3>
            <p>${Object.keys(extractedFields).length} campo(s) preenchido(s)</p>
          </div>
          <button class="btn btn-primary btn-lg" id="btn-next-step3">
            Revisar e Gerar
            <span class="material-icons-round">arrow_forward</span>
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderStep3() {
  if (!selectedTemplate || Object.keys(extractedFields).length === 0) return '';

  return `
    <div class="animate-fade">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <button class="btn btn-ghost" id="btn-back-step2">
          <span class="material-icons-round">arrow_back</span>
          Voltar
        </button>
        <h2 style="flex:1;">Revisão e Geração</h2>
      </div>

      <div class="generator-input-section">
        <!-- Review Panel -->
        <div class="input-panel">
          <div class="card">
            <div class="input-card-header">
              <span class="material-icons-round" style="color: var(--blue-500);">preview</span>
              <h3>Dados para substituição</h3>
            </div>
            <div class="fields-preview">
              ${renderFieldsPreviewEditable()}
            </div>
          </div>
        </div>

        <!-- Output Config -->
        <div class="input-panel">
          <div class="card">
            <div class="input-card-header">
              <span class="material-icons-round" style="color: var(--orange-500);">settings</span>
              <h3>Configurações de Saída</h3>
            </div>
            
            <div class="form-group mb-4">
              <label class="form-label">Nome do arquivo</label>
              <div class="filename-input-group">
                <input 
                  type="text" 
                  class="form-input" 
                  id="output-filename" 
                  value="contrato_${(extractedFields.CONTRATADO_NOME || 'gerado').replace(/\s+/g, '_').toLowerCase()}" 
                  placeholder="nome_do_arquivo"
                />
                <span class="file-ext">.docx</span>
              </div>
            </div>

            <div class="form-group mb-6">
              <label class="form-label">Template</label>
              <p style="font-size: 0.9375rem; font-weight: 600;">${selectedTemplate.name}</p>
              <p class="text-sm text-muted">${selectedTemplate.category}</p>
            </div>
          </div>

          <div class="generate-actions" style="flex-direction: column; align-items: stretch; text-align: center;">
            <button class="btn btn-accent btn-lg w-full" id="btn-generate-docx" style="padding: 20px;">
              <span class="material-icons-round">file_download</span>
              Gerar e Baixar Contrato .docx
            </button>
            <p class="text-sm text-muted mt-4">O arquivo será baixado automaticamente</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFieldsPreview() {
  return Object.entries(extractedFields).map(([key, value]) => `
    <div class="field-row">
      <span class="field-row-label">${getFieldLabel(key)}</span>
      <span class="field-row-value">${value}</span>
    </div>
  `).join('');
}

function renderFieldsPreviewEditable() {
  if (!selectedTemplate || !selectedTemplate.placeholders) return '';
  return selectedTemplate.placeholders.map(key => {
    const value = extractedFields[key] || '';
    return `
      <div class="field-row">
        <span class="field-row-label">${getFieldLabel(key)}</span>
        <input type="text" class="field-row-edit" data-field="${key}" value="${value}" placeholder="Digite ${getFieldLabel(key).toLowerCase()}..." />
      </div>
    `;
  }).join('');
}

function buildTextFromFields() {
  if (Object.keys(extractedFields).length === 0) return '';
  return Object.entries(extractedFields).map(([key, value]) => `${getFieldLabel(key)}: ${value}`).join('\n');
}

function bindGeneratorEvents(container, contracts) {
  // Template selection
  container.querySelectorAll('.template-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      const id = parseInt(opt.dataset.id);
      selectedTemplate = await getContract(id);
      const pageContent = document.getElementById('page-content');
      renderGeneratorPage(pageContent);
    });
  });

  // Next step 1 → 2
  const btnNext2 = container.querySelector('#btn-next-step2');
  if (btnNext2) {
    btnNext2.addEventListener('click', () => {
      currentStep = 2;
      const pageContent = document.getElementById('page-content');
      renderGeneratorPage(pageContent);
    });
  }

  // Back step 2 → 1
  const btnBack1 = container.querySelector('#btn-back-step1');
  if (btnBack1) {
    btnBack1.addEventListener('click', () => {
      currentStep = 1;
      const pageContent = document.getElementById('page-content');
      renderGeneratorPage(pageContent);
    });
  }

  // Extract fields button
  const btnExtract = container.querySelector('#btn-extract-fields');
  if (btnExtract) {
    btnExtract.addEventListener('click', () => {
      const textarea = container.querySelector('#input-free-text');
      const text = textarea?.value || '';
      rawInputText = text; // Save current text so we don't lose it on re-render
      if (!text.trim()) {
        showToast('Digite os dados do contratado primeiro', 'error');
        return;
      }
      
      extractedFields = parseText(text, selectedTemplate?.placeholders || []);
      
      if (Object.keys(extractedFields).length === 0) {
        showToast('Nenhum campo detectado. Tente usar o formato "Campo: valor"', 'error');
        return;
      }

      showToast(`${Object.keys(extractedFields).length} campo(s) extraído(s)!`, 'success');
      
      // Re-render step 2 with fields
      const pageContent = document.getElementById('page-content');
      renderGeneratorPage(pageContent);
    });
  }

  // Plan selector
  container.querySelectorAll('.plan-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const plan = opt.dataset.plan;
      extractedFields.PLANO = plan;
      
      // Update UI
      container.querySelectorAll('.plan-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');

      // Re-render fields preview
      const fieldsPreview = container.querySelector('#fields-preview');
      if (fieldsPreview) {
        fieldsPreview.innerHTML = renderFieldsPreview();
      }
    });
  });

  // Next step 2 → 3
  const btnNext3 = container.querySelector('#btn-next-step3');
  if (btnNext3) {
    btnNext3.addEventListener('click', () => {
      currentStep = 3;
      const pageContent = document.getElementById('page-content');
      renderGeneratorPage(pageContent);
    });
  }

  // Back step 3 → 2
  const btnBack2 = container.querySelector('#btn-back-step2');
  if (btnBack2) {
    btnBack2.addEventListener('click', () => {
      currentStep = 2;
      const pageContent = document.getElementById('page-content');
      renderGeneratorPage(pageContent);
    });
  }

  // Generate button
  const btnGenerate = container.querySelector('#btn-generate-docx');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', async () => {
      // Collect editable field values
      const editableFields = container.querySelectorAll('.field-row-edit');
      editableFields.forEach(input => {
        extractedFields[input.dataset.field] = input.value;
      });

      const filename = container.querySelector('#output-filename')?.value || 'contrato_gerado';
      let outputName = filename.endsWith('.docx') ? filename : `${filename}.docx`;

      btnGenerate.disabled = true;
      btnGenerate.innerHTML = '<div class="spinner" style="border-top-color: white;"></div> Gerando...';

      try {
        const docxBlob = await generateDocx(selectedTemplate.fileData, extractedFields, outputName);
        
        // Use the robust download utility
        downloadFile(docxBlob, outputName);
        
        // Also generate PDF
        let pdfName = outputName.replace('.docx', '.pdf');
        let pdfBlob = null;
        try {
          pdfBlob = await generatePdf(docxBlob, pdfName);
        } catch (pdfErr) {
          console.error('PDF Generation failed:', pdfErr);
        }

        // Identify the best name for history and filename
        // Identify the best name for history and filename
        const studentName = getBestName(extractedFields);
        const nameSuffix = studentName !== 'Não identificado' ? `_${studentName.replace(/\s+/g, '_')}` : '';
        outputName = `Contrato${nameSuffix}.docx`;
        pdfName = outputName.replace('.docx', '.pdf');

        // Save to History
        await saveToHistory({
          filename: outputName,
          studentName: studentName,
          templateName: selectedTemplate.name,
          templateId: selectedTemplate.id,
          docxBlob: docxBlob,
          pdfBlob: pdfBlob,
          data: { ...extractedFields }
        });

        showToast('Contrato gerado com sucesso!', 'success');
        
        // Show success screen with preview
        const content = container.querySelector('#generator-content');
        content.innerHTML = `
          <div class="card animate-scale-in">
            <div class="success-header text-center mb-6">
              <div class="success-icon mx-auto mb-4">
                <span class="material-icons-round">check_circle</span>
              </div>
              <h2 class="text-2xl font-bold">Documento Pronto!</h2>
              <p class="text-muted">O contrato para <strong>${studentName}</strong> foi gerado com sucesso.</p>
            </div>

            <div class="final-preview-section mb-6">
              <div class="preview-header flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500">Conferência Visual</h3>
                <button class="btn btn-ghost btn-xs" id="btn-copy-preview">
                  <span class="material-icons-round" style="font-size: 1rem;">content_copy</span>
                  Copiar Texto
                </button>
              </div>
              <div id="final-document-preview" class="final-document-preview">
                <div class="flex items-center justify-center p-12">
                  <span class="spinner-sm mr-2"></span> Carregando preview...
                </div>
              </div>
            </div>

            <div class="manual-download-help mb-6 p-4" style="background: #f0f7ff; border: 1px dashed #2b5ea7; border-radius: 12px; text-align: center;">
              <p class="text-xs font-bold mb-2 uppercase" style="color: #2b5ea7;">Download do Arquivo</p>
              <div id="manual-download-link-container">
                <span class="spinner-sm"></span> Preparando link direto...
              </div>
            </div>

            <div class="action-grid grid grid-cols-2 gap-4">
              <button class="btn btn-accent col-span-2" id="btn-download-pdf-now">
                <span class="material-icons-round">picture_as_pdf</span>
                Baixar em PDF
              </button>
              
              <button class="btn btn-secondary" id="btn-redownload-docx">
                <span class="material-icons-round">description</span>
                DOCX
              </button>
              
              <button class="btn btn-primary" id="btn-generate-another">
                <span class="material-icons-round">add</span>
                Novo
              </button>
            </div>

            <button class="btn btn-ghost w-full mt-4" id="btn-go-history">
              <span class="material-icons-round">history</span>
              Ver no Histórico
            </button>
          </div>
        `;

        // Load preview and manual links
        getDocxPreview(docxBlob).then(html => {
          const previewEl = document.getElementById('final-document-preview');
          if (previewEl) previewEl.innerHTML = html;
        });

        const manualReader = new FileReader();
        manualReader.onload = (e) => {
          const dlContainer = document.getElementById('manual-download-link-container');
          if (dlContainer) {
            dlContainer.innerHTML = `
              <a href="${e.target.result}" download="${outputName}" class="btn btn-primary w-full">
                <span class="material-icons-round">download</span>
                BAIXAR AGORA: ${outputName}
              </a>
            `;
          }
        };
        manualReader.readAsDataURL(docxBlob);

        // Bind events
        container.querySelector('#btn-redownload-docx')?.addEventListener('click', () => {
          downloadFile(docxBlob, outputName);
        });

        container.querySelector('#btn-copy-preview')?.addEventListener('click', () => {
          const previewEl = document.getElementById('final-document-preview');
          if (previewEl) {
            const text = previewEl.innerText;
            navigator.clipboard.writeText(text).then(() => {
              showToast('Texto copiado para a área de transferência!');
              const btn = container.querySelector('#btn-copy-preview');
              if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span class="material-icons-round" style="font-size: 1rem;">done</span> Copiado!';
                setTimeout(() => { btn.innerHTML = originalText; }, 2000);
              }
            });
          }
        });

        if (pdfBlob) {
          container.querySelector('#btn-download-pdf-now')?.addEventListener('click', () => {
            downloadFile(pdfBlob, pdfName);
          });
        }

        container.querySelector('#btn-go-history')?.addEventListener('click', () => {
          window.navigateTo('history');
        });

        container.querySelector('#btn-generate-another')?.addEventListener('click', () => {
          resetGeneratorState();
          const pageContent = document.getElementById('page-content');
          renderGeneratorPage(pageContent);
        });
      } catch (e) {
        console.error('Error generating docx:', e);
        showToast('Erro ao gerar o contrato: ' + e.message, 'error');
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = '<span class="material-icons-round">file_download</span> Gerar e Baixar Contrato .docx';
      }
    });
  }
}

// Reset state when leaving page
export function resetGeneratorState() {
  selectedTemplate = null;
  extractedFields = {};
  currentStep = 1;
}
