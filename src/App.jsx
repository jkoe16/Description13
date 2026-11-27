import { useEffect, useState } from 'react'
import { PAGES } from './data.js'
import Nav from './components/Nav.jsx'
import Home from './pages/Home.jsx'
import Chat from './pages/Chat.jsx'
import Journal from './pages/Journal.jsx'
import Rest from './pages/Rest.jsx'
import Help from './pages/Help.jsx'
import Account from './pages/Account.jsx'
import Cry from './pages/Cry.jsx'

function readPage() {
  const id = window.location.hash.replace(/^#\/?/, '')
  return id === 'account' || id === 'cry' || PAGES.some((p) => p.id === id) ? id : 'home'
}

export default function App() {
  const [page, setPage] = useState(readPage)
  const [mood, setMood] = useState(null)
  const [update, setUpdate] = useState(false) // 새 버전이 준비됐는지
  // 마음 대화는 한 번 열면 다른 화면에 다녀와도 그대로 남아 있게 한다 (실수로 메뉴를 눌러도 대화가 사라지지 않게)
  const [chatOpened, setChatOpened] = useState(page === 'chat')
  useEffect(() => { if (page === 'chat') setChatOpened(true) }, [page])

  useEffect(() => {
    const on = () => setUpdate(true)
    window.addEventListener('maeumgyeot-update', on)
    return () => window.removeEventListener('maeumgyeot-update', on)
  }, [])

  useEffect(() => {
    const onHash = () => {
      setPage(readPage())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (id) => {
    window.location.hash = '/' + id
  }

  const screens = {
    home: <Home mood={mood} setMood={setMood} go={go} />,
    journal: <Journal go={go} />,
    rest: <Rest />,
    help: <Help />,
    account: <Account go={go} />,
  }

  // 눈물 쉼터는 메뉴 없이 화면 전체를 쓴다 (그동안 마음 대화는 숨겨 둔 채 남겨 둔다)
  return (
    <>
    {page === 'cry' && <Cry go={go} />}
    <div className="app" hidden={page === 'cry'}>
      <Nav page={page} go={go} />
      {update && (
        <div className="update-bar" role="status">
          <span>새 버전이 준비됐어요.</span>
          <button className="btn primary small" onClick={() => window.location.reload()}>바꾸기</button>
          <button className="link" onClick={() => setUpdate(false)}>나중에</button>
        </div>
      )}
      {screens[page] && (
        <main className="main" key={page}>
          {screens[page]}
        </main>
      )}
      {chatOpened && (
        <main className="main" hidden={page !== 'chat'}>
          <Chat mood={mood} go={go} active={page === 'chat'} />
        </main>
      )}
    </div>
    </>
  )
}
