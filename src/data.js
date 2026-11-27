export const PAGES = [
  { id: 'home', label: '홈', icon: 'home' },
  { id: 'chat', label: '마음 대화', icon: 'chat' },
  { id: 'journal', label: '마음 기록', icon: 'journal' },
  { id: 'rest', label: '마음 휴식', icon: 'rest' },
  { id: 'help', label: '도움받기', icon: 'help' },
]

export const EMOTIONS = [
  { id: 'calm', label: '평온해요', emoji: '🌿', tone: 'blue',
    comfort: '잔잔한 오늘을 잘 지켜 냈네요. 이런 날이 오기까지 애쓴 나에게, 오늘은 고맙다고 말해 줘요.' },
  { id: 'happy', label: '기뻐요', emoji: '🌼', tone: 'cream',
    comfort: '좋은 일이 있었군요. 그 웃음, 그동안 충분히 기다려 온 거예요. 마음껏 기뻐해도 돼요.' },
  { id: 'tired', label: '지쳤어요', emoji: '🌙', tone: 'lavender',
    comfort: '얼마나 오래 혼자 버텨 왔을까요. 오늘은 아무것도 증명하지 않아도 돼요. 그냥 쉬어요.' },
  { id: 'sad', label: '슬퍼요', emoji: '💧', tone: 'blue',
    comfort: '슬픈 마음을 꾹 참느라 많이 아팠죠. 여기서는 괜찮은 척하지 않아도 돼요.' },
  { id: 'anxious', label: '불안해요', emoji: '🍃', tone: 'lavender',
    comfort: '마음이 계속 조마조마해서 많이 지쳤겠어요. 지금 이 순간만큼은, 내가 옆에 있을게요.' },
  { id: 'angry', label: '화가 나요', emoji: '🔥', tone: 'cream',
    comfort: '화가 날 만큼 마음이 다쳤던 거예요. 그 마음, 이상한 게 아니에요. 여기선 꺼내 놓아도 돼요.' },
  { id: 'lonely', label: '외로워요', emoji: '☁️', tone: 'lavender',
    comfort: '아무도 내 마음을 모르는 것 같은 밤이죠. 그래도 이렇게 와 줘서 다행이에요. 지금은 혼자가 아니에요.' },
  { id: 'empty', label: '잘 모르겠어요', emoji: '🫧', tone: 'blue',
    comfort: '무슨 마음인지 몰라도 괜찮아요. 이름 붙이지 않아도, 그냥 여기 잠시 머물러요.' },
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
