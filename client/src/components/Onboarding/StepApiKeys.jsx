import { useState } from 'react';
import { authFetch } from '../../auth';
import styles from './StepApiKeys.module.css';
import { useLanguage } from '../../i18n';
import WeaveLogo from '../WeaveLogo';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const CHANNEL_CONFIG = {
  coupang: {
    label: '쿠팡', color: '#E50029',
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
    label: '네이버 스마트스토어', color: '#03C75A',
    desc: 'NCP Commerce API 신청 후 발급 (Client ID + Secret)',
    link: 'https://apicenter.commerce.naver.com',
    linkText: 'NCP Commerce API 신청',
    fields: [
      { key: 'NAVER_CLIENT_ID',     label: 'Client ID',     type: 'text',     hint: 'NCP Commerce API' },
      { key: 'NAVER_CLIENT_SECRET', label: 'Client Secret', type: 'password', hint: 'Client ID와 함께 발급' },
    ],
  },
  cafe24: {
    label: '카페24', color: '#2563EB',
    desc: 'Mall ID 입력 후 OAuth 인증 버튼을 눌러 연결하세요',
    link: 'https://developers.cafe24.com',
    linkText: '카페24 개발자센터',
    isOAuth: true,
    fields: [
      { key: 'CAFE24_MALL_ID', label: 'Mall ID', type: 'text', hint: '예: myshop.cafe24.com → myshop' },
    ],
  },
  musinsa: {
    label: '무신사', color: '#222222',
    desc: '무신사 파트너센터 > 개발자 API에서 발급 (1년 만료 주의)',
    link: 'https://partner.musinsa.com',
    linkText: '무신사 파트너센터',
    fields: [
      { key: 'MUSINSA_API_KEY', label: 'API Key', type: 'password', hint: '파트너센터 > 개발자 API' },
    ],
  },
  ably: {
    label: '에이블리', color: '#FF6B9D',
    desc: '에이블리 셀러스 파트너센터에서 발급 (셀러스 입점 타입만 지원)',
    link: 'https://sellers.a-bly.com',
    linkText: '에이블리 셀러스센터',
    fields: [
      { key: 'ABLY_API_KEY', label: 'API Key', type: 'password', hint: '셀러스(Sellers) 입점 타입만 지원' },
    ],
  },
  zigzag: {
    label: '지그재그', color: '#FF5A5A',
    desc: '지그재그 파트너센터 > 개발자 API에서 발급',
    link: 'https://partner.zigzag.kr',
    linkText: '지그재그 파트너센터',
    fields: [
      { key: 'ZIGZAG_API_KEY', label: 'API Key', type: 'password', hint: '파트너센터 > 개발자 API' },
    ],
  },
};

export default function StepApiKeys({ channels, onComplete }) {
  const { t } = useLanguage();
  const [idx,        setIdx]       = useState(0);
  const [values,     setValues]    = useState({});
  const [saving,     setSaving]    = useState(false);
  const [error,      setError]     = useState('');
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'ok' | { error: string }

  const total   = channels.length;
  const chId    = channels[idx];
  const config  = CHANNEL_CONFIG[chId];

  function handleChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  function goNext() {
    if (idx + 1 >= total) {
      onComplete();
    } else {
      setIdx((i) => i + 1);
      setValues({});
      setError('');
      setTestStatus(null);
    }
  }

  async function runConnectionTest(platform) {
    setTestStatus('testing');
    try {
      const res  = await authFetch(`${API_BASE}/settings/test-connection`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ platform }),
      });
      const data = await res.json();
      setTestStatus(data.ok ? 'ok' : { error: data.reason || '연결 실패' });
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
      setError(t('ob3SkipHint'));
      return;
    }

    setSaving(true);
    setError('');
    setTestStatus(null);
    try {
      const res  = await authFetch(`${API_BASE}/settings/credentials`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(toSave),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '저장 실패');
      // 카페24는 OAuth 후 연결되므로 자동 테스트 생략
      if (!config.isOAuth) runConnectionTest(chId);
    } catch (err) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function handleOAuth() {
    const mallId = values['CAFE24_MALL_ID']?.trim();
    if (!mallId) { setError('Mall ID를 먼저 입력해 주세요.'); return; }
    window.open(`${API_BASE}/oauth/cafe24/start?mallId=${encodeURIComponent(mallId)}`, '_blank');
  }

  if (!config) return null;

  return (
    <div className={styles.container}>

      {/* 로고 */}
      <div className={styles.logo}>
        <WeaveLogo />
      </div>

      {/* 진행 상태 */}
      <div className={styles.progressWrap}>
        <span className={styles.progressText}>{t('ob3ProgressText', idx + 1, total)}</span>
        <div className={styles.progressBar}>
          {channels.map((_, i) => (
            <div
              key={i}
              className={`${styles.progressSegment} ${i <= idx ? styles.progressSegmentDone : ''}`}
            />
          ))}
        </div>
      </div>

      {/* 채널 헤더 */}
      <div className={styles.channelHeader}>
        <span className={styles.channelDot} style={{ background: config.color }} />
        <div>
          <h1 className={styles.channelName}>{config.label}</h1>
          <p className={styles.channelDesc}>{config.desc}</p>
          {config.link && (
            <a
              className={styles.channelLink}
              href={config.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {config.linkText} →
            </a>
          )}
        </div>
      </div>

      {/* 입력 필드 */}
      <div className={styles.fields}>
        {config.fields.map(({ key, label, type, hint }) => (
          <div key={key} className={styles.fieldRow}>
            <label className={styles.fieldLabel}>{label}</label>
            <input
              className={styles.fieldInput}
              type={type}
              placeholder={hint}
              value={values[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
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

      {/* 연결 테스트 결과 */}
      {testStatus === 'testing' && (
        <div className={styles.testStatus}>⏳ 연결 확인 중...</div>
      )}
      {testStatus === 'ok' && (
        <div className={`${styles.testStatus} ${styles.testOk}`}>✓ 연결됨</div>
      )}
      {testStatus && testStatus.error && (
        <div className={`${styles.testStatus} ${styles.testFail}`}>✗ {testStatus.error}</div>
      )}

      {/* 에러 */}
      {error && <p className={styles.error}>{error}</p>}

      {/* 액션 버튼 */}
      <div className={styles.actions}>
        <button className={styles.skipBtn} onClick={goNext} disabled={saving}>
          {t('ob3SkipBtn')}
        </button>
        <button className={styles.saveBtn} onClick={testStatus === 'ok' ? goNext : handleSave} disabled={saving || testStatus === 'testing'}>
          {saving ? t('ob3Saving')
            : testStatus === 'ok' ? (idx + 1 >= total ? t('ob3DoneBtn') : '다음 채널 →')
            : idx + 1 >= total ? t('ob3DoneBtn') : t('ob3SaveBtn')}
        </button>
      </div>

      <p className={styles.skipHint}>{t('ob3SkipHint')}</p>
    </div>
  );
}
