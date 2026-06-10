// 온보딩 4단계: 채널별 API 키 연결
// 채널 서브 스텝(브레드크럼) + 메인 ProgressBar(채널 진행에 따라 점진 증가)
// 의류 3사(무신사·에이블리·지그재그): API 미확정 → "준비 중" UI (TODO)
import { Fragment, useState } from 'react';
import { authFetch } from '../../auth';
import styles from './StepApiKeys.module.css';
import { useLanguage } from '../../i18n';
import Logo from '../Logo';
import ProgressBar from '../ProgressBar';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const CHANNEL_CONFIG = {
  coupang: {
    label: '쿠팡',
    desc: '쿠팡 Wing > 내 정보 > API 관리에서 발급',
    link: 'https://wing.coupang.com',
    linkText: '쿠팡 Wing 바로가기',
    fields: [
      { key: 'COUPANG_VENDOR_ID',  label: 'Vendor ID',  type: 'text',     hint: '공급사 ID (A로 시작)' },
      { key: 'COUPANG_ACCESS_KEY', label: 'Access Key', type: 'text',     hint: 'API 관리에서 발급' },
      { key: 'COUPANG_SECRET_KEY', label: 'Secret Key', type: 'password', hint: 'Access Key와 함께 발급' },
    ],
  },
  naver: {
    label: '네이버 스마트스토어',
    desc: 'NCP Commerce API 신청 후 발급 (Application ID + Secret)',
    link: 'https://apicenter.commerce.naver.com',
    linkText: 'NCP Commerce API 신청',
    fields: [
      { key: 'NAVER_CLIENT_ID',     label: 'Application ID', type: 'text',     hint: 'NCP Commerce API' },
      { key: 'NAVER_CLIENT_SECRET', label: 'Secret',         type: 'password', hint: 'Application ID와 함께 발급' },
    ],
  },
  cafe24: {
    label: '카페24',
    desc: 'Mall ID 입력 후 OAuth 인증 버튼을 눌러 연결하세요',
    link: 'https://developers.cafe24.com',
    linkText: '카페24 개발자센터',
    isOAuth: true,
    fields: [
      { key: 'CAFE24_MALL_ID', label: 'Mall ID', type: 'text', hint: '예: myshop.cafe24.com → myshop' },
    ],
  },
  // TODO: 무신사 API 연동 방식 확정 후 fields 구현 (현재 파트너센터 제휴 확인 중)
  musinsa: {
    label: '무신사',
    desc: '무신사 파트너센터 API 연동 준비 중',
    link: 'https://partner.musinsa.com',
    linkText: '무신사 파트너센터',
    status: 'pending',
    fields: [],
  },
  // TODO: 에이블리 API 연동 방식 확정 후 fields 구현 (셀러스 입점 타입 전용)
  ably: {
    label: '에이블리',
    desc: '에이블리 파트너센터 API 연동 준비 중',
    link: 'https://sellers.a-bly.com',
    linkText: '에이블리 셀러스센터',
    status: 'pending',
    fields: [],
  },
  // TODO: 지그재그 API 연동 방식 확정 후 fields 구현
  zigzag: {
    label: '지그재그',
    desc: '지그재그 파트너센터 API 연동 준비 중',
    link: 'https://partner.zigzag.kr',
    linkText: '지그재그 파트너센터',
    status: 'pending',
    fields: [],
  },
};

export default function StepApiKeys({ channels, totalSteps, onComplete, onBack }) {
  const { t } = useLanguage();
  const [idx,          setIdx]          = useState(0);
  const [values,       setValues]       = useState({});
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [testStatus,   setTestStatus]   = useState(null); // null | 'testing' | 'ok' | { error }
  const [connectedSet, setConnectedSet] = useState(new Set());

  const total   = channels.length;
  const chId    = channels[idx];
  const config  = CHANNEL_CONFIG[chId];
  const isPending = config?.status === 'pending';

  // ProgressBar progress 계산:
  // 마지막 단계 진입 시 (totalSteps-1)/totalSteps 에서 출발, 채널 완료마다 점진 증가
  const baseProgress = Math.round((totalSteps - 1) / totalSteps * 100);
  const channelProgress = Math.round(baseProgress + (idx / total) * (100 - baseProgress));

  function handleChange(key, value) {
    setValues(prev => ({ ...prev, [key]: value }));
    setError('');
  }

  function goNext() {
    if (idx + 1 >= total) {
      onComplete(Array.from(connectedSet));
    } else {
      setIdx(i => i + 1);
      setValues({});
      setError('');
      setTestStatus(null);
    }
  }

  async function runConnectionTest(platform) {
    setTestStatus('testing');
    try {
      const res  = await authFetch(`${API_BASE}/settings/test-connection`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (data.ok) {
        setConnectedSet(prev => new Set([...prev, platform]));
        setTestStatus('ok');
      } else {
        setTestStatus({ error: data.reason || '연결 실패' });
      }
    } catch {
      setTestStatus({ error: '연결 테스트 중 오류가 발생했습니다.' });
    }
  }

  async function handleSave() {
    const toSave = {};
    config.fields.forEach(({ key }) => {
      if (values[key]?.trim()) toSave[key] = values[key].trim();
    });
    if (Object.keys(toSave).length === 0) {
      setError('저장할 값을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError('');
    setTestStatus(null);
    try {
      const res  = await authFetch(`${API_BASE}/settings/credentials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '저장 실패');
      if (!config.isOAuth) runConnectionTest(chId);
    } catch (err) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function handleOAuth() {
    // TODO: 실제 OAuth 플로우 — Mall ID 저장 완료 후 리다이렉트
    const mallId = values['CAFE24_MALL_ID']?.trim();
    if (!mallId) { setError('Mall ID를 먼저 입력해 주세요.'); return; }
    window.open(`${API_BASE}/oauth/cafe24/start?mallId=${encodeURIComponent(mallId)}`, '_blank');
  }

  if (!config) return null;

  const isLastChannel  = idx + 1 >= total;
  const saveLabel = saving
    ? t('ob3Saving')
    : testStatus === 'ok'
    ? (isLastChannel ? t('ob3DoneBtn') : '다음 채널 →')
    : (isLastChannel ? t('ob3DoneBtn') : t('ob3SaveBtn'));

  return (
    <div className={styles.container}>
      <div className={styles.main}>

        {/* 뒤로가기 */}
        {(idx === 0 ? onBack : true) && (
          <button
            className={styles.backBtn}
            onClick={idx === 0 ? onBack : () => { setIdx(i => i - 1); setValues({}); setError(''); setTestStatus(null); }}
            title="이전 단계"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 5L7.5 10l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* 로고 */}
        <div className={styles.logo}>
          <Logo size="md" />
        </div>

        {/* 메인 진행바 */}
        <div className={styles.progressWrap}>
          <ProgressBar
            step={totalSteps}
            totalSteps={totalSteps}
            stepName="API 연결 (마지막)"
            progress={channelProgress}
          />
        </div>

        {/* 채널 서브 스텝 브레드크럼 */}
        <div className={styles.subStep}>
          {channels.map((id, i) => (
            <Fragment key={id}>
              {i > 0 && <span className={styles.subStepArrow}>→</span>}
              <span className={i === idx ? styles.subStepCurrent : styles.subStepOther}>
                {CHANNEL_CONFIG[id]?.label}
              </span>
            </Fragment>
          ))}
          <span className={styles.subStepCount}>{idx + 1} / {total}</span>
        </div>

        {/* 채널 헤더 */}
        <div className={styles.channelHeader}>
          <h1 className={styles.channelName}>{config.label}</h1>
          <p className={styles.channelDesc}>{config.desc}</p>
          {config.link && (
            <a className={styles.channelLink} href={config.link} target="_blank" rel="noopener noreferrer">
              {config.linkText} →
            </a>
          )}
        </div>

        {/* 폼 영역 */}
        {isPending ? (
          <div className={styles.pendingNotice}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p className={styles.pendingTitle}>API 연동 준비 중</p>
              <p className={styles.pendingDesc}>현재 파트너 확인 중입니다. 채팅 화면 → 설정에서 연결을 완료할 수 있어요.</p>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.fields}>
              {config.fields.map(({ key, label, type, hint }) => (
                <div key={key} className={styles.fieldRow}>
                  <label className={styles.fieldLabel}>{label}</label>
                  <input
                    className={styles.fieldInput}
                    type={type}
                    placeholder={hint}
                    value={values[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            {/* 카페24 OAuth 버튼 */}
            {config.isOAuth && (
              <button className={styles.oauthBtn} onClick={handleOAuth}>
                카페24 OAuth 인증하기 →
              </button>
            )}
          </>
        )}

        {/* 보안 안내 */}
        {!isPending && (
          <div className={styles.securityNote}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            입력한 키는 암호화되어 안전하게 보관되며, 화면에 다시 표시되지 않아요
          </div>
        )}

        {/* 연결 테스트 결과 */}
        {testStatus === 'testing' && <div className={styles.testStatus}>⏳ 연결 확인 중...</div>}
        {testStatus === 'ok'      && <div className={`${styles.testStatus} ${styles.testOk}`}>✓ 연결됨</div>}
        {testStatus?.error        && <div className={`${styles.testStatus} ${styles.testFail}`}>✗ {testStatus.error}</div>}

        {/* 에러 */}
        {error && <p className={styles.errorMsg}>{error}</p>}

        {/* 액션 버튼 */}
        <div className={styles.actions}>
          <button className={styles.skipBtn} onClick={goNext} disabled={saving}>
            {t('ob3SkipBtn')}
          </button>
          {!isPending && (
            <button
              className={styles.saveBtn}
              onClick={testStatus === 'ok' ? goNext : handleSave}
              disabled={saving || testStatus === 'testing'}
            >
              {saveLabel}
            </button>
          )}
        </div>

        <p className={styles.skipHint}>{t('ob3SkipHint')}</p>

      </div>
    </div>
  );
}
