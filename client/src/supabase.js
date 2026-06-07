import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL  || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase 미설정 시 null — 앱은 인증 없이 동작 (개발 모드)
export const supabase = url && key ? createClient(url, key) : null;
