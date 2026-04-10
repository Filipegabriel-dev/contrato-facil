import Dexie from 'dexie';

const db = new Dexie('ContractGenDB');

db.version(1).stores({
  contracts: '++id, name, category, createdAt'
});

db.version(2).stores({
  contracts: '++id, name, category, createdAt',
  students: '++id, name, cpf, plan, active, createdAt'
});

db.version(4).stores({
  contracts: '++id, name, category, createdAt',
  students: '++id, name, cpf, plan, active, createdAt',
  studentDocs: '++id, studentId',
  generationHistory: '++id, filename, studentName, templateName, createdAt'
});

// ============================================
// STUDENT FUNCTIONS
// ============================================

/**
 * Save a new student
 */
export async function saveStudent(student) {
  return await db.students.add({
    ...student,
    active: student.active !== undefined ? student.active : true,
    createdAt: new Date().toISOString()
  });
}

/**
 * Get all students
 */
export async function getStudents() {
  return await db.students.reverse().sortBy('createdAt');
}

/**
 * Update a student
 */
export async function updateStudent(id, updates) {
  return await db.students.update(id, updates);
}

/**
 * Delete a student
 */
export async function deleteStudent(id) {
  return await db.students.delete(id);
}

/**
 * Get student stats: total, active, inactive
 */
export async function getStudentStats() {
  const all = await db.students.toArray();
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
  return await db.studentDocs.add({
    studentId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    fileData: file,
    uploadedAt: new Date().toISOString()
  });
}

export async function getStudentDocs(studentId) {
  return await db.studentDocs.where('studentId').equals(studentId).toArray();
}

export async function deleteStudentDoc(id) {
  return await db.studentDocs.delete(id);
}

// ============================================
// CONTRACT FUNCTIONS
// ============================================

/**
 * Save a contract template to IndexedDB
 * @param {Object} contract - { name, category, fileData (Blob), placeholders[], textPreview }
 */
export async function saveContract(contract) {
  return await db.contracts.add({
    ...contract,
    createdAt: new Date().toISOString()
  });
}

/**
 * Get all contracts, optionally filtered by category
 */
export async function getContracts(category = null) {
  if (category && category !== 'all') {
    return await db.contracts.where('category').equals(category).reverse().sortBy('createdAt');
  }
  return await db.contracts.reverse().sortBy('createdAt');
}

/**
 * Get a single contract by ID
 */
export async function getContract(id) {
  return await db.contracts.get(id);
}

/**
 * Update a contract
 */
export async function updateContract(id, updates) {
  return await db.contracts.update(id, updates);
}

/**
 * Delete a contract
 */
export async function deleteContract(id) {
  return await db.contracts.delete(id);
}

/**
 * Get all unique categories
 */
export async function getCategories() {
  const contracts = await db.contracts.toArray();
  const cats = [...new Set(contracts.map(c => c.category).filter(Boolean))];
  return cats.sort();
}

/**
 * Count contracts per category
 */
export async function getCategoryCounts() {
  const contracts = await db.contracts.toArray();
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

/**
 * Save a generated document record to history
 * @param {Object} record - { filename, studentName, templateName, docxBlob, pdfBlob, data }
 */
export async function saveToHistory(record) {
  return await db.generationHistory.add({
    ...record,
    createdAt: new Date().toISOString()
  });
}

/**
 * Get all history records, most recent first.
 * Triggers automatic cleanup of records older than 15 days.
 */
export async function getGenerationHistory() {
  try {
    await cleanupHistory();
  } catch (e) {
    console.warn('Cleanup failed:', e);
  }
  return await db.generationHistory.reverse().sortBy('createdAt');
}

/**
 * Delete a specific history record
 */
export async function deleteFromHistory(id) {
  return await db.generationHistory.delete(id);
}

/**
 * Automatically delete records older than 15 days
 */
async function cleanupHistory() {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const isoDate = fifteenDaysAgo.toISOString();
  
  const oldRecords = await db.generationHistory
    .where('createdAt')
    .below(isoDate)
    .toArray();
    
  if (oldRecords.length > 0) {
    const ids = oldRecords.map(r => r.id);
    await db.generationHistory.bulkDelete(ids);
  }
}

export default db;
