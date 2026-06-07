import { useState } from 'react';
import styles from './DemoPanel.module.css';

// 구현된 기능별 시나리오 — 버튼 클릭 시 채팅에 mock 메시지 주입
// 더미 주문 데이터 (ResultPanel/ExcelBar 표시용)
const DUMMY_ORDERS_COUPANG = [
  { channel: 'coupang', orderId: 'CP-10234', buyerName: '김민준', paidAt: '2026-06-07 09:12', status: '결제완료', totalPrice: 58000,
    items: [{ productName: '오버핏 후드티', optionValue: '블랙 XL', quantity: 1, price: 58000 }] },
  { channel: 'coupang', orderId: 'CP-10235', buyerName: '이서윤', paidAt: '2026-06-07 10:03', status: '배송준비중', totalPrice: 76000,
    items: [{ productName: '리넨 와이드팬츠', optionValue: '베이지 L', quantity: 2, price: 38000 }] },
  { channel: 'coupang', orderId: 'CP-10236', buyerName: '박지호', paidAt: '2026-06-07 10:45', status: '결제완료', totalPrice: 32000,
    items: [{ productName: '반팔 티셔츠', optionValue: '화이트 M', quantity: 1, price: 32000 }] },
  { channel: 'coupang', orderId: 'CP-10237', buyerName: '최수아', paidAt: '2026-06-07 11:20', status: '결제완료', totalPrice: 45000,
    items: [{ productName: '린넨 반팔', optionValue: '네이비 S', quantity: 1, price: 45000 }] },
  { channel: 'coupang', orderId: 'CP-10238', buyerName: '정현우', paidAt: '2026-06-07 12:00', status: '배송준비중', totalPrice: 89000,
    items: [{ productName: '맨투맨 스웻셔츠', optionValue: '그레이 L', quantity: 1, price: 89000 }] },
];

const DUMMY_ORDERS_ALL = [
  ...DUMMY_ORDERS_COUPANG,
  { channel: 'naver', orderId: 'NV-20110', buyerName: '강나은', paidAt: '2026-06-07 08:50', status: '결제완료', totalPrice: 62000,
    items: [{ productName: '슬랙스 팬츠', optionValue: '차콜 M', quantity: 1, price: 62000 }] },
  { channel: 'naver', orderId: 'NV-20111', buyerName: '윤도현', paidAt: '2026-06-07 09:30', status: '배송준비중', totalPrice: 44000,
    items: [{ productName: '크롭 티셔츠', optionValue: '화이트 S', quantity: 2, price: 22000 }] },
  { channel: 'naver', orderId: 'NV-20112', buyerName: '한소희', paidAt: '2026-06-07 10:15', status: '결제완료', totalPrice: 78000,
    items: [{ productName: '데님 재킷', optionValue: '인디고 블루 M', quantity: 1, price: 78000 }] },
  { channel: 'cafe24', orderId: 'CF-30041', buyerName: '임주원', paidAt: '2026-06-07 09:00', status: '결제완료', totalPrice: 55000,
    items: [{ productName: '니트 가디건', optionValue: '크림 L', quantity: 1, price: 55000 }] },
  { channel: 'cafe24', orderId: 'CF-30042', buyerName: '오세진', paidAt: '2026-06-07 11:40', status: '결제완료', totalPrice: 38000,
    items: [{ productName: '포켓 반팔', optionValue: '카키 XL', quantity: 1, price: 38000 }] },
];

const SCENARIOS = [
  {
    id: 'order_coupang',
    label: '쿠팡 주문 조회',
    category: '주문 조회',
    userMsg: '오늘 쿠팡 주문 보여줘',
    orders: DUMMY_ORDERS_COUPANG,
    filename: '2026_06_쿠팡_주문.xlsx',
    responses: [{
      role: 'assistant',
      content: `쿠팡 주문 **5건** 조회 완료 (오늘 00:00~현재)\n\n**결제완료** 3건 · **배송준비중** 2건`,
    }],
  },
  {
    id: 'order_all',
    label: '전체 채널 주문 조회',
    category: '주문 조회',
    userMsg: '오늘 전체 채널 주문 조회해줘',
    orders: DUMMY_ORDERS_ALL,
    filename: '2026_06_전체채널_주문.xlsx',
    responses: [{
      role: 'assistant',
      content: `오늘 전체 채널 주문 **10건** 조회 완료\n\n- 쿠팡 **5건**\n- 네이버 스마트스토어 **3건**\n- 카페24 **2건**\n\n총 결제완료 8건 · 배송준비중 2건`,
    }],
  },
  {
    id: 'firewall_price',
    label: '방화벽 — 가격 20% 초과 인하',
    category: '방화벽',
    userMsg: '쿠팡 후드티 가격 35,000원으로 내려줘',
    responses: [{
      role: 'assistant',
      content: `기존가 50,000원 대비 **30% 인하** 요청으로 방화벽이 실행을 보류했습니다.`,
      isDangerous:  true,
      firewallType: '금액 방화벽',
      channels:     '쿠팡',
      productCount: '1개',
      changeDesc:   '가격 −15,000원',
    }],
  },
  {
    id: 'firewall_scope',
    label: '방화벽 — 전체 품절 요청',
    category: '방화벽',
    userMsg: '전체 상품 품절 처리해줘',
    responses: [{
      role: 'assistant',
      content: `'전체' 키워드가 감지되어 방화벽이 실행을 보류했습니다.`,
      isDangerous:  true,
      firewallType: '범위 방화벽',
      channels:     '전체 (6개)',
      productCount: '전체',
      changeDesc:   '품절 처리',
    }],
  },
  {
    id: 'invoice',
    label: '송장 전송',
    category: '송장',
    userMsg: '오늘 쿠팡 주문 송장 전송해줘',
    responses: [{
      role: 'assistant',
      content: `✅ 쿠팡 오늘 주문 **5건** 송장 전송 완료\n\n- #10234 → CJ대한통운 123-4567-8901\n- #10235 → 한진택배 987-6543-2101\n- #10236 → CJ대한통운 111-2223-3334\n- #10237 → 로젠택배 444-5556-6670\n- #10238 → CJ대한통운 777-8889-9990`,
    }],
  },
  {
    id: 'excel',
    label: '엑셀 추출',
    category: '엑셀',
    userMsg: '이번 달 주문 엑셀로 뽑아줘',
    orders: DUMMY_ORDERS_ALL,
    filename: '2026_06_전체채널_매출_리포트.xlsx',
    responses: [{
      role: 'assistant',
      content: `이번 달 전체 채널 주문 **10건** 정리 완료\n\n2026_06_전체채널_매출_리포트.xlsx 파일이 저장되었습니다.`,
    }],
  },
  {
    id: 'connection_error',
    label: '연동 끊김 안내',
    category: '에러',
    userMsg: '네이버 주문 보여줘',
    responses: [
      {
        role: 'assistant',
        content: '네이버 스마트스토어 주문을 조회하려 했으나 연결 문제가 발생했습니다.',
      },
      {
        role: 'assistant',
        content: '현재 **[네이버 스마트스토어]** 연결이 만료되었습니다. 연동 설정 페이지에서 다시 연결해 주세요.',
        isConnectionError: true,
        link: '#',
      },
    ],
  },
  {
    id: 'prediction',
    label: '발주 예측',
    category: '예측',
    userMsg: '발주 예측 보여줘',
    responses: [{
      role: 'assistant',
      content: `📊 **발주 예측 리포트**\n\n**오버핏 후드 / 블랙 L**\n재고 23개 · 일 평균 2.3개 판매\n→ 예상 소진: **2026-08-15** (40일 후) ⚠️ 긴급\n→ 권장 발주: **207개**\n\n**리넨 팬츠 / 베이지 M**\n재고 58개 · 일 평균 1.1개 판매\n→ 예상 소진: **2026-09-28** (83일 후)\n→ 권장 발주: **99개**`,
    }],
  },
  {
    id: 'stock_sync',
    label: '재고 동기화',
    category: '재고',
    userMsg: '쿠팡에서 팔린 수량만큼 네이버·카페24 재고 동기화해줘',
    responses: [{
      role: 'assistant',
      content: `✅ 재고 동기화 완료\n\n**오버핏 후드 / 블랙 L** — 재고 −1\n- 쿠팡 → 원본 (판매 발생)\n- 네이버 스마트스토어 23 → **22**\n- 카페24 15 → **14**\n\n초과판매(Oversell) 방지 완료.`,
    }],
  },
];

// 카테고리별 그룹핑
const CATEGORIES = [...new Set(SCENARIOS.map((s) => s.category))];

export default function DemoPanel() {
  const [open, setOpen] = useState(true);

  function runScenario(scenario) {
    // ChatWidget이 수신하는 커스텀 이벤트로 mock 데이터 주입
    window.dispatchEvent(
      new CustomEvent('pickit-demo', {
        detail: {
          userMsg:  scenario.userMsg,
          responses: scenario.responses,
          orders:   scenario.orders   || null,  // ResultPanel/ExcelBar용
          filename: scenario.filename || null,
        },
      })
    );
  }

  return (
    <div className={`${styles.panel} ${open ? styles.panelOpen : styles.panelClosed}`}>

      {/* 토글 탭 */}
      <button className={styles.tab} onClick={() => setOpen((o) => !o)} title="데모 패널 열기/닫기">
        {open ? '›' : '‹'}
      </button>

      {open && (
        <div className={styles.inner}>
          <div className={styles.header}>
            <span className={styles.headerBadge}>DEV</span>
            <span className={styles.headerTitle}>데모 시나리오</span>
          </div>
          <p className={styles.headerSub}>버튼 클릭 시 mock 데이터로 채팅에 주입됩니다.</p>

          <div className={styles.list}>
            {CATEGORIES.map((cat) => (
              <div key={cat} className={styles.group}>
                <p className={styles.groupLabel}>{cat}</p>
                {SCENARIOS.filter((s) => s.category === cat).map((scenario) => (
                  <button
                    key={scenario.id}
                    className={styles.scenarioBtn}
                    onClick={() => runScenario(scenario)}
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
