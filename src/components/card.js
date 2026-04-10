/**
 * Contract Card Component
 */

const CATEGORY_COLORS = {
  'Prestação de Serviço': { bg: 'var(--blue-50)', color: 'var(--blue-500)', icon: 'handshake' },
  'Aluguel': { bg: 'var(--orange-50)', color: 'var(--orange-600)', icon: 'home' },
  'Trabalho': { bg: 'var(--red-50)', color: 'var(--red-600)', icon: 'work' },
  'Venda': { bg: '#D1FAE5', color: '#065F46', icon: 'shopping_cart' },
  'Parceria': { bg: '#EDE9FE', color: '#5B21B6', icon: 'groups' },
  'Outro': { bg: 'var(--gray-100)', color: 'var(--gray-600)', icon: 'description' },
};

function getCategoryStyle(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Outro'];
}

export function renderContractCard(contract, { onDelete, onView, onSelect }) {
  const style = getCategoryStyle(contract.category);
  const date = new Date(contract.createdAt);
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const placeholderCount = contract.placeholders ? contract.placeholders.length : 0;

  const card = document.createElement('div');
  card.className = 'contract-card card';
  card.dataset.id = contract.id;
  
  card.innerHTML = `
    <div class="contract-card-header">
      <div class="contract-card-icon" style="background: ${style.bg}; color: ${style.color};">
        <span class="material-icons-round">${style.icon}</span>
      </div>
      <div class="contract-card-actions">
        ${onSelect ? `
          <button class="btn btn-sm btn-accent card-select-btn" title="Selecionar para gerar">
            <span class="material-icons-round">play_arrow</span>
          </button>
        ` : ''}
        <button class="btn btn-sm btn-ghost card-view-btn" title="Visualizar">
          <span class="material-icons-round">visibility</span>
        </button>
        <button class="btn btn-sm btn-ghost card-delete-btn" title="Excluir">
          <span class="material-icons-round">delete_outline</span>
        </button>
      </div>
    </div>
    <div class="contract-card-body">
      <h3 class="contract-card-title">${contract.name}</h3>
      <span class="badge" style="background: ${style.bg}; color: ${style.color};">${contract.category || 'Sem categoria'}</span>
      <p class="contract-card-preview">${contract.textPreview || 'Sem preview disponível'}</p>
    </div>
    <div class="contract-card-footer">
      <div class="contract-card-meta">
        <span class="material-icons-round">calendar_today</span>
        <span>${dateStr}</span>
      </div>
      <div class="contract-card-meta">
        <span class="material-icons-round">data_object</span>
        <span>${placeholderCount} campo${placeholderCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  `;

  // Bind events
  const viewBtn = card.querySelector('.card-view-btn');
  const deleteBtn = card.querySelector('.card-delete-btn');
  const selectBtn = card.querySelector('.card-select-btn');

  if (viewBtn && onView) viewBtn.addEventListener('click', (e) => { e.stopPropagation(); onView(contract); });
  if (deleteBtn && onDelete) deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); onDelete(contract); });
  if (selectBtn && onSelect) selectBtn.addEventListener('click', (e) => { e.stopPropagation(); onSelect(contract); });

  // Click card to view
  if (onView) {
    card.addEventListener('click', () => onView(contract));
    card.style.cursor = 'pointer';
  }

  return card;
}

export { CATEGORY_COLORS, getCategoryStyle };
