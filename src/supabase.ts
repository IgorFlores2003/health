import { createClient } from "@supabase/supabase-js";
const env = import.meta.env;
export const supabase =
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY
    ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
    : null;

/** Aviso das funções de IA sem internet (o resto do app funciona offline). */
export const AI_OFFLINE =
  "Sem conexão: a IA precisa de internet. Você pode preencher à mão; tudo fica salvo no aparelho.";
