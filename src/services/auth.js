/**
 * Supabase Authentication System
 */

import { supabase } from './supabase.js';

let currentUser = null;

/**
 * Escuta mudanças no estado de autenticação
 */
export function onAuthStateChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    callback(currentUser, event);
  });
}

/**
 * Retorna se a sessão atual está destravada
 */
export function isUnlocked() {
  return currentUser !== null;
}

/**
 * Login com o Google (OAuth)
 */
export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return data;
}

/**
 * Login alternativo com E-mail e Senha
 */
export async function loginWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

/**
 * Cadastro com E-mail e Senha
 */
export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return data;
}

/**
 * Bloqueia / Desloga o sistema
 */
export async function lock() {
  await supabase.auth.signOut();
  currentUser = null;
}

/**
 * Pega o usuário atual
 */
export async function getCurrentUser() {
  if (currentUser) return currentUser;
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  return currentUser;
}

