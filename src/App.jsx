import { useEffect, useState } from 'react'
import { PAGES } from './data.js'
import Nav from './components/Nav.jsx'
import Home from './pages/Home.jsx'
import Chat from './pages/Chat.jsx'
import Journal from './pages/Journal.jsx'
import Rest from './pages/Rest.jsx'
import Help from './pages/Help.jsx'

function readPage() {
  const id = window.location.hash.replace(/^#\/?/, '')
  return PAGES.some((p) => p.id === id) ? id : 'home'
}

export default function App() {
  const [page, setPage] = useState(readPage)
  const [mood, setMood] = useState(null)

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
    chat: <Chat mood={mood} go={go} />,
    journal: <Journal />,
    rest: <Rest />,
    help: <Help />,
  }

  return (
    <div className="app">
      <Nav page={page} go={go} />
      <main className="main" key={page}>
        {screens[page]}
      </main>
    </div>
  )
}
