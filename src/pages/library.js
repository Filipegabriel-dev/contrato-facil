/**
 * Library Page - Upload, categorize and manage contract templates
 */

import { saveContract, getContracts, deleteContract, getCategories, getCategoryCounts } from '../services/db.js';
import { readDocx, getDocxPreview } from '../services/docx-handler.js';
import { renderContractCard, getCategoryStyle } from '../components/card.js';
import { showModal, closeModal, showConfirm } from '../components/modal.js';
import { showToast } from '../main.js';

const CATEGORIES = [
  'Prestação de Serviço',
  'Aluguel',
  'Trabalho',
  'Venda',
  'Parceria',
  'Outro'
];

let currentFilter = 'all';

export async function renderLibraryPage(container) {
  const contracts = await getContracts();
  const categoryCounts = await getCategoryCounts();
  const totalContracts = contracts.length;
  const totalCategories = Object.keys(categoryCounts).length;
  const totalPlaceholders = contracts.reduce((sum, c) => sum + (c.placeholders?.length || 0), 0);

  container.innerHTML = `
    <div class="library-page">
      <!-- Header -->
      <div class="library-header">
        <div class="library-header-left">
          <h1>📁 Biblioteca de Contratos</h1>
          <p>Gerencie seus templates de contratos</p>
        </div>
        <button class="btn btn-primary btn-lg" id="btn-upload-contract">
          <span class="material-icons-round">upload_file</span>
          Enviar Contrato
        </button>
      </div>

      <!-- Stats -->
      <div class="library-stats stagger-children">
        <div class="stat-card">
          <div class="stat-icon stat-icon-blue">
            <span class="material-icons-round">description</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">${totalContracts}</span>
            <span class="stat-label">Contratos</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-red">
            <span class="material-icons-round">category</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">${totalCategories}</span>
            <span class="stat-label">Categorias</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-orange">
            <span class="material-icons-round">data_object</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">${totalPlaceholders}</span>
            <span class="stat-label">Campos totais</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      ${totalContracts > 0 ? `
        <div class="library-filters" id="library-filters">
          <button class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">
            Todos
            <span class="count">${totalContracts}</span>
          </button>
          ${Object.entries(categoryCounts).map(([cat, count]) => `
            <button class="filter-chip ${currentFilter === cat ? 'active' : ''}" data-filter="${cat}">
              ${cat}
              <span class="count">${count}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}

      <!-- Contract Grid -->
      <div id="contract-list">
        ${totalContracts === 0 ? renderEmptyState() : ''}
      </div>
    </div>
  `;

  // Render contracts
  if (totalContracts > 0) {
    const listContainer = container.querySelector('#contract-list');
    const grid = document.createElement('div');
    grid.className = 'contract-grid stagger-children';

    const filteredContracts = currentFilter === 'all' 
      ? contracts 
      : contracts.filter(c => c.category === currentFilter);

    filteredContracts.forEach(contract => {
      const card = renderContractCard(contract, {
        onDelete: (c) => handleDelete(c, container),
        onView: (c) => handleView(c),
        onSelect: null
      });
      grid.appendChild(card);
    });

    listContainer.appendChild(grid);
  }

  // Bind events
  bindEvents(container);
}

function renderEmptyState() {
  return `
    <div class="upload-area" id="upload-drop-area">
      <div class="upload-area-content">
        <div class="upload-icon">
          <span class="material-icons-round">cloud_upload</span>
        </div>
        <h3>Envie seu primeiro contrato</h3>
        <p>Arraste um arquivo .docx aqui ou clique para selecionar</p>
        <p class="upload-formats">Formatos aceitos: .docx (Word)</p>
        
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px dashed var(--gray-200);">
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 12px;">Não tem um modelo?</p>
          <a href="/template_exemplo.docx" download="template_exemplo.docx" class="btn btn-outline" style="text-decoration: none; display: inline-flex;">
            <span class="material-icons-round">download</span>
            Baixar Template de Exemplo
          </a>
          <p style="font-size: 0.75rem; color: var(--red-500); margin-top: 8px; font-weight: 600;">
            AVISO: Este template é apenas para testes e NÃO possui validade jurídica.
          </p>
        </div>
      </div>
      <input type="file" id="file-input-empty" accept=".docx" style="display:none;" />
    </div>
  `;
}

function bindEvents(container) {
  // Upload button
  const uploadBtn = container.querySelector('#btn-upload-contract');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => showUploadModal());
  }

  // Empty state drop area
  const dropArea = container.querySelector('#upload-drop-area');
  const fileInputEmpty = container.querySelector('#file-input-empty');

  if (dropArea) {
    dropArea.addEventListener('click', () => fileInputEmpty?.click());
    
    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.classList.add('drag-over');
    });

    dropArea.addEventListener('dragleave', () => {
      dropArea.classList.remove('drag-over');
    });

    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.docx')) {
        showUploadDetailsModal(file);
      } else {
        showToast('Por favor, envie um arquivo .docx', 'error');
      }
    });

    if (fileInputEmpty) {
      fileInputEmpty.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) showUploadDetailsModal(file);
      });
    }
  }

  // Filters
  const filters = container.querySelectorAll('.filter-chip');
  filters.forEach(chip => {
    chip.addEventListener('click', () => {
      currentFilter = chip.dataset.filter;
      // Re-render page
      const pageContent = document.getElementById('page-content');
      renderLibraryPage(pageContent);
    });
  });
}

function showUploadModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="upload-area" id="modal-upload-area" style="padding: 48px 32px;">
      <div class="upload-area-content">
        <div class="upload-icon">
          <span class="material-icons-round">cloud_upload</span>
        </div>
        <h3>Selecione um contrato template</h3>
        <p>Arraste um arquivo .docx aqui ou clique para selecionar</p>
        <p class="upload-formats">O arquivo deve conter placeholders como {CONTRATADO_NOME}, {VALOR}, etc.</p>

        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px dashed var(--gray-200);">
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 12px;">Não tem um modelo?</p>
          <a href="/template_exemplo.docx" download="template_exemplo.docx" class="btn btn-outline" style="text-decoration: none; display: inline-flex;" id="download-sample-btn">
            <span class="material-icons-round">download</span>
            Baixar Template de Exemplo
          </a>
          <p style="font-size: 0.75rem; color: var(--red-500); margin-top: 8px; font-weight: 600;">
            AVISO: Este template é apenas para testes e NÃO possui validade jurídica.
          </p>
        </div>
      </div>
      <input type="file" id="modal-file-input" accept=".docx" style="display:none;" />
    </div>
  `;

  const modal = showModal({
    title: 'Enviar Contrato',
    content,
    size: 'md'
  });

  const dropArea = modal.querySelector('#modal-upload-area');
  const fileInput = modal.querySelector('#modal-file-input');
  const downloadLink = modal.querySelector('#download-sample-btn');

  dropArea.addEventListener('click', (e) => {
    // Evita abrir o seletor de arquivos se o usuário clicar no botão de download
    if (e.target.closest('#download-sample-btn')) return;
    fileInput.click();
  });
  
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('drag-over');
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('drag-over');
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.docx')) {
      closeModal();
      showUploadDetailsModal(file);
    } else {
      showToast('Por favor, envie um arquivo .docx', 'error');
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      closeModal();
      showUploadDetailsModal(file);
    }
  });
}

async function showUploadDetailsModal(file) {
  // Parse the file first
  let docxInfo;
  try {
    docxInfo = await readDocx(file);
  } catch (e) {
    console.error('Error reading docx:', e);
    showToast('Erro ao ler o arquivo. Verifique se é um .docx válido.', 'error');
    return;
  }

  const fileName = file.name.replace('.docx', '');

  const content = document.createElement('div');
  content.innerHTML = `
    <div class="form-group mb-6">
      <label class="form-label">Nome do contrato</label>
      <input type="text" class="form-input" id="contract-name" value="${fileName}" placeholder="Digite o nome do contrato" />
    </div>

    <div class="form-group mb-6">
      <label class="form-label">Categoria</label>
      <select class="form-select" id="contract-category">
        ${CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
    </div>

    ${docxInfo.placeholders.length > 0 ? `
      <div class="form-group mb-6">
        <label class="form-label">Campos detectados (${docxInfo.placeholders.length})</label>
        <div class="placeholder-list">
          ${docxInfo.placeholders.map(p => `
            <span class="placeholder-tag">
              <span class="material-icons-round">data_object</span>
              {${p}}
            </span>
          `).join('')}
        </div>
      </div>
    ` : `
      <div style="padding: 16px; background: var(--orange-50); border-radius: 8px; margin-bottom: 24px; border-left: 4px solid var(--orange-500);">
        <p style="font-size: 0.875rem; color: var(--orange-700);">
          <strong>Nenhum placeholder detectado.</strong><br>
          O contrato será salvo, mas para substituição automática, use a sintaxe {CAMPO} no template.
        </p>
      </div>
    `}

    ${docxInfo.textPreview ? `
      <div class="form-group">
        <label class="form-label">Preview</label>
        <div class="contract-preview">${docxInfo.textPreview}</div>
      </div>
    ` : ''}
  `;

  showModal({
    title: 'Detalhes do Contrato',
    content,
    size: 'lg',
    actions: [
      {
        label: 'Cancelar',
        class: 'btn btn-secondary',
        onClick: () => closeModal()
      },
      {
        label: 'Salvar Contrato',
        class: 'btn btn-primary',
        icon: 'save',
        onClick: async (modal) => {
          const name = modal.querySelector('#contract-name').value.trim();
          const category = modal.querySelector('#contract-category').value;

          if (!name) {
            showToast('Digite um nome para o contrato', 'error');
            return;
          }

          try {
            await saveContract({
              name,
              category,
              fileData: file,
              placeholders: docxInfo.placeholders,
              textPreview: docxInfo.textPreview
            });

            closeModal();
            showToast('Contrato salvo com sucesso!', 'success');
            
            // Re-render page
            const pageContent = document.getElementById('page-content');
            renderLibraryPage(pageContent);
          } catch (e) {
            console.error('Error saving contract:', e);
            showToast('Erro ao salvar o contrato', 'error');
          }
        }
      }
    ]
  });
}

async function handleDelete(contract, container) {
  showConfirm({
    title: 'Excluir Contrato',
    message: `Tem certeza que deseja excluir o contrato <strong>"${contract.name}"</strong>? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    onConfirm: async () => {
      try {
        await deleteContract(contract.id);
        showToast('Contrato excluído', 'success');
        const pageContent = document.getElementById('page-content');
        renderLibraryPage(pageContent);
      } catch (e) {
        showToast('Erro ao excluir', 'error');
      }
    }
  });
}

async function handleView(contract) {
  let htmlPreview = '<p>Carregando preview...</p>';
  
  try {
    if (contract.fileData) {
      htmlPreview = await getDocxPreview(contract.fileData);
    }
  } catch (e) {
    htmlPreview = '<p>Não foi possível carregar o preview.</p>';
  }

  const style = getCategoryStyle(contract.category);

  const content = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
      <div style="width: 44px; height: 44px; border-radius: 10px; background: ${style.bg}; color: ${style.color}; display: flex; align-items: center; justify-content: center;">
        <span class="material-icons-round">${style.icon}</span>
      </div>
      <div>
        <h3 style="margin: 0; font-size: 1rem;">${contract.name}</h3>
        <span class="badge" style="background: ${style.bg}; color: ${style.color};">${contract.category}</span>
      </div>
    </div>

    ${contract.placeholders && contract.placeholders.length > 0 ? `
      <div style="margin-bottom: 16px;">
        <label class="form-label">Campos substituíveis</label>
        <div class="placeholder-list">
          ${contract.placeholders.map(p => `
            <span class="placeholder-tag">
              <span class="material-icons-round">data_object</span>
              {${p}}
            </span>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <label class="form-label">Conteúdo do contrato</label>
    <div class="contract-preview">${htmlPreview}</div>
  `;

  showModal({
    title: 'Visualizar Contrato',
    content,
    size: 'xl',
    actions: [
      {
        label: 'Fechar',
        class: 'btn btn-secondary',
        onClick: () => closeModal()
      }
    ]
  });
}
