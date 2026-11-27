// 앱 전체에서 쓰는 선 아이콘. 같은 굵기·같은 끝 모양으로 그려서 어디서나 한 가족처럼 보이게 한다.
// 감정 아이콘(mood-*)은 이모지 대신 쓴다. 이모지는 기기마다 모양이 달라서 화면이 들쭉날쭉해 보인다.
const PATHS = {
  home: 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z',
  chat: 'M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V15h0a2.5 2.5 0 0 1-2-2.5z',
  journal: 'M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1z',
  rest: 'M12 20c-4-2.5-7-5.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 3.5-3 6.5-7 9z',
  help: 'M12 21s-7-4.4-7-10.5V6l7-3 7 3v4.5C19 16.6 12 21 12 21zM9 11.5l2 2 4-4',
  send: 'M5 12 19 5l-4 14-3.5-5.5zM11.5 13.5 19 5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0',
  phone: 'M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 6a2 2 0 0 1 2-2z',
  chevron: 'M9.5 6 15.5 12l-6 6',
  check: 'M5.5 12.5 10 17l8.5-9.5',
  sparkle: 'M12 4.5 13.6 9l4.4 1.6-4.4 1.6L12 16.7l-1.6-4.5L6 10.6 10.4 9zM18.5 16.5l.6 1.6 1.4.4-1.4.5-.6 1.5-.5-1.5-1.5-.5 1.5-.4z',
  book: 'M4 5.8c2.6-1 5.4-.9 8 .7 2.6-1.6 5.4-1.7 8-.7V19c-2.6-1-5.4-.9-8 .7-2.6-1.6-5.4-1.7-8-.7zM12 6.5v13.2',
  moon: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
  // 감정
  'mood-calm': 'M6 18.5C6 11 10.5 6 19 5.5 18.6 14 14 18.5 6.5 18.5zM6 18.5l7.5-7.5',
  'mood-happy': 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  'mood-tired': 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
  'mood-sad': 'M12 3.5c3 3.6 6 6.9 6 10.5a6 6 0 0 1-12 0c0-3.6 3-6.9 6-10.5z',
  'mood-anxious': 'M3.5 9H14a2.5 2.5 0 1 0-2.5-2.5M3.5 13h14a2.5 2.5 0 1 1-2.5 2.5M3.5 17H10',
  'mood-angry': 'M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.5 2.6-5.6 3.8-8.8 2 1.3 3 3.2 3 5 1-.6 1.7-1.6 2-2.9 2 1.7 3.2 4 3.2 6.6 0 3.7-2.6 6.3-5.5 6.3z',
  'mood-lonely': 'M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.5A3.3 3.3 0 0 0 7 18z',
  'mood-empty': 'M13 9.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM18.5 15a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM10.5 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
}

export default function Icon({ name, size = 22, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}

// 감정 아이콘: 감정 색의 동그란 바탕 위에 선 아이콘
export function MoodIcon({ id, size = 22 }) {
  return (
    <span className="mood-icon" aria-hidden="true">
      <Icon name={'mood-' + id} size={size} />
    </span>
  )
}

// 마음곁 표시: 두 마음이 나란히 기대어 있는 모양
export function BrandMark({ size = 42 }) {
  return (
    <span className="brand-mark" aria-hidden="true" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" width={size * 0.72} height={size * 0.72} focusable="false">
        <circle cx="15.5" cy="22" r="8.5" fill="#fff" opacity="0.96" />
        <circle cx="25" cy="17.5" r="7" fill="#fff" opacity="0.55" />
      </svg>
    </span>
  )
}
