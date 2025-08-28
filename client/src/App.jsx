import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import NewRecord from './pages/NewRecord'
import AdminDashboard from './pages/AdminDashboard'
import UnitDetail from './pages/UnitDetail'
import { io } from 'socket.io-client'

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [role, setRole] = useState(localStorage.getItem('role'))
  const [name, setName] = useState(localStorage.getItem('name'))
  const login = (t, r, n) => { localStorage.setItem('token', t); localStorage.setItem('role', r); localStorage.setItem('name', n); setToken(t); setRole(r); setName(n) }
  const logout = () => { localStorage.clear(); setToken(null); setRole(null); setName(null) }
  return { token, role, name, login, logout }
}

export default function App() {
  const auth = useAuth()
  const nav = useNavigate()
  const [socketBanner, setSocketBanner] = useState(null)

  useEffect(() => {
    const s = io()
    s.on('newRecord', (data) => {
      setSocketBanner(`New record for Unit ${data.unitNumber} from ${data.driverName}`)
      setTimeout(() => setSocketBanner(null), 8000)
    })
    return () => s.close()
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Fleet Maintenance</h2>
        <nav style={{ display: 'flex', gap: 8 }}>
          {auth.token && auth.role === 'admin' && <Link to="/admin">Admin</Link>}
          {auth.token && <Link to="/new">New Entry</Link>}
        </nav>
        <div style={{ marginLeft: 'auto' }}>
          {auth.token ? (
            <>
              <span style={{ marginRight: 8 }}>Hi, {auth.name}</span>
              <button onClick={() => { auth.logout(); nav('/login') }}>Logout</button>
            </>
          ) : <Link to="/login">Login</Link>}
        </div>
      </header>
      {socketBanner && <div style={{ background:'#e9f5ff', border: '1px solid #8ac7ff', padding: 8, borderRadius: 6, marginBottom: 10 }}>{socketBanner}</div>}
      <Routes>
        <Route path="/login" element={<Login onAuthed={auth.login} />} />
        <Route path="/new" element={auth.token ? <NewRecord token={auth.token} /> : <Login onAuthed={auth.login} />} />
        <Route path="/admin" element={auth.token && auth.role==='admin' ? <AdminDashboard token={auth.token} /> : <Login onAuthed={auth.login} />} />
        <Route path="/units/:id" element={auth.token && auth.role==='admin' ? <UnitDetail token={auth.token} /> : <Login onAuthed={auth.login} />} />
        <Route path="*" element={<Login onAuthed={auth.login} />} />
      </Routes>
      <footer style={{ marginTop: 24, fontSize: 12, color: '#666' }}>
        MVP build – for production, add stronger auth, validation, and cloud storage.
      </footer>
    </div>
  )
}
