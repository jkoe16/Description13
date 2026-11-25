export const PAGES = [
  { id: 'home', label: '홈', icon: 'home' },
  { id: 'chat', label: '마음 대화', icon: 'chat' },
  { id: 'journal', label: '마음 기록', icon: 'journal' },
  { id: 'rest', label: '마음 휴식', icon: 'rest' },
  { id: 'help', label: '도움받기', icon: 'help' },
]

export const EMOTIONS = [
  { id: 'calm', label: '평온해요', emoji: '🌿', tone: 'blue',
    comfort: '잔잔한 오늘을 잘 지켜 내고 있네요. 이 편안함을 천천히 느껴 보세요.' },
  { id: 'happy', label: '기뻐요', emoji: '🌼', tone: 'cream',
    comfort: '좋은 일이 있었군요. 그 기쁨을 함께 나눌 수 있어 반가워요.' },
  { id: 'tired', label: '지쳤어요', emoji: '🌙', tone: 'lavender',
    comfort: '많이 애쓰셨어요. 오늘은 조금 쉬어 가도 괜찮아요.' },
  { id: 'sad', label: '슬퍼요', emoji: '💧', tone: 'blue',
    comfort: '슬픈 마음이 드는 건 자연스러운 일이에요. 혼자 견디지 않아도 돼요.' },
  { id: 'anxious', label: '불안해요', emoji: '🍃', tone: 'lavender',
    comfort: '마음이 조마조마하군요. 숨을 한 번 길게 내쉬고, 지금 여기에 함께 있어요.' },
  { id: 'angry', label: '화가 나요', emoji: '🔥', tone: 'cream',
    comfort: '화가 날 만한 일이 있었나 봐요. 그 마음도 충분히 이해받을 자격이 있어요.' },
  { id: 'lonely', label: '외로워요', emoji: '☁️', tone: 'lavender',
    comfort: '외로운 마음이 들 때 이렇게 찾아와 주어서 고마워요. 곁에 있을게요.' },
  { id: 'empty', label: '잘 모르겠어요', emoji: '🫧', tone: 'blue',
    comfort: '마음을 정확히 몰라도 괜찮아요. 모르는 채로 머물러도 돼요.' },
]

export const CHAT_MODES = [
  // 각 방식의 실제 답변 지침은 server/chat.js 의 MODES 에 있어요
  { id: 'listen', label: '경청', desc: '조용히 들어 줘요' },
  { id: 'empathy', label: '공감', desc: '마음을 함께 느껴요' },
  { id: 'think', label: '함께 생각하기', desc: '천천히 정리해 봐요' },
  { id: 'courage', label: '용기 주기', desc: '한 걸음 응원해요' },
]

export const BREATHING = [
  { id: 'box', name: '상자 호흡', summary: '4초씩 네 번, 마음을 가지런히',
    phases: [
      { type: 'in', label: '들이쉬기', sec: 4 },
      { type: 'hold', label: '멈추기', sec: 4 },
      { type: 'out', label: '내쉬기', sec: 4 },
      { type: 'hold', label: '멈추기', sec: 4 },
    ] },
  { id: '478', name: '4-7-8 호흡', summary: '길게 내쉬며 긴장 풀기',
    phases: [
      { type: 'in', label: '들이쉬기', sec: 4 },
      { type: 'hold', label: '멈추기', sec: 7 },
      { type: 'out', label: '내쉬기', sec: 8 },
    ] },
  { id: 'even', name: '편안한 호흡', summary: '5초 들이쉬고 5초 내쉬기',
    phases: [
      { type: 'in', label: '들이쉬기', sec: 5 },
      { type: 'out', label: '내쉬기', sec: 5 },
    ] },
]

export const EMERGENCY = [
  { number: '109', name: '자살예방상담전화', desc: '죽고 싶은 마음이 들 때, 24시간 상담', tone: 'lavender' },
  { number: '112', name: '경찰', desc: '위험하거나 범죄 피해가 걱정될 때', tone: 'blue' },
  { number: '119', name: '소방·구급', desc: '다치거나 응급 치료가 필요할 때', tone: 'cream' },
]

export const AGENCIES = [
  { number: '1577-0199', name: '정신건강위기상담전화', desc: '정신건강 위기 상담 (24시간)' },
  { number: '1388', name: '청소년상담전화', desc: '청소년 고민 상담 (24시간)' },
  { number: '129', name: '보건복지상담센터', desc: '복지·의료 지원 안내' },
]
