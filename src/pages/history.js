import { getGenerationHistory, deleteFromHistory } from '../services/db.js';
import { downloadFile } from '../services/docx-handler.js';
import { showToast } from '../main.js';

export async function renderHistoryPage(container) {
  const history = await getGenerationHistory();
  
  container.innerHTML = `
    <div class="history-page">
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Histórico de Gerações</h1>
          <p class="page-subtitle">Documentos gerados nos últimos 15 dias</p>
        </div>
      </div>

      <div class="history-content">
        ${history.length === 0 ? renderEmptyState() : renderHistoryTable(history)}
      </div>
    </div>
  `;


}

function renderEmptyState() {
  return `
    <div class="empty-state animate-fade-in">
      <div class="empty-icon">
        <span class="material-icons-round">history_toggle_off</span>
      </div>
      <h2>Nenhum documento recente</h2>
      <p>Os contratos que você gerar aparecerão aqui para download rápido por 15 dias.</p>
      <button class="btn btn-primary mt-4" onclick="window.navigateTo('generator')">
        Gerar Novo Contrato
      </button>
    </div>
  `;
}

// Global action handlers for History
window.historyActions = {
  downloadDocx: async (id) => {
    const historyItems = await getGenerationHistory();
    const item = historyItems.find(h => h.id === id);
    if (item && item.docxBlob) {
      downloadFile(item.docxBlob, item.filename);
      showToast('Download do DOCX iniciado');
    }
  },
  downloadPdf: async (id) => {
    const historyItems = await getGenerationHistory();
    const item = historyItems.find(h => h.id === id);
    if (item && item.pdfBlob) {
      const pdfName = item.filename.replace('.docx', '.pdf');
      downloadFile(item.pdfBlob, pdfName);
      showToast('Download do PDF iniciado');
    }
  },
  deleteItem: async (id) => {
    if (confirm('Deseja remover este item do histórico?')) {
      await deleteFromHistory(id);
      showToast('Item removido do histórico');
      // Find current container and refresh
      const container = document.getElementById('page-content');
      if (container) renderHistoryPage(container);
    }
  }
};

function renderHistoryTable(history) {
  return `
    <div class="table-container animate-slide-up">
      <table class="data-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Contratado</th>
            <th>Documento</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${history.map(item => `
            <tr>
              <td>
                <div class="date-cell">
                  <strong>${new Date(item.createdAt).toLocaleDateString('pt-BR')}</strong>
                  <span>${new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </td>
              <td>
                <div class="student-cell">
                  <span class="material-icons-round">person</span>
                  ${item.studentName || 'Não identificado'}
                </div>
              </td>
              <td>
                <div class="doc-cell">
                  <span class="doc-name">${item.filename}</span>
                  <span class="template-tag">${item.templateName}</span>
                </div>
              </td>
              <td class="text-right">
                <div class="item-actions">
                  <button class="btn-icon btn-docx" onclick="window.historyActions.downloadDocx(${item.id})" title="Baixar DOCX">
                    <span class="material-icons-round">description</span>
                  </button>
                  ${item.pdfBlob ? `
                    <button class="btn-icon btn-pdf" onclick="window.historyActions.downloadPdf(${item.id})" title="Baixar PDF">
                      <span class="material-icons-round">picture_as_pdf</span>
                    </button>
                  ` : ''}
                  <button class="btn-icon btn-delete" onclick="window.historyActions.deleteItem(${item.id})" title="Excluir">
                    <span class="material-icons-round">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

