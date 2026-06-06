// 모든 커넥터를 한 곳에서 내보냄
// 채널 추가 시 이 파일에 한 줄만 추가하면 toolHandler가 자동으로 인식

module.exports = {
  coupang: require('./coupang'),
  naver: require('./naver'),
  cafe24: require('./cafe24'),
  musinsa: require('./musinsa'),
  ably: require('./ably'),
  zigzag: require('./zigzag'),
};
