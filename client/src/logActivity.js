// 사용자 행동을 activity_log에 기록하는 헬퍼 — 실패해도 앱에 영향 없음
import { supabase } from './supabase';

export async function logActivity(action, metadata = null) {
  if (!supabase) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('activity_log').insert({
      user_id:  session.user.id,
      action,
      metadata: metadata ?? undefined,
    });
  } catch {}
}
