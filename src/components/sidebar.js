/**
 * Sidebar Component - Navegação principal
 */

const MENU_ITEMS = [
  { id: 'library', icon: 'folder_copy', label: 'Biblioteca', sublabel: 'Contratos salvos' },
  { id: 'students', icon: 'groups', label: 'Alunos', sublabel: 'Gerenciar alunos' },
  { id: 'generator', icon: 'description', label: 'Gerar Contrato', sublabel: 'Novo documento' },
  { id: 'history', icon: 'history', label: 'Histórico', sublabel: 'Downloads recentes' },
];

import { getCurrentUser, lock } from '../services/auth.js';

export async function renderSidebar(container, currentPage, onNavigate) {
  const user = await getCurrentUser();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name || 'Usuário';
  const initials = user?.email?.substring(0, 2).toUpperCase() || '??';

  const today = new Date();
  const dateStr = today.toLocaleDateString('pt-BR', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  });

  container.innerHTML = `
    <div class="sidebar-inner">
      <div class="sidebar-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="sidebar-logo">
          <div class="logo-icon">
            <span class="material-icons-round">gavel</span>
          </div>
          <div class="logo-text">
            <span class="logo-title">Contrato Fácil</span>
            <span class="logo-subtitle">Gerador de Contratos</span>
          </div>
        </div>
        <button id="sidebar-close-btn" class="mobile-close-btn btn-ghost" aria-label="Fechar menu">
          <span class="material-icons-round">close</span>
        </button>
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
        <button class="btn btn-pro-sm w-full" data-page="pricing" style="margin-bottom: var(--space-4); background: linear-gradient(135deg, var(--blue-600), var(--blue-800)); color: white; border: none; font-size: 0.75rem; font-weight: 700; height: 36px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
          <span class="material-icons-round" style="font-size: 1rem;">workspace_premium</span>
          Seja Pro
        </button>

        <div class="user-profile-compact">
          <div class="user-profile-info" data-page="account" title="Ver perfil e configurações">
            <div class="user-avatar-small">
              ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar">` : initials}
            </div>
            <div class="user-text-small">
              <span class="user-name-small">${fullName}</span>
              <span class="user-status-small">Minha Conta</span>
            </div>
          </div>
          <button id="btn-lock-system" class="btn-icon-logout" title="Sair do sistema">
            <span class="material-icons-round">logout</span>
          </button>
        </div>

        <div class="sidebar-version">
          <span>Contrato Fácil • v1.0.0</span>
        </div>
      </div>
    </div>
  `;

  // Bind profile click
  const profileInfo = container.querySelector('.user-profile-info');
  if (profileInfo) {
    profileInfo.addEventListener('click', () => {
      onNavigate('account');
    });
  }

  // Bind navigation events
  container.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      onNavigate(page);
    });
  });

  // Bind mobile close button
  const closeBtn = container.querySelector('#sidebar-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const app = document.getElementById('app');
      if (app) app.classList.remove('sidebar-open');
    });
  }

  // Bind lock button
  const lockBtn = container.querySelector('#btn-lock-system');
  if (lockBtn) {
    lockBtn.addEventListener('click', async () => {
      await lock();
      window.location.reload();
    });
  }
}
