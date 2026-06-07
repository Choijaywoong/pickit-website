// 데모 목 모드: 실제 API 키 없이 POC 시연용 현실적 응답을 반환
// llm.js에서 DEMO_MODE=true 또는 Anthropic API 키 없을 때 호출됨
// 키워드 기반으로 의도를 파악하고, 메시지 언어를 자동 감지해 응답

// ─── 언어 감지 ────────────────────────────────────────────────────────────────

function isKorean(msg) {
  return /[가-힣]/.test(msg);
}

// ─── 목 주문 데이터 ────────────────────────────────────────────────────────────

function makeTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function makeMockOrders(platform, count) {
  const products = [
    { name: '오버핏 블랙 맨투맨', options: ['S', 'M', 'L', 'XL'], price: 39000 },
    { name: '와이드 데님 청바지', options: ['26인치', '28인치', '30인치'], price: 69000 },
    { name: '화이트 린넨 반팔', options: ['프리사이즈'], price: 28000 },
    { name: '크롭 후드집업 그레이', options: ['S', 'M', 'L'], price: 52000 },
    { name: '스트라이프 셔츠', options: ['M', 'L', 'XL'], price: 43000 },
    { name: '베이직 레깅스 블랙', options: ['S', 'M', 'L'], price: 22000 },
  ];
  const buyers = ['김지은', '이서연', '박민준', '최수아', '정하은', '강도윤', '윤지호', '임채원'];
  const couriers = ['CJ대한통운', '한진택배', '롯데택배'];
  const today = makeTodayStr();

  return Array.from({ length: count }, (_, i) => {
    const p   = products[i % products.length];
    const opt = p.options[i % p.options.length];
    const qty = (i % 3) + 1;
    return {
      orderId:    `${platform.toUpperCase()}-${Date.now() - i * 7_000}-${i + 1}`,
      status:     i % 4 === 0 ? '결제완료' : '출고대기',
      buyerName:  buyers[i % buyers.length],
      totalPrice: p.price * qty,
      paidAt:     `${today}T${String(9 + (i % 10)).padStart(2, '0')}:${String(i * 5 % 60).padStart(2, '0')}:00`,
      courier:    couriers[i % couriers.length],
      items: [{
        productName: p.name,
        optionValue: opt,
        quantity:    qty,
        price:       p.price,
      }],
    };
  });
}

const CHANNEL_COUNTS = { coupang: 12, naver: 8, cafe24: 3, musinsa: 5, ably: 4, zigzag: 2 };
const CHANNEL_KR = {
  coupang: '쿠팡', naver: '네이버', cafe24: '카페24',
  musinsa: '무신사', ably: '에이블리', zigzag: '지그재그',
};
const CHANNEL_EN = {
  coupang: 'Coupang', naver: 'Naver', cafe24: 'Cafe24',
  musinsa: 'Musinsa', ably: 'Ably', zigzag: 'Zigzag',
};

// ─── 의도 파악 ─────────────────────────────────────────────────────────────────

function detectIntent(msg) {
  const m = msg.toLowerCase();
  // 한국어 키워드
  if (/엑셀|뽑아|다운|추출/.test(m))                   return 'excel';
  if (/송장|운송장|발송|배송번호/.test(m))              return 'invoice';
  if (/품절|재고|수량|솔드아웃/.test(m))                return 'stock';
  if (/가격|원|할인|인상|인하/.test(m))                 return 'price';
  if (/주문|조회|보여|확인|현황|몇\s*건/.test(m))       return 'query';
  // 영어 키워드
  if (/excel|export|download|extract/.test(m))          return 'excel';
  if (/invoice|tracking|ship|dispatch/.test(m))         return 'invoice';
  if (/sold.?out|stock|inventory|out.of.stock/.test(m)) return 'stock';
  if (/price|discount|raise|lower|₩|\$/.test(m))       return 'price';
  if (/order|show|check|query|status|how many/.test(m)) return 'query';
  return 'general';
}

function detectChannels(msg, activeChannels) {
  const m = msg.toLowerCase();
  const mentioned = [];
  if (/쿠팡|coupang/.test(m))                   mentioned.push('coupang');
  if (/네이버|스마트스토어|naver/.test(m))        mentioned.push('naver');
  if (/카페24|cafe24/.test(m))                   mentioned.push('cafe24');
  if (/무신사|musinsa/.test(m))                  mentioned.push('musinsa');
  if (/에이블리|ably/.test(m))                   mentioned.push('ably');
  if (/지그재그|zigzag/.test(m))                 mentioned.push('zigzag');

  if (mentioned.length === 0) {
    return (activeChannels?.length ? activeChannels : Object.keys(CHANNEL_COUNTS)).slice(0, 3);
  }
  return mentioned;
}

// ─── 응답 생성기 ───────────────────────────────────────────────────────────────

function handleQuery(msg, activeChannels) {
  const ko = isKorean(msg);
  const channels = detectChannels(msg, activeChannels);
  const allOrders = [];
  const NAMES = ko ? CHANNEL_KR : CHANNEL_EN;

  const summary = channels.map((ch) => {
    const count = CHANNEL_COUNTS[ch] || 2;
    const orders = makeMockOrders(ch, count);
    allOrders.push(...orders);
    return `${NAMES[ch] || ch} **${count}${ko ? '건' : ' orders'}**`;
  }).join(', ');

  const total = allOrders.length;
  const reply = ko
    ? `오늘 주문 현황입니다.\n\n${summary}\n\n총 **${total}건** — 엑셀로 뽑아드릴까요?`
    : `Here are today's orders.\n\n${summary}\n\n**${total} orders total** — Would you like to export to Excel?`;

  return { reply, orders: allOrders };
}

function handleExcel(msg, activeChannels) {
  const ko = isKorean(msg);
  const channels = detectChannels(msg, activeChannels);
  const allOrders = [];
  channels.forEach((ch) => {
    const count = CHANNEL_COUNTS[ch] || 2;
    allOrders.push(...makeMockOrders(ch, count));
  });

  const today = makeTodayStr().replace(/-/g, '_');
  const filename = `${today}_${ko ? '전체채널_주문내역' : 'all_channels_orders'}.xlsx`;

  return {
    reply: ko
      ? `${allOrders.length}건 주문 데이터를 엑셀로 준비했습니다. 아래 파일 카드를 클릭하면 다운로드됩니다.`
      : `${allOrders.length} orders ready for export. Click the file card below to download.`,
    excelData: { orders: allOrders },
    filename,
  };
}

function handleStock(msg) {
  const ko = isKorean(msg);
  const optionMatch = msg.match(/([가-힣a-zA-Z]+\s*[XL|L|M|S|XS|xl|l|m|s|xs]+)/i);
  const option = optionMatch ? optionMatch[1].trim() : (ko ? 'L 사이즈' : 'L size');

  return {
    held: true,
    reason: ko
      ? `⚠️ **방화벽 검토 필요**\n\n**"${option}" 품절 처리** 요청입니다.\n\n- 대상 채널: 쿠팡, 네이버, 카페24 (3개)\n- 수정 항목: 재고 수량 → 0 (품절)\n\n실수로 전체 품절 처리되면 주문이 막힙니다. 최종 승인 후 진행됩니다.`
      : `⚠️ **Firewall Review Required**\n\n**"${option}" sold-out** request.\n\n- Channels: Coupang, Naver, Cafe24 (3 channels)\n- Change: Stock qty → 0 (sold out)\n\nThis will block all new orders. Please confirm to proceed.`,
    type: 'scope',
    firewallType: ko ? '범위 방화벽' : 'Scope Firewall',
    channels: ko ? '쿠팡, 네이버, 카페24' : 'Coupang, Naver, Cafe24',
    productCount: ko ? '3개 채널' : '3 channels',
    changeDesc: ko ? `${option} 품절 처리` : `${option} → sold out`,
    toolInput: { _demo: true },
  };
}

function handlePrice(msg) {
  const ko = isKorean(msg);
  const priceMatch = msg.match(/(\d[\d,]+)\s*(원|krw|\$)?/i);
  const newPrice = priceMatch ? priceMatch[1].replace(/,/g, '') : '29000';
  const diff = Math.round(Math.abs(39000 - parseInt(newPrice, 10)) / 39000 * 100);

  return {
    held: true,
    reason: ko
      ? `⚠️ **방화벽 검토 필요**\n\n**가격 변경** 요청입니다.\n\n- 현재 가격: 39,000원\n- 변경 가격: ${parseInt(newPrice).toLocaleString()}원\n- 변경폭: **${diff}%**\n\n±20% 이상 변경입니다. 최종 승인 후 진행됩니다.`
      : `⚠️ **Firewall Review Required**\n\n**Price change** requested.\n\n- Current price: ₩39,000\n- New price: ₩${parseInt(newPrice).toLocaleString()}\n- Change: **${diff}%**\n\nThis exceeds the ±20% threshold. Please confirm to proceed.`,
    type: 'price',
    firewallType: ko ? '금액 방화벽' : 'Price Firewall',
    channels: ko ? '쿠팡, 네이버' : 'Coupang, Naver',
    productCount: ko ? '1개 상품' : '1 product',
    changeDesc: ko ? `가격 → ${parseInt(newPrice).toLocaleString()}원` : `Price → ₩${parseInt(newPrice).toLocaleString()}`,
    toolInput: { _demo: true },
  };
}

function handleInvoice(msg) {
  const ko = isKorean(msg);
  const trackingMatch = msg.match(/\d{10,13}/);
  const tracking = trackingMatch ? trackingMatch[0] : '1234567890123';

  return {
    reply: ko
      ? `✅ 송장이 전송되었습니다.\n\n- 택배사: CJ대한통운\n- 운송장 번호: ${tracking}\n- 처리 채널: 쿠팡, 네이버 스마트스토어\n\n구매자에게 배송 알림이 자동 발송됩니다.`
      : `✅ Invoice sent successfully.\n\n- Courier: CJ Logistics\n- Tracking #: ${tracking}\n- Channels: Coupang, Naver Smart Store\n\nShipping notifications have been sent to buyers.`,
  };
}

function handleGeneral(msg) {
  const ko = isKorean(msg);

  if (ko) {
    const examples = [
      '"오늘 전체 채널 주문 보여줘" — 전체 주문 현황 조회',
      '"블랙 L 사이즈 품절 처리해줘" — 방화벽 검토 후 재고 수정',
      '"이번 달 주문 엑셀로 뽑아줘" — 엑셀 파일 다운로드',
      '"주문번호 123 송장 456789 입력해줘" — 송장 전송',
    ];
    return {
      reply: `안녕하세요! PICKIT 데모 모드입니다. 아래와 같이 말씀해보세요.\n\n${examples.map((e) => `- ${e}`).join('\n')}\n\n실제 운영 시에는 연동된 채널 데이터를 실시간으로 처리합니다.`,
    };
  } else {
    const examples = [
      '"Show me all channel orders today" — Query all orders',
      '"Mark Black L size as sold out" — Firewall review + stock update',
      '"Export this month\'s orders to Excel" — Download Excel file',
      '"Send invoice 456789 for order 123" — Send shipping invoice',
    ];
    return {
      reply: `Hello! This is PICKIT demo mode. Try asking:\n\n${examples.map((e) => `- ${e}`).join('\n')}\n\nIn production, PICKIT connects to your live channel data in real time.`,
    };
  }
}

// ─── 메인 진입점 ───────────────────────────────────────────────────────────────

function handleDemoChat(userMessage, activeChannels) {
  const intent = detectIntent(userMessage);

  switch (intent) {
    case 'query':   return handleQuery(userMessage, activeChannels);
    case 'excel':   return handleExcel(userMessage, activeChannels);
    case 'stock':   return handleStock(userMessage);
    case 'price':   return handlePrice(userMessage);
    case 'invoice': return handleInvoice(userMessage);
    default:        return handleGeneral(userMessage);
  }
}

module.exports = { handleDemoChat };
