import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useApp } from '../context/useApp'
import Header from './Header'
import Nav from './Nav'

export default function Layout() {
  const { online } = useApp()
  const [writeError, setWriteError] = useState('')

  useEffect(() => {
    const mostrarError = (event) => {
      setWriteError(event.detail.message)
    }
    window.addEventListener('my-pos:queued-write-failed', mostrarError)
    return () => window.removeEventListener('my-pos:queued-write-failed', mostrarError)
  }, [])

  return (
    <div className="app-shell">
      <Header />
      {!online && (
        <div className="offline-status" role="status">
          Estás en modo offline. Las operaciones se procesarán cuando se restablezca la conexión.
        </div>
      )}
      {writeError && (
        <div className="offline-status offline-status-error" role="alert">
          {writeError}
          <button type="button" onClick={() => setWriteError('')} aria-label="Cerrar aviso">×</button>
        </div>
      )}
      <main className="app-content">
        <Outlet />
      </main>
      <Nav />
    </div>
  )
}