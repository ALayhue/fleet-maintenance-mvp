import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'

export default function UnitDetail({ token }) {
  const { id } = useParams()
  const client = api(token)
  const [records, setRecords] = useState([])

  useEffect(() => {
    client.get('/maintenance-records', { params: { unit_id: id } }).then(r => setRecords(r.data))
  }, [id])

  return (
    <div>
      <h3>Unit #{id} - Service History</h3>
      <ul>
        {records.map(r => (
          <li key={r.id}>
            <div><b>Record:</b> {r.id} | <b>Mileage:</b> {r.mileage} | <b>Company:</b> {r.company_name} | <b>Est:</b> {r.estimated_time_minutes}m</div>
            <div><b>Notes:</b> {r.notes}</div>
            <div><b>Date:</b> {r.created_at}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
