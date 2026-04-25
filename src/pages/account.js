import { getCurrentUser, lock } from '../services/auth.js';
import { supabase } from '../services/supabase.js';
import { showToast } from '../main.js';

export async function renderAccountPage(container) {
  const user = await getCurrentUser();
  if (!user) return;

  // Supabase Auth stores Google avatar in user_metadata.avatar_url
  const avatarUrl = user.user_metadata?.avatar_url;
  const fullName = user.user_metadata?.full_name || 'Usuário';
  const email = user.email;
  
  // Get initials for fallback avatar
  const initials = email.substring(0, 2).toUpperCase();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Minha Conta</h1>
      <p class="page-subtitle">Gerencie seu perfil e suas preferências de privacidade</p>
    </div>

    <div class="account-container">
      <div class="account-header">
        <div class="account-avatar">
          ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" referrerpolicy="no-referrer">` : initials}
        </div>
        <h2 class="account-email">${fullName}</h2>
        <p style="color: var(--slate-500); margin-bottom: 8px;">${email}</p>
        <div class="account-status">Autenticado via ${user.app_metadata?.provider || 'E-mail'}</div>
      </div>

      <div class="account-card">
        <h3 class="account-card-title">
          <span class="material-icons-round">security</span>
          Segurança e Privacidade (LGPD)
        </h3>
        <p class="account-card-desc">
          Seus dados são armazenados em nuvem com criptografia e regras estritas de acesso (RLS). 
          Ninguém além de você tem acesso aos contratos gerados e aos dados dos seus alunos.
        </p>
      </div>

      <div class="account-card danger-zone">
        <h3 class="account-card-title">
          <span class="material-icons-round">warning</span>
          Zona de Perigo
        </h3>
        <p class="account-card-desc">
          O <strong>Direito ao Esquecimento</strong> permite que você apague todos os seus dados. 
          Ao clicar abaixo, <strong>todos os seus alunos, contratos e históricos</strong> serão permanentemente deletados. Esta ação é irreversível.
        </p>
        
        <div id="delete-confirmation" style="display: none; margin-bottom: 16px;">
          <p style="font-size: 0.875rem; color: var(--slate-700); font-weight: 600; margin-bottom: 8px;">Para confirmar, digite "DELETAR TUDO" abaixo:</p>
          <input type="text" id="delete-confirm-input" class="form-input mb-3" placeholder="DELETAR TUDO">
        </div>

        <button id="btn-delete-account" class="btn btn-danger">
          Apagar todos os meus dados
        </button>
      </div>
    </div>
  `;

  // Bind events
  const deleteBtn = container.querySelector('#btn-delete-account');
  const confirmContainer = container.querySelector('#delete-confirmation');
  const confirmInput = container.querySelector('#delete-confirm-input');

  deleteBtn.addEventListener('click', async () => {
    if (confirmContainer.style.display === 'none') {
      confirmContainer.style.display = 'block';
      deleteBtn.textContent = 'Confirmar Exclusão Definitiva';
      confirmInput.focus();
    } else {
      const confirmText = confirmInput.value.trim();
      if (confirmText !== 'DELETAR TUDO') {
        showToast('Você precisa digitar DELETAR TUDO exatamente como solicitado.', 'warning');
        return;
      }

      const confirmed = confirm('Tem CERTEZA ABSOLUTA? Esta ação apagará tudo.');
      if (!confirmed) return;

      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<span class="spinner-sm" style="border-top-color: white;"></span> Apagando...';

      try {
        // 1. Delete all database records (RLS allows deleting own rows)
        await supabase.from('students').delete().eq('user_id', user.id);
        await supabase.from('contracts').delete().eq('user_id', user.id);
        await supabase.from('generation_history').delete().eq('user_id', user.id);

        // 2. Call RPC to delete the auth user
        // Note: The user needs to create this RPC in Supabase!
        const { error: rpcError } = await supabase.rpc('delete_user_account');
        if (rpcError) {
          console.warn('RPC delete_user_account failed. User might still exist in auth.users.', rpcError);
        }

        // 3. Log out
        showToast('Conta e dados deletados com sucesso!', 'success');
        await lock();
        window.location.reload();
      } catch (e) {
        showToast('Erro ao apagar conta: ' + e.message, 'error');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Apagar todos os meus dados';
      }
    }
  });
}
