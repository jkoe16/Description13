// 밤 모드: 밤 9시~아침 6시, 또는 휴대폰이 다크 모드일 때 앱 전체를 어둡게 한다.
// 내 계정에서 '자동 / 항상 밝게 / 항상 어둡게'를 고를 수 있고, 고른 것은 이 기기에 저장한다.
const DAY_BAR = '#FBF6EE'
const NIGHT_BAR = '#16142A'
const dark = window.matchMedia?.('(prefers-color-scheme: dark)')

export const isNightHour = (d = new Date()) => d.getHours() >= 21 || d.getHours() < 6

const KEY = 'maeumgyeot-theme'
export const THEME_CHOICES = [
  { id: 'auto', label: '자동', desc: '밤 9시~아침 6시나 휴대폰이 다크 모드일 때 어둡게' },
  { id: 'day', label: '항상 밝게', desc: '시간과 상관없이 늘 밝은 화면' },
  { id: 'night', label: '항상 어둡게', desc: '시간과 상관없이 늘 어두운 화면' },
]

export function getThemeChoice() {
  try {
    const v = localStorage.getItem(KEY)
    return THEME_CHOICES.some((c) => c.id === v) ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export function setThemeChoice(choice) {
  try {
    if (choice === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch { /* 저장하지 못해도 이번에는 바로 바뀐다 */ }
  apply(choice)
}

function apply(choice = getThemeChoice()) {
  const night = choice === 'night' || (choice === 'auto' && (isNightHour() || Boolean(dark?.matches)))
  const root = document.documentElement
  if ((root.dataset.theme === 'night') === night) return
  root.dataset.theme = night ? 'night' : 'day'
  const meta = document.querySelector('meta[name="theme-color"]')
  // 눈물 쉼터에 있을 때는 쉼터가 정한 색을 그대로 둔다
  if (meta && !document.querySelector('.cry-room')) meta.setAttribute('content', night ? NIGHT_BAR : DAY_BAR)
}

export function startTheme() {
  apply()
  setInterval(() => apply(), 60000) // 시간이 지나 밤이 되면 바뀌도록
  dark?.addEventListener?.('change', () => apply())
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && apply())
}

export const barColor = () => (document.documentElement.dataset.theme === 'night' ? NIGHT_BAR : DAY_BAR)
