import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Login({ onAuthed }) {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState(null)
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await axios.post('/api/auth/login', { email, password })
      onAuthed(res.data.token, res.data.role, res.data.name)
      nav(res.data.role === 'admin' ? '/admin' : '/new')
    } catch (e) {
      setError(e?.response?.data?.error || 'Login failed')
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 10 }}>
      <h3>Login</h3>
      <label>Email<input value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      <button type="submit">Sign in</button>
      <p style={{ fontSize: 12, color: '#666' }}>Try driver login: driver@example.com / driver123</p>
    </form>
  )
}
