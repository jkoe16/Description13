// 밤 모드: 밤 9시~아침 6시, 또는 휴대폰이 다크 모드일 때 앱 전체를 어둡게 한다.
const DAY_BAR = '#FBF6EE'
const NIGHT_BAR = '#16142A'
const dark = window.matchMedia?.('(prefers-color-scheme: dark)')

export const isNightHour = (d = new Date()) => d.getHours() >= 21 || d.getHours() < 6

function apply() {
  const night = isNightHour() || Boolean(dark?.matches)
  const root = document.documentElement
  if ((root.dataset.theme === 'night') === night) return
  root.dataset.theme = night ? 'night' : 'day'
  const meta = document.querySelector('meta[name="theme-color"]')
  // 눈물 쉼터에 있을 때는 쉼터가 정한 색을 그대로 둔다
  if (meta && !document.querySelector('.cry-room')) meta.setAttribute('content', night ? NIGHT_BAR : DAY_BAR)
}

export function startTheme() {
  apply()
  setInterval(apply, 60000) // 시간이 지나 밤이 되면 바뀌도록
  dark?.addEventListener?.('change', apply)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && apply())
}

export const barColor = () => (document.documentElement.dataset.theme === 'night' ? NIGHT_BAR : DAY_BAR)
