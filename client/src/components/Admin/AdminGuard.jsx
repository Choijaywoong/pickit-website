// 관리자 전용 라우트 보호 컴포넌트 — 세션·role 미충족 시 /admin/login으로 리다이렉트
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../supabase';

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'redirect'

  useEffect(() => {
    async function check() {
      if (!supabase) { setStatus('redirect'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus('redirect'); return; }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || data?.role !== 'admin') { setStatus('redirect'); return; }

      setStatus('ok');
    }
    check();
  }, []);

  if (status === 'checking') return null;
  if (status === 'redirect') return <Navigate to="/admin/login" replace />;
  return children;
}
