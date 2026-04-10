/**
 * Sidebar Component - Navegação principal
 */

const MENU_ITEMS = [
  { id: 'library', icon: 'folder_copy', label: 'Biblioteca', sublabel: 'Contratos salvos' },
  { id: 'students', icon: 'groups', label: 'Alunos', sublabel: 'Gerenciar alunos' },
  { id: 'generator', icon: 'description', label: 'Gerar Contrato', sublabel: 'Novo documento' },
  { id: 'history', icon: 'history', label: 'Histórico', sublabel: 'Downloads recentes' },
];

export function renderSidebar(container, currentPage, onNavigate) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('pt-BR', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });

  container.innerHTML = `
    <div class="sidebar-inner">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">
            <span class="material-icons-round">gavel</span>
          </div>
          <div class="logo-text">
            <span class="logo-title">ContractGen</span>
            <span class="logo-subtitle">Gerador de Contratos</span>
          </div>
        </div>
      </div>

      <div class="sidebar-date">
        <span class="material-icons-round">calendar_today</span>
        <span>${dateStr}</span>
      </div>

      <nav class="sidebar-nav">
        <span class="nav-section-label">Menu Principal</span>
        ${MENU_ITEMS.map(item => `
          <button 
            class="nav-item ${currentPage === item.id ? 'active' : ''}" 
            data-page="${item.id}"
            id="nav-${item.id}"
          >
            <div class="nav-item-icon">
              <span class="material-icons-round">${item.icon}</span>
            </div>
            <div class="nav-item-text">
              <span class="nav-item-label">${item.label}</span>
              <span class="nav-item-sublabel">${item.sublabel}</span>
            </div>
            ${currentPage === item.id ? '<div class="nav-active-dot"></div>' : ''}
          </button>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-help">
          <div class="help-card">
            <span class="material-icons-round">lightbulb</span>
            <p>Use placeholders como <strong>{CAMPO}</strong> nos seus templates .docx</p>
          </div>
        </div>
        <div class="sidebar-version">
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  `;

  // Bind navigation events
  container.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      onNavigate(page);
    });
  });
}
