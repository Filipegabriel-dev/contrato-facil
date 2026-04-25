import { supabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

// ============================================
// HELPER: GET CURRENT USER ID
// ============================================
async function getUserId() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado.');
  return user.id;
}

// ============================================
// STUDENT FUNCTIONS
// ============================================

export async function saveStudent(student) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('students')
    .insert([{ 
      user_id: userId,
      name: student.name,
      cpf: student.cpf || null,
      plan: student.plan || null,
      active: student.active !== undefined ? student.active : true
    }])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
}

export async function updateStudent(id, updates) {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteStudent(id) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
}

export async function getStudentStats() {
  const all = await getStudents();
  const active = all.filter(s => s.active).length;
  return {
    total: all.length,
    active,
    inactive: all.length - active
  };
}

// ============================================
// STUDENT DOCUMENTS FUNCTIONS
// ============================================

export async function saveStudentDoc(studentId, file) {
  const userId = await getUserId();
  const filePath = `${userId}/students/${studentId}/${Date.now()}_${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from('contract-files')
    .upload(filePath, file);
    
  if (uploadError) throw uploadError;
  return { filePath };
}

export async function getStudentDocs(studentId) {
  // Simplificação temporária: listar os arquivos do diretório no storage
  const userId = await getUserId();
  const { data, error } = await supabase.storage
    .from('contract-files')
    .list(`${userId}/students/${studentId}`);
    
  if (error) return [];
  return data.map(f => ({
    id: f.id,
    fileName: f.name,
    filePath: `${userId}/students/${studentId}/${f.name}`,
    created_at: f.created_at
  }));
}

export async function deleteStudentDoc(filePath) {
  const { error } = await supabase.storage
    .from('contract-files')
    .remove([filePath]);
  if (error) throw error;
  return true;
}

// ============================================
// CONTRACT FUNCTIONS
// ============================================

export async function saveContract(contract) {
  const userId = await getUserId();
  
  // Upload file to storage
  const fileExt = contract.fileData.name ? contract.fileData.name.split('.').pop() : 'docx';
  const filePath = `${userId}/templates/${Date.now()}_template.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('contract-files')
    .upload(filePath, contract.fileData);
    
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('contracts')
    .insert([{
      user_id: userId,
      name: contract.name,
      category: contract.category,
      placeholders: contract.placeholders || [],
      file_path: filePath
    }])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getContracts(category = null) {
  let query = supabase.from('contracts').select('*').order('created_at', { ascending: false });
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getContract(id) {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  
  // Download the file data to maintain compatibility with generator
  if (data && data.file_path) {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('contract-files')
      .download(data.file_path);
      
    if (!downloadError && fileBlob) {
      data.fileData = fileBlob;
    }
  }
  
  return data;
}

export async function updateContract(id, updates) {
  const { data, error } = await supabase
    .from('contracts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteContract(id) {
  const contract = await getContract(id);
  
  // Delete from DB
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) throw error;
  
  // Delete file from storage
  if (contract && contract.file_path) {
    await supabase.storage.from('contract-files').remove([contract.file_path]);
  }
  
  return true;
}

export async function getCategories() {
  const contracts = await getContracts();
  const cats = [...new Set(contracts.map(c => c.category).filter(Boolean))];
  return cats.sort();
}

export async function getCategoryCounts() {
  const contracts = await getContracts();
  const counts = {};
  contracts.forEach(c => {
    const cat = c.category || 'Sem categoria';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return counts;
}

// ============================================
// GENERATION HISTORY FUNCTIONS
// ============================================

export async function saveToHistory(record) {
  const userId = await getUserId();
  
  let docxPath = null;
  let pdfPath = null;
  
  // Upload generated files if they exist
  if (record.docxBlob) {
    docxPath = `${userId}/history/${Date.now()}_${record.filename}`;
    await supabase.storage.from('contract-files').upload(docxPath, record.docxBlob);
  }
  if (record.pdfBlob) {
    pdfPath = `${userId}/history/${Date.now()}_${record.filename.replace('.docx', '.pdf')}`;
    await supabase.storage.from('contract-files').upload(pdfPath, record.pdfBlob);
  }

  const { data, error } = await supabase
    .from('generation_history')
    .insert([{
      user_id: userId,
      filename: record.filename,
      student_name: record.studentName,
      template_name: record.templateName,
      template_id: record.templateId,
      data: record.data || {},
      docx_path: docxPath,
      pdf_path: pdfPath
    }])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getGenerationHistory() {
  try {
    await cleanupHistory();
  } catch (e) {
    console.warn('Cleanup failed:', e);
  }
  
  const { data, error } = await supabase
    .from('generation_history')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  
  // Map back to expected format
  return (data || []).map(r => ({
    ...r,
    studentName: r.student_name,
    templateName: r.template_name,
    templateId: r.template_id
  }));
}

export async function deleteFromHistory(id) {
  const { data, error: fetchError } = await supabase
    .from('generation_history')
    .select('*')
    .eq('id', id)
    .single();
    
  if (!fetchError && data) {
    const filesToRemove = [];
    if (data.docx_path) filesToRemove.push(data.docx_path);
    if (data.pdf_path) filesToRemove.push(data.pdf_path);
    if (filesToRemove.length > 0) {
      await supabase.storage.from('contract-files').remove(filesToRemove);
    }
  }

  const { error } = await supabase.from('generation_history').delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function cleanupHistory() {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  
  const { data, error } = await supabase
    .from('generation_history')
    .select('id, docx_path, pdf_path')
    .lt('created_at', fifteenDaysAgo.toISOString());
    
  if (error || !data || data.length === 0) return;
  
  const ids = data.map(r => r.id);
  const filesToRemove = [];
  data.forEach(r => {
    if (r.docx_path) filesToRemove.push(r.docx_path);
    if (r.pdf_path) filesToRemove.push(r.pdf_path);
  });
  
  if (filesToRemove.length > 0) {
    await supabase.storage.from('contract-files').remove(filesToRemove);
  }
  
  if (ids.length > 0) {
    await supabase.from('generation_history').delete().in('id', ids);
  }
}
