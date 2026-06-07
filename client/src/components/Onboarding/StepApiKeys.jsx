import { useState } from 'react';
import { authFetch } from '../../auth';
import styles from './StepApiKeys.module.css';
import { useLanguage } from '../../i18n';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const CHANNEL_CONFIG = {
  coupang: {
    label: '쿠팡', color: '#E50029',
    desc: '쿠팡 파트너스 > API 관리에서 발급',
    fields: [
      { key: 'COUPANG_VENDOR_ID',  label: 'Vendor ID',  type: 'text',     hint: '공급사 ID' },
      { key: 'COUPANG_ACCESS_KEY', label: 'Access Key', type: 'text',     hint: 'API 관리에서 발급' },
      { key: 'COUPANG_SECRET_KEY', label: 'Secret Key', type: 'password', hint: 'Access Key와 함께 발급' },
    ],
  },
  naver: {
    label: '네이버 스마트스토어', color: '#03C75A',
    desc: 'NCP(네이버 클라우드) > Commerce API 신청 후 발급',
    fields: [
      { key: 'NAVER_CLIENT_ID',     label: 'Client ID',     type: 'text',     hint: 'NCP > Commerce API' },
      { key: 'NAVER_CLIENT_SECRET', label: 'Client Secret', type: 'password', hint: 'Client ID와 함께 발급' },
    ],
  },
  cafe24: {
    label: '카페24', color: '#2563EB',
    desc: 'Mall ID 입력 후 OAuth 인증 버튼을 눌러 연결하세요',
    isOAuth: true,
    fields: [
      { key: 'CAFE24_MALL_ID', label: 'Mall ID', type: 'text', hint: '예: myshop.cafe24.com → myshop' },
    ],
  },
  musinsa: {
    label: '무신사', color: '#222222',
    desc: '무신사 파트너 개발자 센터에서 발급 (1년 만료 주의)',
    fields: [
      { key: 'MUSINSA_API_KEY', label: 'API Key', type: 'password', hint: '파트너 개발자 문서 참조' },
    ],
  },
  ably: {
    label: '에이블리', color: '#FF6B9D',
    desc: '에이블리 셀러스 파트너 센터에서 발급',
    fields: [
      { key: 'ABLY_API_KEY', label: 'API Key', type: 'password', hint: '셀러스(Sellers) 입점 타입만 지원' },
    ],
  },
  zigzag: {
    label: '지그재그', color: '#FF5A5A',
    desc: '지그재그 파트너 개발자 센터에서 발급',
    fields: [
      { key: 'ZIGZAG_API_KEY', label: 'API Key', type: 'password', hint: '파트너 센터에서 발급' },
    ],
  },
};

export default function StepApiKeys({ channels, onComplete }) {
  const { t } = useLanguage();
  const [idx,     setIdx]     = useState(0);
  const [values,  setValues]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

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
    try {
      const res  = await authFetch(`${API_BASE}/settings/credentials`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(toSave),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '저장 실패');
      goNext();
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
        <span className={styles.logoMark}>P</span>
        <span className={styles.logoText}>PICKIT</span>
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

      {/* 에러 */}
      {error && <p className={styles.error}>{error}</p>}

      {/* 액션 버튼 */}
      <div className={styles.actions}>
        <button className={styles.skipBtn} onClick={goNext} disabled={saving}>
          {t('ob3SkipBtn')}
        </button>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? t('ob3Saving') : idx + 1 >= total ? t('ob3DoneBtn') : t('ob3SaveBtn')}
        </button>
      </div>

      <p className={styles.skipHint}>{t('ob3SkipHint')}</p>
    </div>
  );
}
