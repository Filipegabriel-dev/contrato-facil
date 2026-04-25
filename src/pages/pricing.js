export async function renderPricingPage(container) {
  container.innerHTML = `
    <div class="pricing-container">
      <div class="pricing-header">
        <h1 class="pricing-title">Escolha o seu Plano</h1>
        <p class="pricing-subtitle">
          Comece gratuitamente e faça o upgrade conforme sua necessidade. 
          Sem contratos de fidelidade, cancele quando quiser.
        </p>
      </div>

      <div class="pricing-grid">
        <!-- Plano Free -->
        <div class="pricing-card">
          <h2 class="plan-name">Plano Gratuito</h2>
          <div class="plan-price">
            <span class="price-currency">R$</span>
            <span class="price-amount">0</span>
            <span class="price-period">/mês</span>
          </div>
          <ul class="plan-features">
            <li>
              <span class="material-icons-round">check_circle</span>
              <span>Até 3 contratos por mês</span>
            </li>
            <li>
              <span class="material-icons-round">check_circle</span>
              <span>Modelos básicos</span>
            </li>
            <li class="disabled">
              <span class="material-icons-round">cancel</span>
              <span>Histórico ilimitado</span>
            </li>
            <li class="disabled">
              <span class="material-icons-round">cancel</span>
              <span>Suporte prioritário</span>
            </li>
          </ul>
          <button class="btn-pricing btn-free" disabled>Plano Atual</button>
        </div>

        <!-- Plano Pro -->
        <div class="pricing-card featured">
          <div class="pricing-badge">Mais Popular</div>
          <h2 class="plan-name">Plano Profissional</h2>
          <div class="plan-price">
            <span class="price-currency">R$</span>
            <span class="price-amount">29</span>
            <span class="price-period">,90/mês</span>
          </div>
          <ul class="plan-features">
            <li>
              <span class="material-icons-round">check_circle</span>
              <span>Gerações <strong>ilimitadas</strong></span>
            </li>
            <li>
              <span class="material-icons-round">check_circle</span>
              <span>Todos os modelos DOCX</span>
            </li>
            <li>
              <span class="material-icons-round">check_circle</span>
              <span>Histórico completo (Nuven)</span>
            </li>
            <li>
              <span class="material-icons-round">check_circle</span>
              <span>Suporte via WhatsApp</span>
            </li>
          </ul>
          <button id="btn-upgrade-pro" class="btn-pricing btn-pro">
            Quero ser Pro
          </button>
        </div>
      </div>

      <div style="margin-top: var(--space-12); text-align: center; color: var(--slate-500); font-size: 0.875rem;">
        <div style="display: flex; align-items: center; justify-content: center; gap: var(--space-4);">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span class="material-icons-round" style="font-size: 1.25rem;">security</span>
            Pagamento Seguro via Mercado Pago
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span class="material-icons-round" style="font-size: 1.25rem;">bolt</span>
            Ativação Instantânea (Pix)
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind upgrade button
  const upgradeBtn = container.querySelector('#btn-upgrade-pro');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      // Future: Link to Mercado Pago Checkout
      alert('Em breve: Você será redirecionado para o Checkout do Mercado Pago!');
    });
  }
}
