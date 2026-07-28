import { createClient } from '@supabase/supabase-js';

// Lê variáveis de ambiente do Vite se configuradas ou usa fallback para ambiente local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nedtuebadqcoqmbirpna.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_u6se390d7Q6L-Da7IWUSfA_eOenCoNi';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function loginComGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) {
    throw error;
  }
  return data;
}
