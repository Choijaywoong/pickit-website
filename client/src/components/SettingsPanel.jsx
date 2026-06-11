// 설정 패널 — 채널 연결·방화벽·알림·계정을 관리하는 풀 페이지 뷰 (사이드바 '설정' 탭에서 진입)
import { useState, useEffect } from 'react';
import styles from './SettingsPanel.module.css';
import { authFetch } from '../auth';
import { supabase } from '../supabase';
import { useLanguage, SUPPORTED_LANGS } from '../i18n';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
    color: '#2563EB',
    desc: '조회·수정·송장 지원. Mall ID 입력 후 OAuth 인증 필요.',
    isOAuth: true,
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

// 왼쪽 섹션 목록 (언어는 계정 탭 안으로 통합)
const SECTIONS = [
  { id: 'channels',      label: '채널 연결' },
  { id: 'firewall',      label: '방화벽' },
  { id: 'notifications', label: '알림' },
  { id: 'account',       label: '계정' },
];

// 방화벽 현재 임계값 (guardrail.js와 동기화)
const FIREWALL_INFO = [
  { label: '가격 변동 허용 범위', value: '±20%',  desc: '기존 가격 대비 20% 초과 변경 시 승인 요청' },
  { label: '일괄 수정 한도',     value: '5개',    desc: '수정 대상 5개 이상 또는 "전체/일괄" 키워드 포함 시 승인 요청' },
  { label: '최소 확신도',        value: '85%',    desc: 'AI 의도 파싱 확신도 85% 미만 시 재질문' },
  { label: '미지원 채널 수정',   value: '차단',   desc: '무신사·에이블리·지그재그 수정 요청 시 파트너센터 링크로 안내' },
];

// 알림 항목 정의
const NOTIF_ITEMS = [
  {
    key: 'predictionAlert',
    label: '발주 예측 알림',
    desc: '재고 소진 예상일이 가까운 상품을 채팅 상단에 카드로 알림 (재고 보유 셀러만)',
  },
  {
    key: 'musinsaExpiry',
    label: '무신사 API Key 만료 알림',
    desc: '만료 30일·7일 전 채팅창에 경고 배너 표시 (무신사 키는 1년 만료)',
  },
];

function loadNotifSettings() {
  try { return JSON.parse(localStorage.getItem('pickit_notifications') || '{}'); }
  catch { return {}; }
}

export default function SettingsPanel({ onClose, initialChannel = null }) {
  const { lang, setLang } = useLanguage();
  const [section, setSection]             = useState('channels');
  const [activeChannel, setActiveChannel] = useState(initialChannel || 'coupang');
  const [formValues, setFormValues]       = useState({});
  const [savedKeys, setSavedKeys]         = useState({});
  const [saving, setSaving]               = useState(false);
  const [saveMsg, setSaveMsg]             = useState('');
  const [loadErr, setLoadErr]             = useState(false);
  const [notifSettings, setNotifSettings] = useState(loadNotifSettings);
  const [userEmail, setUserEmail]         = useState('');
  const [loggingOut, setLoggingOut]       = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/settings/credentials`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(setSavedKeys)
      .catch(() => setLoadErr(true));
  }, []);

  // 계정 탭용: Supabase에서 로그인된 이메일 로드
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  // ConnectionBanner "다시 연결하기"에서 특정 채널로 열릴 때
  useEffect(() => {
    if (initialChannel) {
      setSection('channels');
      setActiveChannel(initialChannel);
    }
  }, [initialChannel]);

  const channel = CHANNEL_CONFIG.find((c) => c.id === activeChannel);

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveMsg('✅ 저장 완료!');
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

  function isChannelComplete(ch) {
    const fieldsOk = ch.fields.every((f) => savedKeys[f.key]);
    if (ch.oauthKey) return fieldsOk && savedKeys[ch.oauthKey];
    return fieldsOk;
  }

  function handleNotifToggle(key) {
    setNotifSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('pickit_notifications', JSON.stringify(next));
      return next;
    });
  }

  async function handleLogout() {
    setLoggingOut(true);
    if (supabase) await supabase.auth.signOut();
    onClose();
  }

  return (
    <div className={styles.panel}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          채팅으로
        </button>
        <h1 className={styles.title}>설정</h1>
        <div style={{ width: 80 }} />
      </div>

      <div className={styles.body}>
        {/* 왼쪽 섹션 네비게이션 */}
        <nav className={styles.sectionNav}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`${styles.sectionBtn} ${section === s.id ? styles.sectionBtnActive : ''}`}
              onClick={() => { setSection(s.id); setSaveMsg(''); }}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* 오른쪽 콘텐츠 */}
        <div className={styles.content}>

          {/* ── 채널 연결 섹션 ── */}
          {section === 'channels' && (
            <div className={styles.channelsLayout}>
              {loadErr && (
                <div className={styles.loadErrBanner}>
                  ⚠️ 저장된 설정을 불러오지 못했습니다. 서버 연결을 확인해 주세요.
                </div>
              )}

              {/* 채널 목록 */}
              <nav className={styles.channelNav}>
                {CHANNEL_CONFIG.map((ch) => (
                  <button
                    key={ch.id}
                    className={`${styles.channelNavBtn} ${activeChannel === ch.id ? styles.channelNavBtnActive : ''}`}
                    onClick={() => { setActiveChannel(ch.id); setSaveMsg(''); }}
                  >
                    <span className={styles.channelDot} style={{ background: ch.color }} />
                    <span className={styles.channelNavLabel}>{ch.label}</span>
                    {isChannelComplete(ch) && <span className={styles.checkBadge}>✓</span>}
                  </button>
                ))}
              </nav>

              {/* 채널 폼 */}
              {channel && (
                <div className={styles.channelForm}>
                  <div className={styles.channelFormHeader}>
                    <span className={styles.channelFormDot} style={{ background: channel.color }} />
                    <div>
                      <h2 className={styles.channelFormName}>{channel.label}</h2>
                      <p className={styles.channelFormDesc}>{channel.desc}</p>
                    </div>
                  </div>

                  <div className={styles.fields}>
                    {channel.fields.map((field) => (
                      <div key={field.key} className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>
                          {field.label}
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

                  {channel.isOAuth && (
                    <div className={styles.oauthSection}>
                      {savedKeys[channel.oauthKey] ? (
                        <p className={styles.oauthOk}>✅ OAuth 인증 완료. 카페24 채널이 연결되었습니다.</p>
                      ) : (
                        <>
                          <p className={styles.oauthDesc}>
                            Mall ID를 저장한 후 아래 버튼을 누르면 카페24 로그인 페이지로 이동합니다.
                            로그인 후 weave에 권한을 허용하면 자동으로 연결됩니다.
                          </p>
                          <button className={styles.oauthBtn} onClick={handleOAuthCafe24}>
                            카페24 OAuth 인증하기 →
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className={styles.formFooter}>
                    {saveMsg && (
                      <span className={`${styles.saveMsg} ${saveMsg.startsWith('✅') ? styles.saveMsgOk : styles.saveMsgErr}`}>
                        {saveMsg}
                      </span>
                    )}
                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                      {saving ? '저장 중...' : '저장하기'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 방화벽 섹션 ── */}
          {section === 'firewall' && (
            <div className={styles.simpleSection}>
              <h2 className={styles.sectionTitle}>방화벽 현재 설정</h2>
              <p className={styles.sectionDesc}>
                AI가 만든 수정 명령이 실제 채널 API로 나가기 직전 통과해야 하는 안전장치입니다.
                아래 임계값을 벗어나면 채팅창에 승인 요청이 표시되고, 승인 전 API 호출은 차단됩니다.
              </p>

              <div className={styles.infoTable}>
                {FIREWALL_INFO.map((row) => (
                  <div key={row.label} className={styles.infoRow}>
                    <div className={styles.infoLeft}>
                      <span className={styles.infoLabel}>{row.label}</span>
                      <span className={styles.infoRowDesc}>{row.desc}</span>
                    </div>
                    <span className={styles.infoValue}>{row.value}</span>
                  </div>
                ))}
              </div>

              <p className={styles.firewallNotice}>
                🔒 방화벽 임계값은 서버에서 관리됩니다. 조정이 필요하면 운영팀에 문의해 주세요.
              </p>
            </div>
          )}

          {/* ── 알림 섹션 ── */}
          {section === 'notifications' && (
            <div className={styles.simpleSection}>
              <h2 className={styles.sectionTitle}>알림 설정</h2>
              <p className={styles.sectionDesc}>채팅창에 표시할 알림 항목을 켜거나 끌 수 있습니다.</p>

              <div className={styles.notifList}>
                {NOTIF_ITEMS.map((item) => (
                  <div key={item.key} className={styles.notifRow}>
                    <div className={styles.notifInfo}>
                      <span className={styles.notifLabel}>{item.label}</span>
                      <span className={styles.notifRowDesc}>{item.desc}</span>
                    </div>
                    <button
                      className={`${styles.toggle} ${notifSettings[item.key] !== false ? styles.toggleOn : ''}`}
                      onClick={() => handleNotifToggle(item.key)}
                      aria-label={`${item.label} ${notifSettings[item.key] !== false ? '끄기' : '켜기'}`}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 계정 섹션 ── */}
          {section === 'account' && (
            <div className={styles.simpleSection}>
              <h2 className={styles.sectionTitle}>계정</h2>

              <div className={styles.accountList}>
                {/* 이메일 */}
                <div className={styles.accountRow}>
                  <span className={styles.accountLabel}>이메일</span>
                  <span className={styles.accountValue}>{userEmail || '—'}</span>
                </div>

                {/* 언어 */}
                <div className={styles.accountRow}>
                  <span className={styles.accountLabel}>언어</span>
                  <select
                    className={styles.langSelect}
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                  >
                    {SUPPORTED_LANGS.map((l) => (
                      <option key={l.code} value={l.code}>{l.flag} {l.nativeName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.accountDanger}>
                <button
                  className={styles.logoutBtn}
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
