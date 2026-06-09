import { createContext, useContext, useState, useCallback } from 'react';

// ─── 번역 테이블 ───────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  ko: {
    // ── 랜딩 ──
    navCta:             '무료로 시작하기',
    heroBadge:          '의류 셀러를 위한 AI 운영 서비스',
    heroTitle1:         '말 한마디로',
    heroAccentText:     '6개 채널',
    heroTitle2:         '을 한 번에',
    heroDesc:           '주문 조회, 재고 수정, 송장 전송까지.\n채팅창에 입력하면 weave이 알아서 처리합니다.',
    heroBtn:            '무료로 시작하기 →',
    heroSub:            '신용카드 불필요 · 14일 무료 체험',
    channelsLabel:      '연동 채널',
    painEyebrow:        '지금 셀러의 현실',
    painTitle:          '멀티채널 운영, 이렇게 힘드셨죠?',
    pain1Title:         '탭이 6개',
    pain1Desc:          '채널마다 파트너 센터를 따로 열고, 같은 작업을 6번 반복합니다.',
    pain2Title:         '엑셀 복붙',
    pain2Desc:          '주문 데이터를 내려받아 취합하다 실수가 생깁니다.',
    pain3Title:         '하루가 운영에 다 간다',
    pain3Desc:          '정작 중요한 상품 기획·CS·마케팅에 쓸 시간이 없습니다.',
    demoEyebrow:        'weave이 하는 일',
    demoTitle:          '채팅창에 말하면\nweave이 처리합니다',
    demoF1:             '✓ 전체 채널 주문 한 번에 조회',
    demoF2:             '✓ 재고·가격 수정 전 방화벽 검토',
    demoF3:             '✓ 송장 자동 전송',
    demoF4:             '✓ 주문 데이터 엑셀 추출',
    supportLabel:       '지원기관',
    ctaTitle:           '지금 바로 시작해보세요',
    ctaDesc:            '설치 없이 브라우저에서 바로 사용 가능합니다.',
    ctaBtn:             '무료로 시작하기 →',
    footerCopy:         '© 2025 weave. All rights reserved.',

    // ── 인증 ──
    authLogoSub:        '멀티채널 AI 운영 서비스',
    googleBtn:          'Google로 계속하기',
    kakaoBtn:           '카카오로 계속하기',
    comingSoon:         '준비 중',
    authDivider:        '또는 이메일로 계속하기',
    tabLogin:           '로그인',
    tabSignup:          '회원가입',
    emailLabel:         '이메일',
    passwordLabel:      '비밀번호',
    passwordHint:       '6자 이상',
    loginBtn:           '이메일로 로그인',
    signupBtn:          '이메일로 회원가입',
    loggingIn:          '로그인 중...',
    signingUp:          '가입 중...',
    switchToSignup:     '아직 계정이 없으신가요?',
    switchToLogin:      '이미 계정이 있으신가요?',
    doneTitle:          '이메일을 확인해 주세요',
    doneDesc:           '으로 인증 링크를 보냈습니다.\n링크를 클릭하면 자동으로 로그인됩니다.',
    backToLogin:        '로그인으로 돌아가기',
    // auth errors
    errInvalidCred:     '이메일 또는 비밀번호가 올바르지 않습니다.',
    errAlreadyReg:      '이미 가입된 이메일입니다. 로그인해 주세요.',
    errWeakPassword:    '비밀번호는 최소 6자 이상이어야 합니다.',
    errInvalidEmail:    '올바른 이메일 주소를 입력해 주세요.',
    errGoogleFail:      'Google 로그인에 실패했습니다.',
    errKakaoPreparing:  '카카오 로그인 설정이 아직 준비 중입니다.',
    errGeneric:         '오류가 발생했습니다.',

    // ── 채팅 사이드바 ──
    brandSub:           '멀티채널 AI 운영',
    newChat:            '새 대화',
    channelSection:     '채널 선택',
    activeCount:        (n) => `${n}개 활성`,
    unlinked:           '미연결',
    settingsBtn:        '채널 연결 설정',
    logoutBtn:          '로그아웃',
    reOnboardBtn:       '채널 변경',
    topbarTitle:        'weave Assistant',

    // ── 채팅 빈 화면 ──
    emptyTitle:         '무엇을 도와드릴까요?',
    emptyDesc:          '주문 조회, 재고 수정, 송장 전송을\n말 한마디로 처리하세요.',
    quickActions: [
      '오늘 쿠팡 주문 보여줘',
      '오늘 전체 채널 주문 조회해줘',
      '이번 달 주문 엑셀로 뽑아줘',
      '블랙 L 재고 품절 처리해줘',
    ],
    inputPlaceholder:   '주문 조회, 재고 수정, 송장 전송... 무엇이든 말씀하세요',
    inputPlaceholderLocked: '승인 또는 취소 후 입력 가능합니다',
    inputHint:          'Enter로 전송 · Shift+Enter로 줄바꿈',

    // ── 채팅 에러 ──
    errNoApiKey:        '⚙️ API 키가 설정되지 않았습니다. 왼쪽 하단 **설정(⚙)** 에서 입력해 주세요.',
    errChannelAuth:     '🔌 채널 연동이 만료되었습니다. **설정 > 채널 연결**에서 API 키를 다시 확인해 주세요.',
    errLlm:             '🤖 AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    errNetwork:         '🌐 서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.',
    errUnexpected:      '처리 중 예상치 못한 오류가 발생했습니다. 페이지를 새로고침해 주세요.',
    approved:           '✅ 처리가 완료되었습니다.',
    toastApproved:      '승인 완료 — 처리되었습니다.',
    toastCancelled:     '작업이 취소되었습니다.',
    toastError:         '처리 중 오류가 발생했습니다.',
    cancelled:          '취소되었습니다.',

    // ── 온보딩 ──
    ob1Progress:        '1 / 3 단계',
    ob1Question:        '재고 관리를 하고 계신가요?',
    ob1Desc:            '운영 방식을 파악해 weave을 최적화합니다.',
    ob1YesTitle:        '네, 직접 재고 관리해요',
    ob1YesSub:          '발주·재고 예측 기능을 활성화합니다.',
    ob1NoTitle:         '아니요, 위탁 판매예요',
    ob1NoSub:           '주문·송장·CS 중심으로 구성합니다.',
    ob1bProgress:       '2 / 3 단계',
    ob1bQuestion:       '재고를 어떻게 관리하시나요?',
    ob1bDesc:           '재고 운영 방식에 따라 동기화 기능이 달라집니다.',
    ob1bSharedTitle:    '공유 창고 운영',
    ob1bSharedSub:      '모든 채널이 같은 재고를 씁니다. 한 채널에서 팔리면 자동으로 다른 채널 재고가 줄어요.',
    ob1bSplitTitle:     '채널별 분리 관리',
    ob1bSplitSub:       '채널마다 재고를 나눠 배정합니다. 자동 동기화는 끄고, 채널별 발주 예측을 드립니다.',
    ob2Progress:        '3 / 3 단계',
    ob2Question:        '운영 중인 채널을 선택해 주세요',
    ob2Desc:            '2개 이상 선택 · 나중에 설정에서 언제든 변경 가능합니다.',
    ob2TierBadge:       '조회·송장',
    ob2AblyWarn:        "에이블리는 '셀러스(Sellers)' 입점 타입만 연동 가능합니다",
    ob2AblyWarnBody:    '입점 타입을 먼저 확인해 주세요. 다른 타입은 연동되지 않습니다.',
    ob2Count0:          '채널을 2개 이상 선택해 주세요',
    ob2Count1:          '1개 선택됨 — 1개 더 선택해야 시작할 수 있습니다',
    ob2CountN:          (n) => `${n}개 선택됨`,
    ob2Next:            '다음 — API 연결하기 →',
    ob3ProgressText:    (cur, tot) => `API 연결 ${cur} / ${tot}`,
    ob3SkipBtn:         '나중에 설정',
    ob3SaveBtn:         '저장 후 다음 →',
    ob3DoneBtn:         '완료',
    ob3Saving:          '저장 중...',
    ob3SkipHint:        "'나중에 설정'을 누르면 채팅 화면 → 설정에서 언제든 입력할 수 있습니다.",

    // ── 연결 상태 ──
    connChecking:       '채널 상태 확인 중…',
    connAllOk:          (n) => `${n}개 채널 모두 정상`,
    connSomeOk:         (n, ok) => `${n}개 채널 중 ${ok}개 정상`,
    connRefresh:        '새로고침',
    connBadgeOk:        '정상',
    connBadgeExpired:   '만료',
    connBadgeMissing:   '미설정',
    connBadgeDemo:      '데모',
    connMissingMsg:     'API 키가 설정되지 않았습니다. 설정에서 입력해 주세요.',
    connReconnectBtn:   '다시 연결하기',
    connStartBtn:       '채팅 시작하기',

    // ── 세션 ──
    sessionExpired:     '세션이 만료되었습니다. 다시 로그인해 주세요.',
  },

  en: {
    // ── Landing ──
    navCta:             'Start Free',
    heroBadge:          'AI Operations for Fashion Sellers',
    heroTitle1:         'One Command.',
    heroAccentText:     'Six Channels',
    heroTitle2:         ' at Once.',
    heroDesc:           'Query orders, update inventory, send invoices.\nJust type in the chat — weave handles the rest.',
    heroBtn:            'Start Free →',
    heroSub:            'No credit card · 14-day free trial',
    channelsLabel:      'Integrated Channels',
    painEyebrow:        'The Reality of Multi-Channel Selling',
    painTitle:          'Managing Multiple Channels is Exhausting',
    pain1Title:         '6 Tabs Open',
    pain1Desc:          'You open a separate partner center for each channel and repeat the same task 6 times.',
    pain2Title:         'Copy-Paste Spreadsheets',
    pain2Desc:          'Exporting and merging order data is error-prone and time-consuming.',
    pain3Title:         'No Time for What Matters',
    pain3Desc:          'Product planning, customer service, and marketing get neglected.',
    demoEyebrow:        'What weave Does',
    demoTitle:          'Just Chat.\nweave Handles the Rest.',
    demoF1:             '✓ Query all channels at once',
    demoF2:             '✓ Firewall review before stock & price changes',
    demoF3:             '✓ Automated invoice sending',
    demoF4:             '✓ Export orders to Excel',
    supportLabel:       'Supported By',
    ctaTitle:           'Get Started Today',
    ctaDesc:            'No installation needed. Works right in your browser.',
    ctaBtn:             'Start Free →',
    footerCopy:         '© 2025 weave. All rights reserved.',

    // ── Auth ──
    authLogoSub:        'Multi-Channel AI Operations',
    googleBtn:          'Continue with Google',
    kakaoBtn:           'Continue with Kakao',
    comingSoon:         'Coming Soon',
    authDivider:        'Or continue with email',
    tabLogin:           'Log In',
    tabSignup:          'Sign Up',
    emailLabel:         'Email',
    passwordLabel:      'Password',
    passwordHint:       '6+ characters',
    loginBtn:           'Log in with email',
    signupBtn:          'Sign up with email',
    loggingIn:          'Logging in...',
    signingUp:          'Signing up...',
    switchToSignup:     "Don't have an account?",
    switchToLogin:      'Already have an account?',
    doneTitle:          'Check Your Email',
    doneDesc:           '.\nClick the verification link to log in automatically.',
    backToLogin:        'Back to Login',
    // auth errors
    errInvalidCred:     'Invalid email or password.',
    errAlreadyReg:      'This email is already registered. Please log in.',
    errWeakPassword:    'Password must be at least 6 characters.',
    errInvalidEmail:    'Please enter a valid email address.',
    errGoogleFail:      'Google login failed. Please try again.',
    errKakaoPreparing:  'Kakao login is not yet available.',
    errGeneric:         'An error occurred.',

    // ── Chat sidebar ──
    brandSub:           'Multi-Channel AI Ops',
    newChat:            'New Chat',
    channelSection:     'Channels',
    activeCount:        (n) => `${n} active`,
    unlinked:           'Not linked',
    settingsBtn:        'Channel Settings',
    logoutBtn:          'Log out',
    reOnboardBtn:       'Change Channels',
    topbarTitle:        'weave Assistant',

    // ── Chat empty state ──
    emptyTitle:         'How can I help?',
    emptyDesc:          'Query orders, update inventory, and send invoices\nwith a simple message.',
    quickActions: [
      "Show today's Coupang orders",
      "Show all channels' orders today",
      'Export this month\'s orders to Excel',
      'Mark Black L size as sold out',
    ],
    inputPlaceholder:   'Query orders, update stock, send invoices... ask anything',
    inputPlaceholderLocked: 'Approve or cancel before typing',
    inputHint:          'Enter to send · Shift+Enter for new line',

    // ── Chat errors ──
    errNoApiKey:        '⚙️ API key not configured. Click **Settings (⚙)** in the bottom left to add it.',
    errChannelAuth:     '🔌 Channel connection expired. Check your API key in **Settings > Channels**.',
    errLlm:             '🤖 AI processing error. Please try again in a moment.',
    errNetwork:         '🌐 Cannot reach the server. Please check your internet connection.',
    errUnexpected:      'An unexpected error occurred. Please refresh the page.',
    approved:           '✅ Done! The action was completed.',
    toastApproved:      'Approved — action completed.',
    toastCancelled:     'Action cancelled.',
    toastError:         'An error occurred.',
    cancelled:          'Action cancelled.',

    // ── Onboarding ──
    ob1Progress:        'Step 1 / 3',
    ob1Question:        'Do you manage your own inventory?',
    ob1Desc:            'This helps weave optimize your experience.',
    ob1YesTitle:        "Yes, I manage inventory",
    ob1YesSub:          'Enables stock forecasting and reorder alerts.',
    ob1NoTitle:         'No, I use dropshipping',
    ob1NoSub:           'Focuses on orders, invoices, and customer service.',
    ob1bProgress:       'Step 2 / 3',
    ob1bQuestion:       'How do you manage your stock?',
    ob1bDesc:           'This determines how weave handles stock sync across channels.',
    ob1bSharedTitle:    'Shared Warehouse',
    ob1bSharedSub:      'All channels draw from the same stock. A sale on one channel auto-updates the rest.',
    ob1bSplitTitle:     'Split by Channel',
    ob1bSplitSub:       'Each channel has its own allocated stock. Auto-sync is off; per-channel forecasts are on.',
    ob2Progress:        'Step 3 / 3',
    ob2Question:        'Select your sales channels',
    ob2Desc:            'Select 2 or more · You can change this in Settings anytime.',
    ob2TierBadge:       'Query only',
    ob2AblyWarn:        "Ably only supports 'Sellers' seller type for API integration",
    ob2AblyWarnBody:    'Please confirm your seller type first. Other types are not supported.',
    ob2Count0:          'Please select at least 2 channels',
    ob2Count1:          '1 selected — please select 1 more',
    ob2CountN:          (n) => `${n} selected`,
    ob2Next:            'Next — Connect APIs →',
    ob3ProgressText:    (cur, tot) => `API Setup ${cur} / ${tot}`,
    ob3SkipBtn:         'Skip for now',
    ob3SaveBtn:         'Save & Next →',
    ob3DoneBtn:         'Done',
    ob3Saving:          'Saving...',
    ob3SkipHint:        "You can always add API keys later in Settings.",

    // ── Connection status ──
    connChecking:       'Checking channel status…',
    connAllOk:          (n) => `All ${n} channels connected`,
    connSomeOk:         (n, ok) => `${ok} of ${n} channels connected`,
    connRefresh:        'Refresh',
    connBadgeOk:        'OK',
    connBadgeExpired:   'Expired',
    connBadgeMissing:   'Not set',
    connBadgeDemo:      'Demo',
    connMissingMsg:     'API key not configured. Add it in Settings.',
    connReconnectBtn:   'Reconnect',
    connStartBtn:       'Start Chatting',

    // ── Session ──
    sessionExpired:     'Your session has expired. Please log in again.',
  },
};

// ─── 컨텍스트 ──────────────────────────────────────────────────────────────────

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('pickit_lang');
    if (saved) return saved;
    // 시스템 언어 기반 기본값: 한국어면 'ko', 그 외 전부 'en'
    const sys = navigator.language || 'en';
    return sys.startsWith('ko') ? 'ko' : 'en';
  });

  const setLang = useCallback((l) => {
    localStorage.setItem('pickit_lang', l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key, ...args) => {
      const val = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.ko[key] ?? key;
      return typeof val === 'function' ? val(...args) : val;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
