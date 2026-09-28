import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[CONFIG] Variables de entorno requeridas no encontradas: VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Configure su archivo .env o las variables de despliegue.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export { supabaseUrl };
