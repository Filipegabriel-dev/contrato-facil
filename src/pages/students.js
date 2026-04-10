/**
 * Students Page - Gerenciamento de alunos
 */

import { getStudents, saveStudent, updateStudent, deleteStudent, getStudentStats, getContracts, getStudentDocs, saveStudentDoc, deleteStudentDoc } from '../services/db.js';
import { generateDocx, getDocxPreview } from '../services/docx-handler.js';
import { generateCertificate } from '../services/certificate-handler.js';
import { getCategoryStyle } from '../components/card.js';
import { showModal, closeModal, showConfirm } from '../components/modal.js';
import { showToast } from '../main.js';

const PLAN_LABELS = {
  'Anual': { color: 'var(--blue-500)', bg: 'var(--blue-50)' },
  'Semestral': { color: 'var(--orange-600)', bg: 'var(--orange-50)' },
  'Dupla': { color: '#7C3AED', bg: '#EDE9FE' },
  'Grupo': { color: '#065F46', bg: '#D1FAE5' },
};

let searchQuery = '';
let statusFilter = 'all';
let planFilter = 'all';

export async function renderStudentsPage(container) {
  const stats = await getStudentStats();
  const allStudents = await getStudents();
  
  // Apply filters
  let filtered = allStudents;
  if (statusFilter === 'active') filtered = filtered.filter(s => s.active);
  if (statusFilter === 'inactive') filtered = filtered.filter(s => !s.active);
  if (planFilter !== 'all') filtered = filtered.filter(s => s.plan === planFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.cpf?.toLowerCase().includes(q) ||
      s.plan?.toLowerCase().includes(q)
    );
  }

  container.innerHTML = `
    <div class="students-page">
      <!-- Header -->
      <div class="students-header">
        <div class="students-header-left">
          <h1>👥 Alunos</h1>
          <p>Gerencie os alunos cadastrados</p>
        </div>
        <button class="btn btn-primary btn-lg" id="btn-add-student">
          <span class="material-icons-round">person_add</span>
          Novo Aluno
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="library-stats stagger-children">
        <div class="stat-card" id="stat-total" style="cursor:pointer;" data-filter="all">
          <div class="stat-icon stat-icon-blue">
            <span class="material-icons-round">groups</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">${stats.total}</span>
            <span class="stat-label">Total de Alunos</span>
          </div>
        </div>
        <div class="stat-card" id="stat-active" style="cursor:pointer;" data-filter="active">
          <div class="stat-icon" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%);">
            <span class="material-icons-round">check_circle</span>
          </div>
          <div class="stat-info">
            <span class="stat-value" style="color: #059669;">${stats.active}</span>
            <span class="stat-label">Alunos Ativos</span>
          </div>
        </div>
        <div class="stat-card" id="stat-inactive" style="cursor:pointer;" data-filter="inactive">
          <div class="stat-icon" style="background: linear-gradient(135deg, var(--red-400) 0%, var(--red-600) 100%);">
            <span class="material-icons-round">cancel</span>
          </div>
          <div class="stat-info">
            <span class="stat-value" style="color: var(--red-600);">${stats.inactive}</span>
            <span class="stat-label">Alunos Inativos</span>
          </div>
        </div>
      </div>

      <!-- Active rate bar -->
      ${stats.total > 0 ? `
        <div class="active-rate-card card mb-6">
          <div class="active-rate-header">
            <span class="text-sm" style="font-weight: 600; color: var(--text-secondary);">Taxa de Atividade</span>
            <span class="text-sm" style="font-weight: 700; color: var(--success);">${Math.round((stats.active / stats.total) * 100)}%</span>
          </div>
          <div class="active-rate-bar">
            <div class="active-rate-fill" style="width: ${(stats.active / stats.total) * 100}%"></div>
          </div>
        </div>
      ` : ''}

      <!-- Search & Filters -->
      <div class="students-toolbar" style="align-items: center;">
        <div class="search-box">
          <span class="material-icons-round">search</span>
          <input type="text" class="search-input" id="student-search" placeholder="Buscar aluno por nome, CPF ou plano..." value="${searchQuery}" />
        </div>
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
          <!-- Status Filter -->
          <div class="status-filters">
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Status: </span>
            <button class="filter-chip ${statusFilter === 'all' ? 'active' : ''}" data-status="all">Todos</button>
            <button class="filter-chip ${statusFilter === 'active' ? 'active' : ''}" data-status="active" style="${statusFilter === 'active' ? 'background: #059669; color: white; border-color: #059669;' : ''}">Ativos</button>
            <button class="filter-chip ${statusFilter === 'inactive' ? 'active' : ''}" data-status="inactive" style="${statusFilter === 'inactive' ? 'background: var(--red-600); color: white; border-color: var(--red-600);' : ''}">Inativos</button>
          </div>
          
          <!-- Plan Filter -->
          <div class="status-filters">
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Plano: </span>
            <button class="filter-chip plan-filter ${planFilter === 'all' ? 'active' : ''}" data-plan="all">Todos</button>
            <button class="filter-chip plan-filter ${planFilter === 'Dupla' ? 'active' : ''}" data-plan="Dupla">Dupla</button>
            <button class="filter-chip plan-filter ${planFilter === 'Grupo' ? 'active' : ''}" data-plan="Grupo">Grupo</button>
          </div>
        </div>
      </div>

      <!-- Students List -->
      <div id="students-list">
        ${filtered.length === 0 
          ? (allStudents.length === 0 ? renderEmptyState() : renderNoResults())
          : renderStudentsList(filtered)
        }
      </div>
    </div>
  `;

  bindStudentEvents(container);
}

function renderEmptyState() {
  return `
    <div class="card" style="text-align: center; padding: 64px 24px;">
      <span class="material-icons-round" style="font-size: 4rem; color: var(--gray-300);">person_off</span>
      <h3 style="margin-top: 16px; color: var(--text-secondary);">Nenhum aluno cadastrado</h3>
      <p style="color: var(--text-muted); margin-top: 8px; font-size: 0.875rem;">Adicione alunos para acompanhar o status dos contratos.</p>
    </div>
  `;
}

function renderNoResults() {
  return `
    <div class="card" style="text-align: center; padding: 48px 24px;">
      <span class="material-icons-round" style="font-size: 3rem; color: var(--gray-300);">search_off</span>
      <h3 style="margin-top: 12px; color: var(--text-secondary);">Nenhum resultado encontrado</h3>
      <p style="color: var(--text-muted); margin-top: 8px; font-size: 0.875rem;">Tente outro termo de busca ou filtro.</p>
    </div>
  `;
}

function calculateContractStatus(startDate, plan) {
  if (!startDate || !plan) return null;
  
  const start = new Date(startDate);
  // Ensure we compare midnight to midnight local time
  start.setHours(0, 0, 0, 0);
  
  let monthsToAdd = 0;
  if (plan === 'Anual' || plan === 'Dupla' || plan === 'Grupo') monthsToAdd = 12;
  else if (plan === 'Semestral') monthsToAdd = 6;
  else return null;

  const end = new Date(start);
  end.setMonth(end.getMonth() + monthsToAdd);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    endDate: end,
    daysRemaining: diffDays,
    isExpired: diffDays < 0
  };
}

function renderStudentsList(students) {
  return `
    <div class="students-table card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>CPF</th>
            <th>Plano</th>
            <th>Período</th>
            <th>Status</th>
            <th style="text-align:right;">Ações</th>
          </tr>
        </thead>
        <tbody class="stagger-children">
          ${students.map(s => {
            const planStyle = PLAN_LABELS[s.plan] || { color: 'var(--gray-600)', bg: 'var(--gray-100)' };
            const statusInfo = calculateContractStatus(s.startDate, s.plan);
            
            return `
              <tr class="student-row" data-id="${s.id}">
                <td>
                  <div class="student-info view-student-btn" data-id="${s.id}" title="Ver detalhes" style="cursor: pointer;">
                    <div class="student-avatar" style="background: ${s.active ? 'linear-gradient(135deg, var(--blue-400), var(--blue-600))' : 'var(--gray-300)'};">
                      ${s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span class="student-name hover-underline">${s.name}</span>
                      ${s.email ? `<span class="student-email">${s.email}</span>` : ''}
                    </div>
                  </div>
                </td>
                <td><span class="text-sm text-muted">${s.cpf || '—'}</span></td>
                <td>
                  <span class="badge" style="background: ${planStyle.bg}; color: ${planStyle.color};">
                    ${s.plan || '—'}
                  </span>
                </td>
                <td>
                  <span class="text-sm text-primary" style="display:block;">${s.startDate ? new Date(s.startDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '—'}</span>
                  ${statusInfo ? (
                    statusInfo.isExpired 
                      ? `<span style="font-size: 0.75rem; color: var(--red-600); font-weight: 600;">Vencido há ${Math.abs(statusInfo.daysRemaining)} dias</span>`
                      : `<span style="font-size: 0.75rem; color: var(--blue-500); font-weight: 600;">Faltam ${statusInfo.daysRemaining} dias</span>`
                  ) : ''}
                </td>
                <td>
                  <button class="status-toggle ${s.active ? 'active' : 'inactive'}" data-id="${s.id}" data-active="${s.active}" title="Clique para alternar">
                    <span class="material-icons-round">${s.active ? 'toggle_on' : 'toggle_off'}</span>
                    <span>${s.active ? 'Ativo' : 'Inativo'}</span>
                  </button>
                </td>
                <td style="text-align:right;">
                  <div class="row-actions">
                    <button class="btn btn-sm btn-ghost cert-student-btn" data-id="${s.id}" title="Emitir Certificado">
                      <span class="material-icons-round" style="color: var(--orange-500);">workspace_premium</span>
                    </button>
                    <button class="btn btn-sm btn-accent renew-student-btn" data-id="${s.id}" title="Renovar Contrato" style="opacity:1;">
                      <span class="material-icons-round">autorenew</span>
                    </button>
                    <button class="btn btn-sm btn-ghost edit-student-btn" data-id="${s.id}" title="Editar">
                      <span class="material-icons-round">edit</span>
                    </button>
                    <button class="btn btn-sm btn-ghost delete-student-btn" data-id="${s.id}" title="Excluir" style="color: var(--red-500);">
                      <span class="material-icons-round">delete_outline</span>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function showStudentModal(student = null) {
  const isEdit = !!student;
  const title = isEdit ? 'Editar Aluno' : 'Novo Aluno';
  const plans = ['Anual', 'Semestral', 'Dupla', 'Grupo'];

  const allStudents = await getStudents();
  const availableStudents = allStudents.filter(s => s.id !== student?.id);
  const currentMembers = student?.groupMembers || [];

  const content = `
    <div class="form-group mb-4">
      <label class="form-label">Nome Completo *</label>
      <input type="text" class="form-input" id="student-name" value="${student?.name || ''}" placeholder="Nome do aluno" />
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap: 16px;" class="mb-4">
      <div class="form-group">
        <label class="form-label">CPF</label>
        <input type="text" class="form-input" id="student-cpf" value="${student?.cpf || ''}" placeholder="000.000.000-00" />
      </div>
      <div class="form-group">
        <label class="form-label">Telefone</label>
        <input type="text" class="form-input" id="student-phone" value="${student?.phone || ''}" placeholder="(00) 00000-0000" />
      </div>
    </div>
    <div class="form-group mb-4">
      <label class="form-label">E-mail</label>
      <input type="email" class="form-input" id="student-email" value="${student?.email || ''}" placeholder="email@exemplo.com" />
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap: 16px;" class="mb-4">
      <div class="form-group">
        <label class="form-label">Plano</label>
        <select class="form-select" id="student-plan">
          <option value="">Selecione...</option>
          ${plans.map(p => `<option value="${p}" ${student?.plan === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Data de Início</label>
        <input type="date" class="form-input" id="student-start" value="${student?.startDate || ''}" />
      </div>
    </div>
    <div class="form-group mb-4" id="group-members-container" style="display: ${student?.plan === 'Dupla' || student?.plan === 'Grupo' ? 'block' : 'none'};">
      <label class="form-label">Integrantes da Dupla/Grupo</label>
      <select multiple class="form-select" id="student-group-members" style="height: auto; min-height: 80px;">
        ${availableStudents.map(s => 
          `<option value="${s.id}" ${currentMembers.includes(s.id.toString()) ? 'selected' : ''}>${s.name} (${s.cpf || 'Sem CPF'})</option>`
        ).join('')}
      </select>
      <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: block;">Segure Ctrl (ou Cmd no Mac) para selecionar múltiplos alunos.</span>
    </div>
    <div class="form-group mb-4">
      <label class="form-label">Contratos Antigos / Histórico (Opcional)</label>
      <input type="file" id="initial-doc-upload" accept=".pdf,.doc,.docx,image/*" class="form-input" />
      <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: block;">Anexe contratos anteriores ou documentos inativos para manter salvo no histórico do aluno.</span>
    </div>
    <div class="form-group mb-4">
      <label class="form-label">Status</label>
      <div class="plan-selector" style="grid-template-columns: 1fr 1fr;">
        <button class="plan-option ${!student || student.active ? 'selected' : ''}" data-val="true" id="status-active-btn" style="${!student || student.active ? 'background: linear-gradient(135deg, #10B981, #059669); border-color: #059669; color: white; box-shadow: 0 0 20px rgba(16,185,129,0.3);' : ''}">
          <span class="material-icons-round" style="font-size: 1rem;">check_circle</span> Ativo
        </button>
        <button class="plan-option ${student && !student.active ? 'selected' : ''}" data-val="false" id="status-inactive-btn" style="${student && !student.active ? 'background: linear-gradient(135deg, var(--red-500), var(--red-600)); border-color: var(--red-600); color: white; box-shadow: var(--shadow-glow-red);' : ''}">
          <span class="material-icons-round" style="font-size: 1rem;">cancel</span> Inativo
        </button>
      </div>
      <input type="hidden" id="student-active" value="${student ? student.active : true}" />
    </div>
  `;

  const modal = showModal({
    title,
    content,
    size: 'md',
    actions: [
      { label: 'Cancelar', class: 'btn btn-secondary', onClick: () => closeModal() },
      {
        label: isEdit ? 'Salvar Alterações' : 'Cadastrar Aluno',
        class: 'btn btn-primary',
        icon: isEdit ? 'save' : 'person_add',
        onClick: async (m) => {
          const name = m.querySelector('#student-name').value.trim();
          if (!name) {
            showToast('Informe o nome do aluno', 'error');
            return;
          }

          const selectMemb = m.querySelector('#student-group-members');
          const groupMembers = selectMemb ? Array.from(selectMemb.selectedOptions).map(opt => opt.value) : [];

          const data = {
            name,
            cpf: m.querySelector('#student-cpf').value.trim(),
            phone: m.querySelector('#student-phone').value.trim(),
            email: m.querySelector('#student-email').value.trim(),
            plan: m.querySelector('#student-plan').value,
            startDate: m.querySelector('#student-start').value,
            active: m.querySelector('#student-active').value === 'true',
            groupMembers: (m.querySelector('#student-plan').value === 'Dupla' || m.querySelector('#student-plan').value === 'Grupo') ? groupMembers : []
          };

          showConfirm({
            title: isEdit ? 'Confirmar Alterações' : 'Confirmar Cadastro',
            message: isEdit ? 'Deseja salvar as alterações neste cadastro?' : 'Deseja confirmar o cadastro deste novo aluno?',
            confirmLabel: 'Confirmar',
            onConfirm: async () => {
              try {
                let sId;
                if (isEdit) {
                  sId = student.id;
                  await updateStudent(sId, data);
                  await syncGroupMembers(sId, data.groupMembers, data.plan);
                  showToast('Aluno atualizado!', 'success');
                } else {
                  sId = await saveStudent(data);
                  await syncGroupMembers(sId, data.groupMembers, data.plan);
                  showToast('Aluno cadastrado!', 'success');
                }

                // Handle optional initial upload
                const fileInput = m.querySelector('#initial-doc-upload');
                if (fileInput && fileInput.files.length > 0) {
                  const file = fileInput.files[0];
                  try {
                    await saveStudentDoc(sId, file);
                    showToast('Documento inicial anexado!', 'success');
                  } catch (err) {
                    showToast('Erro ao anexar documento inicial', 'error');
                  }
                }
                closeModal();
                const pageContent = document.getElementById('page-content');
                renderStudentsPage(pageContent);
              } catch (e) {
                showToast('Erro ao salvar: ' + e.message, 'error');
              }
            }
          });
        }
      }
    ]
  });

  // Bind status toggle in modal
  const activeBtn = modal.querySelector('#status-active-btn');
  const inactiveBtn = modal.querySelector('#status-inactive-btn');
  const hiddenInput = modal.querySelector('#student-active');
  const planSelect = modal.querySelector('#student-plan');
  const groupMembCont = modal.querySelector('#group-members-container');

  if (planSelect && groupMembCont) {
    planSelect.addEventListener('change', (e) => {
      const p = e.target.value;
      if (p === 'Dupla' || p === 'Grupo') {
        groupMembCont.style.display = 'block';
      } else {
        groupMembCont.style.display = 'none';
      }
    });
  }

  if (activeBtn && inactiveBtn) {
    activeBtn.addEventListener('click', () => {
      hiddenInput.value = 'true';
      activeBtn.classList.add('selected');
      activeBtn.style.cssText = 'background: linear-gradient(135deg, #10B981, #059669); border-color: #059669; color: white; box-shadow: 0 0 20px rgba(16,185,129,0.3);';
      inactiveBtn.classList.remove('selected');
      inactiveBtn.style.cssText = '';
    });
    inactiveBtn.addEventListener('click', () => {
      hiddenInput.value = 'false';
      inactiveBtn.classList.add('selected');
      inactiveBtn.style.cssText = 'background: linear-gradient(135deg, var(--red-500), var(--red-600)); border-color: var(--red-600); color: white; box-shadow: var(--shadow-glow-red);';
      activeBtn.classList.remove('selected');
      activeBtn.style.cssText = '';
    });
  }
}

/**
 * Details Modal - Visualizar detalhes do aluno
 */
async function showStudentDetails(student) {
  const planStyle = PLAN_LABELS[student.plan] || { color: 'var(--gray-600)', bg: 'var(--gray-100)' };
  const statusInfo = calculateContractStatus(student.startDate, student.plan);
  const docs = await getStudentDocs(student.id);
  
  let groupHtml = '';
  if ((student.plan === 'Dupla' || student.plan === 'Grupo') && student.groupMembers && student.groupMembers.length > 0) {
    const allStudents = await getStudents();
    const members = student.groupMembers.map(id => allStudents.find(s => s.id.toString() === id.toString()));
    const validMembers = members.filter(Boolean);
    
    if (validMembers.length > 0) {
      groupHtml = `
        <div class="detail-item" style="grid-column: span 2; background: var(--gray-50); padding: 12px; border-radius: 8px; border: 1px solid var(--gray-200);">
          <label style="display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">
            Integrantes (${validMembers.length + 1} no total contando com este aluno)
          </label>
          <ul style="margin: 0; padding-left: 16px; font-size: 0.9375rem; color: var(--text-primary);">
            ${validMembers.map(m => `<li>${m.name} ${m.cpf ? `(CPF: ${m.cpf})` : ''}</li>`).join('')}
          </ul>
        </div>
      `;
    }
  }

  let timeRemainingHtml = '';
  if (statusInfo) {
    if (statusInfo.isExpired) {
      timeRemainingHtml = `
        <div class="detail-item" style="grid-column: span 2; background: var(--red-50); padding: 12px; border-radius: 8px; border: 1px solid var(--red-100);">
          <label style="display: block; font-size: 0.75rem; color: var(--red-600); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Situação do Contrato</label>
          <div style="font-size: 0.9375rem; color: var(--red-700); font-weight: 500;">
            Vencido em ${statusInfo.endDate.toLocaleDateString('pt-BR')} (há ${Math.abs(statusInfo.daysRemaining)} dias)
            <span class="material-icons-round" style="font-size: 1rem; vertical-align: middle; margin-left: 4px;">warning</span>
          </div>
        </div>
      `;
    } else {
      timeRemainingHtml = `
        <div class="detail-item" style="grid-column: span 2; background: var(--blue-50); padding: 12px; border-radius: 8px; border: 1px solid var(--blue-100);">
          <label style="display: block; font-size: 0.75rem; color: var(--blue-600); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Situação do Contrato</label>
          <div style="font-size: 0.9375rem; color: var(--blue-700); font-weight: 500;">
            Vence em ${statusInfo.endDate.toLocaleDateString('pt-BR')} (faltam ${statusInfo.daysRemaining} dias)
            <span class="material-icons-round" style="font-size: 1rem; vertical-align: middle; margin-left: 4px;">schedule</span>
          </div>
        </div>
      `;
    }
  }

  const content = `
    <div class="student-details-header mb-6" style="display: flex; align-items: center; gap: 16px;">
      <div class="student-avatar" style="width: 64px; height: 64px; font-size: 1.5rem; background: ${student.active ? 'linear-gradient(135deg, var(--blue-400), var(--blue-600))' : 'var(--gray-300)'};">
        ${student.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <h2 style="margin: 0; font-size: 1.25rem; color: var(--text-primary);">${student.name}</h2>
        <div style="display: flex; gap: 8px; margin-top: 4px; align-items: center;">
          <span class="badge" style="background: ${planStyle.bg}; color: ${planStyle.color};">${student.plan || 'Sem plano'}</span>
          <span class="status-badge" style="color: ${student.active ? '#059669' : 'var(--red-600)'}; font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
            <span class="material-icons-round" style="font-size: 1rem;">${student.active ? 'check_circle' : 'cancel'}</span>
            ${student.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>
    </div>

    <div class="details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      ${timeRemainingHtml}
      <div class="detail-item">
        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">CPF</label>
        <div style="font-size: 0.9375rem; color: var(--text-primary);">${student.cpf || '—'}</div>
      </div>
      <div class="detail-item">
        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Telefone</label>
        <div style="font-size: 0.9375rem; color: var(--text-primary);">${student.phone || '—'}</div>
      </div>
      <div class="detail-item" style="grid-column: span 2;">
        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">E-mail</label>
        <div style="font-size: 0.9375rem; color: var(--text-primary);">${student.email || '—'}</div>
      </div>
      ${groupHtml}
      <div class="detail-item">
        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Data de Início</label>
        <div style="font-size: 0.9375rem; color: var(--text-primary);">${student.startDate ? new Date(student.startDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '—'}</div>
      </div>
      <div class="detail-item">
        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Cadastrado em</label>
        <div style="font-size: 0.9375rem; color: var(--text-primary);">${student.createdAt ? new Date(student.createdAt).toLocaleDateString('pt-BR') : '—'}</div>
      </div>
    </div>

    <!-- Student Documents Section -->
    <div style="border-top: 1px solid var(--gray-200); padding-top: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 1rem; margin: 0; color: var(--text-primary);">Documentos Anexados</h3>
        <button class="btn btn-sm btn-outline" id="btn-upload-doc" style="font-size: 0.75rem; padding: 6px 12px;">
          <span class="material-icons-round" style="font-size: 1rem;">upload_file</span> Anexar Arquivo
        </button>
        <input type="file" id="input-upload-doc" accept=".pdf,.doc,.docx,image/*" style="display: none;" />
      </div>

      <div id="student-docs-list" style="display: flex; flex-direction: column; gap: 8px;">
        ${docs.length === 0 ? '<p style="font-size: 0.875rem; color: var(--text-muted);">Nenhum documento anexado.</p>' : ''}
        ${docs.map(d => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: 6px;">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
              <span class="material-icons-round" style="color: var(--blue-500);">description</span>
              <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
                <span style="font-size: 0.875rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${d.fileName}">${d.fileName}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(d.uploadedAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-sm btn-ghost download-doc-btn" data-id="${d.id}" title="Baixar" style="padding: 4px; color: var(--blue-600);">
                <span class="material-icons-round" style="font-size: 1.25rem;">download</span>
              </button>
              <button class="btn btn-sm btn-ghost delete-doc-btn" data-id="${d.id}" title="Excluir" style="padding: 4px; color: var(--red-500);">
                <span class="material-icons-round" style="font-size: 1.25rem;">delete_outline</span>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const modal = showModal({
    title: 'Detalhes do Aluno',
    content,
    size: 'md',
    actions: [
      { label: 'Fechar', class: 'btn btn-secondary', onClick: () => closeModal() },
      { 
        label: 'Editar Aluno', 
        class: 'btn btn-outline', 
        icon: 'edit',
        onClick: () => {
          closeModal();
          setTimeout(() => showStudentModal(student), 300);
        }
      },
      {
        label: 'Renovar Contrato',
        class: 'btn btn-accent',
        icon: 'autorenew',
        onClick: () => {
          closeModal();
          setTimeout(() => showRenewalModal(student), 300);
        }
      }
    ]
  });

  // Docs Events
  const btnUpload = modal.querySelector('#btn-upload-doc');
  const inputUpload = modal.querySelector('#input-upload-doc');

  if (btnUpload && inputUpload) {
    btnUpload.addEventListener('click', () => inputUpload.click());
    
    inputUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await saveStudentDoc(student.id, file);
        showToast('Documento anexado!', 'success');
        closeModal();
        setTimeout(() => showStudentDetails(student), 300);
      } catch (err) {
        showToast('Erro ao anexar documento', 'error');
      }
    });
  }

  modal.querySelectorAll('.download-doc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const docId = parseInt(btn.dataset.id);
      const doc = docs.find(d => d.id === docId);
      if (doc && doc.fileData) {
        const url = URL.createObjectURL(doc.fileData);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    });
  });

  modal.querySelectorAll('.delete-doc-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const docId = parseInt(btn.dataset.id);
      showConfirm({
        title: 'Excluir Documento',
        message: 'Tem certeza que deseja remover este documento?',
        confirmLabel: 'Excluir',
        onConfirm: async () => {
          await deleteStudentDoc(docId);
          showToast('Documento removido', 'success');
          closeModal();
          setTimeout(() => showStudentDetails(student), 300);
        }
      });
    });
  });
}

/**
 * Renewal Modal - Renovar contrato de um aluno
 */
async function showRenewalModal(student) {
  const contracts = await getContracts();
  const plans = ['Anual', 'Semestral', 'Dupla', 'Grupo'];
  const today = new Date().toISOString().split('T')[0];

  if (contracts.length === 0) {
    showToast('Nenhum template de contrato disponível. Envie um na Biblioteca.', 'error');
    return;
  }

  const content = document.createElement('div');
  content.innerHTML = `
    <!-- Student Info (read-only) -->
    <div class="renewal-student-card">
      <div class="student-info" style="gap: 16px;">
        <div class="student-avatar" style="background: linear-gradient(135deg, var(--blue-400), var(--blue-600)); width: 48px; height: 48px; font-size: 1.125rem;">
          ${student.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <span class="student-name" style="font-size: 1.0625rem;">${student.name}</span>
          <span class="student-email">${student.cpf || ''} ${student.email ? '• ' + student.email : ''}</span>
        </div>
      </div>
    </div>

    <!-- Template Selection -->
    <div class="form-group mb-4">
      <label class="form-label">Template do Contrato *</label>
      <select class="form-select" id="renewal-template">
        <option value="">Selecione o template...</option>
        ${contracts.map(c => `<option value="${c.id}">${c.name} (${c.category})</option>`).join('')}
      </select>
    </div>

    <!-- Plan Change -->
    <div class="form-group mb-4">
      <label class="form-label">Plano de Renovação</label>
      <div class="plan-selector" id="renewal-plan-selector">
        ${plans.map(p => `
          <button class="plan-option ${student.plan === p ? 'selected' : ''}" data-plan="${p}" type="button">
            ${p}
          </button>
        `).join('')}
      </div>
      <input type="hidden" id="renewal-plan" value="${student.plan || ''}" />
    </div>

    <!-- Dates & Value -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap: 16px;" class="mb-4">
      <div class="form-group">
        <label class="form-label">Nova Data de Início</label>
        <input type="date" class="form-input" id="renewal-start" value="${today}" />
      </div>
      <div class="form-group">
        <label class="form-label">Data de Término</label>
        <input type="date" class="form-input" id="renewal-end" value="" />
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap: 16px;" class="mb-4">
      <div class="form-group">
        <label class="form-label">Valor</label>
        <input type="text" class="form-input" id="renewal-value" placeholder="R$ 0,00" />
      </div>
      <div class="form-group">
        <label class="form-label">Valor por Extenso</label>
        <input type="text" class="form-input" id="renewal-value-ext" placeholder="mil e quinhentos reais" />
      </div>
    </div>

    <div class="form-group mb-4">
      <label class="form-label">Duração</label>
      <input type="text" class="form-input" id="renewal-duration" placeholder="Ex: 12 meses" />
    </div>

    <!-- Output -->
    <div class="form-group">
      <label class="form-label">Nome do Arquivo</label>
      <div class="filename-input-group">
        <input type="text" class="form-input" id="renewal-filename" 
          value="renovacao_${student.name.replace(/\s+/g, '_').toLowerCase()}" 
          placeholder="nome_do_arquivo" />
        <span class="file-ext">.docx</span>
      </div>
    </div>
  `;

  const modal = showModal({
    title: '🔄 Renovar Contrato',
    content,
    size: 'lg',
    actions: [
      { label: 'Cancelar', class: 'btn btn-secondary', onClick: () => closeModal() },
      {
        label: 'Gerar Renovação',
        class: 'btn btn-accent',
        icon: 'autorenew',
        onClick: async (m) => {
          const templateId = parseInt(m.querySelector('#renewal-template').value);
          if (!templateId) {
            showToast('Selecione um template de contrato', 'error');
            return;
          }

          const selectedContract = contracts.find(c => c.id === templateId);
          if (!selectedContract || !selectedContract.fileData) {
            showToast('Template não encontrado', 'error');
            return;
          }

          // Build replacement data from student info
          const data = {
            CONTRATADO_NOME: student.name,
            CONTRATADO_CPF: student.cpf || '',
            CONTRATADO_RG: student.rg || '',
            CONTRATADO_ENDERECO: student.address || '',
            CONTRATADO_CIDADE: student.city || '',
            CONTRATADO_ESTADO: student.state || '',
            CONTRATADO_CEP: student.cep || '',
            CONTRATADO_EMAIL: student.email || '',
            CONTRATADO_TELEFONE: student.phone || '',
            CONTRATADO_NACIONALIDADE: student.nationality || '',
            CONTRATADO_ESTADO_CIVIL: student.civilStatus || '',
            CONTRATADO_PROFISSAO: student.profession || '',
            PLANO: m.querySelector('#renewal-plan').value || student.plan || '',
            VALOR: m.querySelector('#renewal-value').value || '',
            VALOR_EXTENSO: m.querySelector('#renewal-value-ext').value || '',
            DATA_INICIO: m.querySelector('#renewal-start').value || '',
            DATA_FIM: m.querySelector('#renewal-end').value || '',
            DURACAO: m.querySelector('#renewal-duration').value || '',
          };

          // Remove empty values to keep original template text
          Object.keys(data).forEach(key => {
            if (!data[key]) delete data[key];
          });

          const filename = m.querySelector('#renewal-filename').value || 'renovacao';
          const outputName = filename.endsWith('.docx') ? filename : `${filename}.docx`;

          // Update student plan if changed
          const newPlan = m.querySelector('#renewal-plan').value;
          const newStart = m.querySelector('#renewal-start').value;
          if (newPlan && newPlan !== student.plan) {
            await updateStudent(student.id, { plan: newPlan, startDate: newStart || student.startDate, active: true });
          } else if (newStart) {
            await updateStudent(student.id, { startDate: newStart, active: true });
          }

          try {
            await generateDocx(selectedContract.fileData, data, outputName);
            showToast('Contrato de renovação gerado com sucesso!', 'success');
            closeModal();
            const pageContent = document.getElementById('page-content');
            renderStudentsPage(pageContent);
          } catch (e) {
            console.error('Renewal error:', e);
            showToast('Erro ao gerar: ' + e.message, 'error');
          }
        }
      }
    ]
  });

  // Bind plan selector in modal
  modal.querySelectorAll('#renewal-plan-selector .plan-option').forEach(opt => {
    opt.addEventListener('click', () => {
      modal.querySelectorAll('#renewal-plan-selector .plan-option').forEach(o => {
        o.classList.remove('selected');
        o.style.cssText = '';
      });
      opt.classList.add('selected');
      modal.querySelector('#renewal-plan').value = opt.dataset.plan;
    });
  });
}

function bindStudentEvents(container) {
  // Add student
  container.querySelector('#btn-add-student')?.addEventListener('click', () => showStudentModal());

  // Search
  container.querySelector('#student-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    // Debounce
    clearTimeout(window._searchTimeout);
    window._searchTimeout = setTimeout(() => {
      const pageContent = document.getElementById('page-content');
      renderStudentsPage(pageContent);
    }, 300);
  });

  // Status filters
  container.querySelectorAll('[data-status]').forEach(chip => {
    chip.addEventListener('click', () => {
      statusFilter = chip.dataset.status;
      const pageContent = document.getElementById('page-content');
      renderStudentsPage(pageContent);
    });
  });

  // Stat card filters
  container.querySelectorAll('[data-filter]').forEach(card => {
    card.addEventListener('click', () => {
      statusFilter = card.dataset.filter;
      const pageContent = document.getElementById('page-content');
      renderStudentsPage(pageContent);
    });
  });

  // Status toggle
  container.querySelectorAll('.status-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const currentActive = btn.dataset.active === 'true';
      showConfirm({
        title: 'Alterar Status',
        message: `Deseja marcar este aluno como ${!currentActive ? 'ativo' : 'inativo'}?`,
        confirmLabel: 'Confirmar',
        onConfirm: async () => {
          await updateStudent(id, { active: !currentActive });
          showToast(`Aluno ${!currentActive ? 'ativado' : 'inativado'}`, 'success');
          const pageContent = document.getElementById('page-content');
          renderStudentsPage(pageContent);
        }
      });
    });
  });

  // Edit
  container.querySelectorAll('.edit-student-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const students = await getStudents();
      const student = students.find(s => s.id === id);
      if (student) showStudentModal(student);
    });
  });

  // Renewal
  container.querySelectorAll('.renew-student-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const students = await getStudents();
      const student = students.find(s => s.id === id);
      if (student) showRenewalModal(student);
    });
  });

  // Certificate
  container.querySelectorAll('.cert-student-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const students = await getStudents();
      const student = students.find(s => s.id === id);
      if (student) showCertificateModal(student);
    });
  });

  // View Details
  container.querySelectorAll('.view-student-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const students = await getStudents();
      const student = students.find(s => s.id === id);
      if (student) showStudentDetails(student);
    });
  });

  // Delete
  container.querySelectorAll('.delete-student-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const students = await getStudents();
      const student = students.find(s => s.id === id);
      if (!student) return;
      showConfirm({
        title: 'Excluir Aluno',
        message: `Deseja excluir o aluno <strong>"${student.name}"</strong>?`,
        confirmLabel: 'Excluir',
        onConfirm: async () => {
          await deleteStudent(id);
          showToast('Aluno excluído', 'success');
          const pageContent = document.getElementById('page-content');
          renderStudentsPage(pageContent);
        }
      });
    });
  });
}

/**
 * Sincroniza bidirecionalmente os membros do grupo e atualiza o plano se necessário.
 */
async function syncGroupMembers(primaryId, selectedIds, plan) {
  if (!selectedIds || selectedIds.length === 0) return;
  const allStudents = await getStudents();
  const pIdStr = primaryId.toString();
  
  for (let sIdStr of selectedIds) {
    let s = allStudents.find(x => x.id.toString() === sIdStr);
    if (!s) continue;
    
    let updated = false;
    let newMembers = s.groupMembers || [];
    
    // Add primary if missing
    if (!newMembers.includes(pIdStr)) {
      newMembers.push(pIdStr);
      updated = true;
    }
    
    // Add other selected members
    for (let otherId of selectedIds) {
      if (otherId !== sIdStr && !newMembers.includes(otherId)) {
        newMembers.push(otherId);
        updated = true;
      }
    }
    
    let sPlan = s.plan;
    if (sPlan !== plan && (plan === 'Dupla' || plan === 'Grupo')) {
      sPlan = plan;
      updated = true;
    }
    
    if (newMembers.length >= 2 && sPlan === 'Dupla') {
      sPlan = 'Grupo';
      updated = true;
    }
    
    if (updated) {
      await updateStudent(s.id, { ...s, groupMembers: newMembers, plan: sPlan });
    }
  }
}

function showCertificateModal(student) {
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="margin-bottom: 24px; text-align: center;">
      <span class="material-icons-round" style="font-size: 3rem; color: #F59E0B; margin-bottom: 8px;">workspace_premium</span>
      <h3 style="margin: 0;">Emitir Certificado</h3>
      <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 4px;">Gerando para: <strong>${student.name}</strong></p>
    </div>

    <div class="form-group mb-4">
      <label class="form-label">Template do Certificado (.pdf) *</label>
      <input type="file" id="cert-pdf-input" accept=".pdf" class="form-input" />
      <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: block;">Envie o design base do certificado. O nome do aluno será centralizado.</span>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div class="form-group">
        <label class="form-label">Tamanho da Fonte</label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="range" id="cert-font-size" min="16" max="120" value="48" style="flex: 1;" />
          <span id="cert-font-size-val" style="width: 32px; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums;">48</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Ajuste Vertical (Y offset)</label>
         <div style="display: flex; gap: 8px; align-items: center;">
          <input type="range" id="cert-y-offset" min="-400" max="400" value="0" style="flex: 1;" />
          <span id="cert-y-offset-val" style="width: 32px; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums;">0</span>
        </div>
      </div>
    </div>
    <div class="form-group mb-4">
       <label class="form-label">Cor do Texto (Hex)</label>
       <input type="color" id="cert-color" value="#000000" style="height: 44px; width: 100%; border-radius: 8px; padding: 4px; border: 1px solid var(--gray-200); cursor: pointer;" />
    </div>
  `;

  const modal = showModal({
    title: 'Emitir Certificado',
    content,
    size: 'md',
    actions: [
      { label: 'Cancelar', class: 'btn btn-secondary', onClick: () => closeModal() },
      { 
        label: 'Baixar Documento', 
        class: 'btn btn-primary', 
        icon: 'download',
        onClick: async (m) => {
          const fileInput = m.querySelector('#cert-pdf-input');
          const file = fileInput.files[0];
          if (!file) {
            showToast('Selecione um arquivo PDF como template', 'error');
            return;
          }

          const fontSize = m.querySelector('#cert-font-size').value;
          const verticalOffset = m.querySelector('#cert-y-offset').value;
          const colorHex = m.querySelector('#cert-color').value;

          const r = parseInt(colorHex.slice(1, 3), 16);
          const g = parseInt(colorHex.slice(3, 5), 16);
          const b = parseInt(colorHex.slice(5, 7), 16);

          try {
            await generateCertificate(file, student.name, {
              fontSize: parseInt(fontSize),
              verticalOffset: parseInt(verticalOffset),
              colorRgb: [r, g, b]
            });
            showToast('Certificado gerado com sucesso!', 'success');
            closeModal();
          } catch (e) {
            console.error(e);
            showToast('Erro ao gerar certificado: ' + e.message, 'error');
          }
        }
      }
    ]
  });

  const rangeFont = modal.querySelector('#cert-font-size');
  const valFont = modal.querySelector('#cert-font-size-val');
  rangeFont.addEventListener('input', e => valFont.textContent = e.target.value);

  const rangeY = modal.querySelector('#cert-y-offset');
  const valY = modal.querySelector('#cert-y-offset-val');
  rangeY.addEventListener('input', e => valY.textContent = e.target.value);
}
