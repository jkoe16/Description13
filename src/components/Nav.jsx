import { PAGES } from '../data.js'
import Icon from './Icon.jsx'

export default function Nav({ page, go }) {
  return (
    <>
      <aside className="sidebar">
        <button className="brand" onClick={() => go('home')}>
          <span className="brand-mark">곁</span>
          <span>
            <strong>마음곁</strong>
            <small>마음이 쉬어 가는 곳</small>
          </span>
        </button>
        <nav className="side-menu" aria-label="주 메뉴">
          {PAGES.map((p) => (
            <button key={p.id} className={'side-item' + (page === p.id ? ' active' : '')}
              aria-current={page === p.id ? 'page' : undefined} onClick={() => go(p.id)}>
              <Icon name={p.icon} />
              {p.label}
            </button>
          ))}
        </nav>
        <button className={'side-item side-account' + (page === 'account' ? ' active' : '')}
          aria-current={page === 'account' ? 'page' : undefined} onClick={() => go('account')}>
          <Icon name="user" />
          내 계정
        </button>
        <a className="side-sos" href="tel:109">
          <Icon name="phone" size={18} />
          <span>
            <strong>지금 힘들다면 109</strong>
            <small>24시간 자살예방상담</small>
          </span>
        </a>
      </aside>

      <nav className="tabbar" aria-label="하단 메뉴">
        {PAGES.map((p) => (
          <button key={p.id} className={'tab' + (page === p.id ? ' active' : '')}
            aria-current={page === p.id ? 'page' : undefined} onClick={() => go(p.id)}>
            <Icon name={p.icon} size={21} />
            <span>{p.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
