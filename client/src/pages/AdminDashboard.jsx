import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function AdminDashboard({ token }) {
  const client = api(token)
  const [units, setUnits] = useState([])
  const [records, setRecords] = useState([])
  const [filterUnit, setFilterUnit] = useState('')

  useEffect(() => {
    client.get('/units').then(r => setUnits(r.data))
    loadRecords()
  }, [])

  const loadRecords = async (unitId = '') => {
    const r = await client.get('/maintenance-records', { params: unitId ? { unit_id: unitId } : {} })
    setRecords(r.data)
  }

  const addUnit = async () => {
    const unit_number = prompt('New unit number?')
    if (!unit_number) return
    const type = prompt('Type (tractor/trailer)?', 'tractor')
    await client.post('/units', { unit_number, type })
    const r = await client.get('/units')
    setUnits(r.data)
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h3>Admin Dashboard</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={filterUnit} onChange={e=>{ setFilterUnit(e.target.value); loadRecords(e.target.value) }}>
          <option value="">All units</option>
          {units.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
        </select>
        <button onClick={addUnit}>Add Unit</button>
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ textAlign:'left' }}>
            <th style={{ borderBottom:'1px solid #ddd' }}>Record #</th>
            <th style={{ borderBottom:'1px solid #ddd' }}>Unit</th>
            <th style={{ borderBottom:'1px solid #ddd' }}>Mileage</th>
            <th style={{ borderBottom:'1px solid #ddd' }}>Company</th>
            <th style={{ borderBottom:'1px solid #ddd' }}>Est. Time</th>
            <th style={{ borderBottom:'1px solid #ddd' }}>Created</th>
            <th style={{ borderBottom:'1px solid #ddd' }}></th>
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.unit_number}</td>
              <td>{r.mileage}</td>
              <td>{r.company_name}</td>
              <td>{r.estimated_time_minutes}m</td>
              <td>{r.created_at}</td>
              <td><Link to={`/units/${r.unit_id}`}>View unit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
