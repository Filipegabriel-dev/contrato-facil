/**
 * Modal Component - Modal reutilizável
 */

let activeModal = null;

export function showModal({ title, content, actions = [], size = 'md', onClose = null }) {
  closeModal(); // Close any existing modal

  const modalRoot = document.getElementById('modal-root');
  
  const sizeClass = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
    xl: 'modal-xl'
  }[size] || 'modal-md';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-container ${sizeClass}">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" id="modal-close-btn">
          <span class="material-icons-round">close</span>
        </button>
      </div>
      <div class="modal-body">
        ${typeof content === 'string' ? content : ''}
      </div>
      ${actions.length > 0 ? `
        <div class="modal-footer">
          ${actions.map((action, i) => `
            <button class="btn ${action.class || 'btn-secondary'}" data-action-idx="${i}" id="modal-action-${i}">
              ${action.icon ? `<span class="material-icons-round">${action.icon}</span>` : ''}
              ${action.label}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  modalRoot.appendChild(modal);
  activeModal = modal;

  // If content is a DOM element, append it
  if (typeof content !== 'string' && content instanceof HTMLElement) {
    modal.querySelector('.modal-body').appendChild(content);
  }

  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('modal-visible');
  });

  // Bind close
  modal.querySelector('#modal-close-btn').addEventListener('click', () => {
    closeModal();
    if (onClose) onClose();
  });

  modal.querySelector('.modal-backdrop').addEventListener('click', () => {
    closeModal();
    if (onClose) onClose();
  });

  // Bind actions
  actions.forEach((action, i) => {
    const btn = modal.querySelector(`[data-action-idx="${i}"]`);
    if (btn && action.onClick) {
      btn.addEventListener('click', () => action.onClick(modal));
    }
  });

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      if (onClose) onClose();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  return modal;
}

export function closeModal() {
  if (activeModal) {
    activeModal.classList.remove('modal-visible');
    setTimeout(() => {
      activeModal.remove();
      activeModal = null;
    }, 200);
  }
}

/**
 * Show a confirmation dialog
 */
export function showConfirm({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm }) {
  return showModal({
    title,
    content: `<p style="color: var(--text-secondary); line-height: 1.7;">${message}</p>`,
    actions: [
      { label: cancelLabel, class: 'btn btn-secondary', onClick: () => closeModal() },
      { label: confirmLabel, class: 'btn btn-danger', icon: 'warning', onClick: () => { onConfirm(); closeModal(); } }
    ]
  });
}
