/**
 * Main Entry Point - ContractGen
 * SPA Router + App initialization
 */

import './styles/index.css';
import './styles/components.css';
import './styles/library.css';
import './styles/generator.css';
import './styles/students.css';

import { renderSidebar } from './components/sidebar.js';
import { renderLibraryPage } from './pages/library.js';
import { renderGeneratorPage, resetGeneratorState } from './pages/generator.js';
import { renderStudentsPage } from './pages/students.js';
import { renderHistoryPage } from './pages/history.js';

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
  if (page === currentPage) return;
  
  // Reset generator state when leaving
  if (currentPage === 'generator') {
    resetGeneratorState();
  }

  currentPage = page;
  renderApp();
}

// Make navigateTo available globally for inline onclick handlers
window.navigateTo = navigateTo;

// Render the full app
async function renderApp() {
  const sidebar = document.getElementById('sidebar');
  const pageContent = document.getElementById('page-content');

  // Render sidebar
  renderSidebar(sidebar, currentPage, navigateTo);

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
  renderApp();
});

// Also run if DOM is already loaded
if (document.readyState !== 'loading') {
  renderApp();
}
