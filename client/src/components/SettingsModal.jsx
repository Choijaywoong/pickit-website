import { useState, useEffect } from 'react';
import styles from './SettingsModal.module.css';
import { authFetch } from '../auth';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// 채널별 입력 필드 정의 (셀러가 직접 발급받는 자격증명만 포함)
// ANTHROPIC_API_KEY, CAFE24_CLIENT_ID, CAFE24_CLIENT_SECRET, CAFE24_REDIRECT_URI는
// PICKIT 플랫폼 자격증명 → server/.env에 저장, 이 UI에 노출하지 않음
const CHANNEL_CONFIG = [
  {
    id: 'coupang',
    label: '쿠팡',
    color: '#E50029',
    desc: '조회·수정·송장 전부 지원 (핵심 채널)',
    fields: [
      { key: 'COUPANG_VENDOR_ID',  label: 'Vendor ID',   type: 'text',     hint: '쿠팡 파트너스 > API 관리 > 공급사 ID' },
      { key: 'COUPANG_ACCESS_KEY', label: 'Access Key',  type: 'text',     hint: '쿠팡 파트너스 > API 관리에서 발급' },
      { key: 'COUPANG_SECRET_KEY', label: 'Secret Key',  type: 'password', hint: 'Access Key와 함께 발급됨' },
    ],
  },
  {
    id: 'naver',
    label: '네이버 스마트스토어',
    color: '#03C75A',
    desc: '조회·수정·송장 전부 지원 (핵심 채널)',
    fields: [
      { key: 'NAVER_CLIENT_ID',     label: 'Client ID',     type: 'text',     hint: 'NCP(네이버 클라우드) > Commerce API 신청 후 발급' },
      { key: 'NAVER_CLIENT_SECRET', label: 'Client Secret', type: 'password', hint: 'Client ID와 함께 발급됨' },
    ],
  },
  {
    id: 'cafe24',
    label: '카페24',
    color: '#1155CC',
    desc: '조회·수정·송장 지원. Mall ID 입력 후 OAuth 인증 필요.',
    isOAuth: true,
    // OAuth 완료 여부 확인용 (입력 필드 아님)
    oauthKey: 'CAFE24_ACCESS_TOKEN',
    fields: [
      { key: 'CAFE24_MALL_ID', label: 'Mall ID', type: 'text', hint: '카페24 쇼핑몰 주소 앞부분 (예: myshop → myshop.cafe24.com)' },
    ],
  },
  {
    id: 'musinsa',
    label: '무신사',
    color: '#1A1A1A',
    desc: '조회·송장 지원. 수정은 파트너센터로 안내.',
    fields: [
      { key: 'MUSINSA_API_KEY', label: 'API Key', type: 'password', hint: '무신사 파트너 개발자 문서에서 발급 (1년 만료)' },
    ],
  },
  {
    id: 'ably',
    label: '에이블리',
    color: '#FF6B9D',
    desc: '셀러스(Sellers) 입점 타입만 지원. 조회·송장.',
    fields: [
      { key: 'ABLY_API_KEY', label: 'API Key', type: 'password', hint: '에이블리 셀러스 파트너 센터에서 발급' },
    ],
  },
  {
    id: 'zigzag',
    label: '지그재그',
    color: '#FF5A5A',
    desc: '조회·송장 지원. 취소·반품은 파트너센터로 안내.',
    fields: [
      { key: 'ZIGZAG_API_KEY', label: 'API Key', type: 'password', hint: '지그재그 파트너 개발자 센터에서 발급' },
    ],
  },
];

export default function SettingsModal({ onClose }) {
  // ConnectionStatus "다시 연결하기"에서 특정 탭을 지정해서 열 수 있음
  const initialTab = window.__pickit_settings_tab || 'coupang';
  if (window.__pickit_settings_tab) delete window.__pickit_settings_tab;
  const [activeTab, setActiveTab]   = useState(initialTab);
  const [formValues, setFormValues] = useState({});
  const [savedKeys, setSavedKeys]   = useState({});
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');

  // 열릴 때 서버에서 키 설정 여부 로드
  useEffect(() => {
    authFetch(`${API_BASE}/settings/credentials`)
      .then((r) => r.json())
      .then(setSavedKeys)
      .catch(() => {});
  }, []);

  const channel = CHANNEL_CONFIG.find((c) => c.id === activeTab);

  function handleChange(key, value) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setSaveMsg('');
  }

  async function handleSave() {
    const toSave = {};
    channel.fields.forEach(({ key }) => {
      if (formValues[key] !== undefined && formValues[key] !== '') {
        toSave[key] = formValues[key];
      }
    });
    if (Object.keys(toSave).length === 0) {
      setSaveMsg('저장할 값을 입력해 주세요.');
      return;
    }

    setSaving(true);
    setSaveMsg('');
    try {
      const res  = await authFetch(`${API_BASE}/settings/credentials`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(toSave),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveMsg('✅ 저장 완료!');
        // 설정됨 상태 갱신
        const newSaved = { ...savedKeys };
        Object.keys(toSave).forEach((k) => { newSaved[k] = true; });
        setSavedKeys(newSaved);
        setFormValues({});
      } else {
        setSaveMsg(`저장 실패: ${data.error}`);
      }
    } catch {
      setSaveMsg('서버 연결에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function handleOAuthCafe24() {
    const mallId = formValues['CAFE24_MALL_ID'] || '';
    if (!mallId) {
      setSaveMsg('Mall ID를 먼저 입력하고 저장해 주세요.');
      return;
    }
    window.open(`${API_BASE}/oauth/cafe24/start?mallId=${encodeURIComponent(mallId)}`, '_blank');
  }

  // 채널이 완전히 설정됐는지 여부
  function isChannelComplete(ch) {
    const fieldsOk = ch.fields.every((f) => savedKeys[f.key]);
    // OAuth 채널은 access token까지 있어야 완료
    if (ch.oauthKey) return fieldsOk && savedKeys[ch.oauthKey];
    return fieldsOk;
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>채널 연결 설정</h2>
            <p className={styles.subtitle}>각 채널에서 발급받은 API Key를 입력하면 주문·재고·송장을 처리할 수 있습니다.</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* 왼쪽 탭 */}
          <nav className={styles.nav}>
            {CHANNEL_CONFIG.map((ch) => {
              const complete = isChannelComplete(ch);
              return (
                <button
                  key={ch.id}
                  className={`${styles.navBtn} ${activeTab === ch.id ? styles.navBtnActive : ''}`}
                  onClick={() => { setActiveTab(ch.id); setSaveMsg(''); }}
                >
                  <span className={styles.navDot} style={{ background: ch.color }} />
                  <span className={styles.navLabel}>{ch.label}</span>
                  {ch.badge && <span className={styles.navBadge}>{ch.badge}</span>}
                  {complete && <span className={styles.checkIcon}>✓</span>}
                </button>
              );
            })}
          </nav>

          {/* 오른쪽 콘텐츠 */}
          {channel && (
            <div className={styles.content}>
              <div className={styles.channelHeader}>
                <span className={styles.channelDot} style={{ background: channel.color }} />
                <div>
                  <h3 className={styles.channelName}>{channel.label}</h3>
                  <p className={styles.channelDesc}>{channel.desc}</p>
                </div>
              </div>

              <div className={styles.fields}>
                {channel.fields.map((field) => (
                  <div key={field.key} className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>
                      {field.label}
                      {field.required && <span className={styles.required}>*</span>}
                      {savedKeys[field.key] && (
                        <span className={styles.setTag}>설정됨</span>
                      )}
                    </label>
                    <input
                      className={styles.fieldInput}
                      type={field.type}
                      placeholder={savedKeys[field.key] ? '••••••••• (변경하려면 새로 입력)' : '입력해 주세요'}
                      value={formValues[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      autoComplete="off"
                    />
                    {field.hint && <p className={styles.fieldHint}>{field.hint}</p>}
                  </div>
                ))}
              </div>

              {/* Cafe24 OAuth 섹션 */}
              {channel.isOAuth && (
                <div className={styles.oauthSection}>
                  {savedKeys[channel.oauthKey] ? (
                    <p className={styles.oauthDesc} style={{ color: '#15803D', fontWeight: 600 }}>
                      ✅ OAuth 인증 완료. 카페24 채널이 연결되었습니다.
                    </p>
                  ) : (
                    <>
                      <p className={styles.oauthDesc}>
                        Mall ID를 저장한 후 아래 버튼을 누르면 카페24 로그인 페이지로 이동합니다.
                        로그인 후 PICKIT에 권한을 허용하면 자동으로 연결됩니다.
                      </p>
                      <button className={styles.oauthBtn} onClick={handleOAuthCafe24}>
                        카페24 OAuth 인증하기 →
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className={styles.footer}>
                {saveMsg && (
                  <span className={`${styles.saveMsg} ${saveMsg.startsWith('✅') ? styles.saveMsgOk : styles.saveMsgErr}`}>
                    {saveMsg}
                  </span>
                )}
                <button
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
