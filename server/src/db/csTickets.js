// cs_tickets 테이블 저장·수정 — 에스컬레이션 발생 시 대화 전체를 기록
const { createClient } = require('@supabase/supabase-js');

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * 에스컬레이션 발생 시 티켓을 저장한다.
 * @returns {string|null} 생성된 티켓 id (저장 실패 시 null)
 */
async function saveTicket({ userId, issueType, messages, reason }) {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('cs_tickets')
    .insert({
      user_id:      userId    || null,
      issue_type:   issueType || 'other',
      messages:     messages,
      escalated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[csTickets] 저장 실패:', error.message);
    return null;
  }
  return data.id;
}

/**
 * 티켓에 이메일을 추가한다 (에스컬레이션 후 비로그인 유저가 이메일 입력 시).
 */
async function updateTicketEmail(ticketId, userEmail) {
  const supabase = getClient();
  if (!supabase || !ticketId) return;

  const { error } = await supabase
    .from('cs_tickets')
    .update({ user_email: userEmail })
    .eq('id', ticketId);

  if (error) console.error('[csTickets] 이메일 업데이트 실패:', error.message);
}

module.exports = { saveTicket, updateTicketEmail };
