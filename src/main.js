/**
 * Main Entry Point - ContractGen
 * SPA Router + App initialization
 */

import './styles/index.css';
import './styles/components.css';
import './styles/library.css';
import './styles/generator.css';
import './styles/students.css';
import './styles/pricing.css';

import { renderSidebar } from './components/sidebar.js';
import { renderLibraryPage } from './pages/library.js';
import { renderGeneratorPage, resetGeneratorState } from './pages/generator.js';
import { renderStudentsPage } from './pages/students.js';
import { renderHistoryPage } from './pages/history.js';
import { renderAccountPage } from './pages/account.js';
import { renderPricingPage } from './pages/pricing.js';
import { isUnlocked, onAuthStateChange, loginWithGoogle, loginWithEmail, signUpWithEmail } from './services/auth.js';

// Current page state
let currentPage = 'library';

// Toast system
let toastContainer = null;

export function showToast(message, type = 'info') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning'
  };

  toast.innerHTML = `
    <span class="material-icons-round">${icons[type] || 'info'}</span>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Navigation function
function navigateTo(page) {
  // Always close sidebar on mobile when navigating
  const app = document.getElementById('app');
  if (app) app.classList.remove('sidebar-open');

  if (page === currentPage) return;
  
  // Reset generator state when leaving
  if (currentPage === 'generator') {
    resetGeneratorState();
  }

  currentPage = page;
  
  // Update mobile header title
  const titles = {
    library: 'Biblioteca',
    generator: 'Gerar Contrato',
    students: 'Alunos',
    history: 'Histórico',
    account: 'Minha Conta',
    pricing: 'Planos e Preços'
  };
  const titleEl = document.getElementById('mobile-page-title');
  if (titleEl) titleEl.textContent = titles[page] || 'Contrato Fácil';

  renderApp();
}

// Make navigateTo available globally for inline onclick handlers
window.navigateTo = navigateTo;

// Render the full app
async function renderApp() {
  if (!isUnlocked()) {
    renderAuthScreen();
    return;
  }

  // Remove auth screen if exists
  const existingAuth = document.getElementById('auth-overlay');
  if (existingAuth) {
    existingAuth.remove();
  }

  const sidebar = document.getElementById('sidebar');
  const pageContent = document.getElementById('page-content');

  // Render sidebar
  await renderSidebar(sidebar, currentPage, navigateTo);

  // Render page with transition
  pageContent.style.opacity = '0';
  pageContent.style.transform = 'translateY(12px)';
  
  setTimeout(async () => {
    switch (currentPage) {
      case 'library':
        await renderLibraryPage(pageContent);
        break;
      case 'generator':
        await renderGeneratorPage(pageContent);
        break;
      case 'students':
        await renderStudentsPage(pageContent);
        break;
      case 'history':
        await renderHistoryPage(pageContent);
        break;
      case 'account':
        await renderAccountPage(pageContent);
        break;
      case 'pricing':
        await renderPricingPage(pageContent);
        break;
      default:
        await renderLibraryPage(pageContent);
    }

    requestAnimationFrame(() => {
      pageContent.style.opacity = '1';
      pageContent.style.transform = 'translateY(0)';
      pageContent.style.transition = 'all 0.35s ease-out';
    });
  }, 100);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  
  // Listen for Supabase Auth state changes
  onAuthStateChange((user, event) => {
    console.log('Auth state changed:', event, user);
    renderApp();
  });
});

function setupMobileMenu() {
  const app = document.getElementById('app');
  const menuBtn = document.getElementById('mobile-menu-btn');
  const overlay = document.getElementById('sidebar-overlay');

  if (menuBtn && !menuBtn.hasAttribute('data-bound')) {
    menuBtn.setAttribute('data-bound', 'true');
    menuBtn.addEventListener('click', () => {
      app.classList.add('sidebar-open');
    });
  }

  if (overlay && !overlay.hasAttribute('data-bound')) {
    overlay.setAttribute('data-bound', 'true');
    overlay.addEventListener('click', () => {
      app.classList.remove('sidebar-open');
    });
  }
}

// ============================================
// AUTH SCREEN RENDERING (SUPABASE)
// ============================================

function renderAuthScreen() {
  if (document.getElementById('auth-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';
  overlay.className = 'auth-overlay';
  
  overlay.innerHTML = `
    <div class="auth-card" style="max-width: 400px; padding: 32px;">
      <div class="auth-logo">
        <div class="logo-icon">
          <span class="material-icons-round">gavel</span>
        </div>
        <h1 class="auth-title">Contrato Fácil</h1>
        <p class="auth-subtitle">Faça login para acessar seus documentos</p>
      </div>

      <button id="btn-google-login" class="btn w-full" style="background: white; color: var(--slate-700); border: 1px solid var(--slate-200); padding: 12px; margin-bottom: 24px; font-weight: 600; box-shadow: var(--shadow-sm);">
        <img src="https://www.google.com/favicon.ico" alt="Google" style="width: 18px; height: 18px; margin-right: 8px;">
        Entrar com Google
      </button>

      <div style="display: flex; align-items: center; margin-bottom: 24px;">
        <div style="flex: 1; height: 1px; background: var(--slate-200);"></div>
        <span style="padding: 0 12px; color: var(--slate-400); font-size: 0.875rem;">OU</span>
        <div style="flex: 1; height: 1px; background: var(--slate-200);"></div>
      </div>

      <form id="auth-form" class="auth-form">
        <div class="form-group mb-3">
          <input type="email" id="auth-email" class="form-input" placeholder="Seu e-mail" required>
        </div>
        <div class="auth-input-group mb-4">
          <span class="material-icons-round auth-input-icon-left">lock</span>
          <input type="password" id="auth-password" class="auth-input" placeholder="Sua senha" required minlength="6">
          <button type="button" id="auth-toggle-pwd" class="auth-pwd-toggle btn-ghost" aria-label="Mostrar senha">
            <span class="material-icons-round">visibility_off</span>
          </button>
        </div>
        
        <div id="auth-error" class="auth-error mb-3">Erro ao logar</div>
        
        <button type="submit" class="btn btn-primary w-full" id="auth-submit-btn">
          Entrar / Cadastrar
        </button>
      </form>
      
      <div class="auth-footer mt-6" style="font-size: 0.75rem; color: var(--slate-400); text-align: center;">
        Ao entrar, você concorda com nossos Termos e Política de Privacidade (LGPD).
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const googleBtn = document.getElementById('btn-google-login');
  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const pwdInput = document.getElementById('auth-password');
  const errorMsg = document.getElementById('auth-error');
  const btn = document.getElementById('auth-submit-btn');
  const toggleBtn = document.getElementById('auth-toggle-pwd');
  const toggleIcon = toggleBtn.querySelector('.material-icons-round');

  toggleBtn.addEventListener('click', () => {
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      toggleIcon.textContent = 'visibility';
    } else {
      pwdInput.type = 'password';
      toggleIcon.textContent = 'visibility_off';
    }
  });

  googleBtn.addEventListener('click', async () => {
    try {
      googleBtn.innerHTML = '<span class="spinner-sm"></span> Conectando...';
      await loginWithGoogle();
      // Redirect happens automatically
    } catch (e) {
      errorMsg.textContent = 'Erro ao usar Google: ' + e.message;
      errorMsg.classList.add('visible');
      googleBtn.innerHTML = 'Entrar com Google';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const pwd = pwdInput.value;
    errorMsg.classList.remove('visible');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-sm" style="border-top-color: white;"></span> Verificando...';

    try {
      // Tenta fazer login primeiro
      await loginWithEmail(email, pwd);
      // Se sucesso, a função onAuthStateChange no topo do arquivo vai disparar
    } catch (err) {
      // Se não existe o usuário ou credencial invalida, tenta cadastrar?
      if (err.message.includes('Invalid login credentials')) {
        try {
          await signUpWithEmail(email, pwd);
          errorMsg.textContent = 'Conta criada! Confirme seu e-mail se necessário.';
          errorMsg.style.color = 'var(--success)';
        } catch (signUpErr) {
          errorMsg.textContent = signUpErr.message;
          errorMsg.style.color = 'var(--danger)';
        }
      } else {
        errorMsg.textContent = err.message;
        errorMsg.style.color = 'var(--danger)';
      }
      errorMsg.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Entrar / Cadastrar';
    }
  });
}
