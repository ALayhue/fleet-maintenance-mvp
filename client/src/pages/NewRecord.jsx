import React, { useEffect, useState } from 'react'
import { api } from '../api'
import SignaturePad from '../components/SignaturePad'

export default function NewRecord({ token }) {
  const client = api(token)
  const [units, setUnits] = useState([])
  const [form, setForm] = useState({
    unit_id: '',
    driver_id: null,
    technician_id: null,
    company_name: '',
    mileage: '',
    estimated_time_minutes: '',
    notes: '',
    vehicle_type: 'tractor'
  })
  const [items, setItems] = useState([])
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)

  useEffect(() => {
    client.get('/units').then(r => setUnits(r.data))
  }, [])

  useEffect(() => {
    client.get('/checklist-templates', { params: { vehicle_type: form.vehicle_type } })
      .then(r => setItems(r.data.items.map(x => ({...x, status: 'pass', comments: ''})))) 
  }, [form.vehicle_type])

  const updateItem = (id, patch) => {
    setItems(prev => prev.map(i => i.id===id ? {...i, ...patch} : i))
  }

  const submit = async (e) => {
    e.preventDefault()
    const data = new FormData()
    Object.entries(form).forEach(([k,v]) => data.append(k, v))
    data.append('checklistItems', JSON.stringify(items.map(i => ({ item_id: i.id, status: i.status, comments: i.comments }))))
    if (signatureDataUrl) {
      const res = await fetch(signatureDataUrl)
      const blob = await res.blob()
      data.append('signature', new File([blob], 'signature.png', { type: 'image/png' }))
    }
    const r = await client.post('/maintenance-records', data, { headers: { 'Content-Type': 'multipart/form-data' } })
    alert('Saved record #' + r.data.id)
    setForm({ unit_id: '', driver_id: null, technician_id: null, company_name: '', mileage: '', estimated_time_minutes: '', notes: '', vehicle_type: 'tractor' })
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
      <h3>New Maintenance Entry</h3>
      <label>Vehicle Type
        <select value={form.vehicle_type} onChange={e=>setForm(f=>({...f, vehicle_type:e.target.value}))}>
          <option value="tractor">Tractor</option>
          <option value="trailer">Trailer</option>
        </select>
      </label>
      <label>Unit
  <select
    required
    value={form.unit_id}
    onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}
  >
    <option value="">Select unit</option>
    {units.map(u => (
      <option key={u.id} value={u.id}>
        {u.unit_number} ({u.type})
      </option>
    ))}
  </select>
</label>

      <label>Mileage <input required value={form.mileage} onChange={e=>setForm(f=>({...f, mileage:e.target.value}))} /></label>
      <label>Driver Name <input value={form.driver_name} onChange={e=>setForm(f=>({...f, driver_name:e.target.value}))} placeholder="(optional)"/></label>
      <label>Company Doing the Work <input value={form.company_name} onChange={e=>setForm(f=>({...f, company_name:e.target.value}))} /></label>
      <label>Technician Name <input value={form.tech_name} onChange={e=>setForm(f=>({...f, tech_name:e.target.value}))} placeholder="(optional)"/></label>
      <label>Estimated Time (minutes) <input value={form.estimated_time_minutes} onChange={e=>setForm(f=>({...f, estimated_time_minutes:e.target.value}))} /></label>
      <label>Notes <textarea value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))}></textarea></label>

      <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10 }}>
        <strong>Checklist</strong>
        <div style={{ fontSize: 12, color: '#666' }}>Tap each item and set status / comments</div>
        {items.map(i => (
          <div key={i.id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', gap: 8, alignItems:'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <div><b>{i.item_name}</b></div>
              <div style={{ fontSize: 12, color: '#666' }}>{i.description}</div>
            </div>
            <select value={i.status} onChange={e=>updateItem(i.id, { status: e.target.value })}>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="repair_needed">Repair Needed</option>
            </select>
            <input placeholder="comments" value={i.comments} onChange={e=>updateItem(i.id, { comments: e.target.value })} />
          </div>
        ))}
      </div>

      <div>
        <label>Technician Signature</label>
        <SignaturePad onChange={setSignatureDataUrl} />
      </div>

      <button type="submit">Submit</button>
    </form>
  )
}
e.preventDefault();

// Accept "100000" or "100,000"
const mileageClean = String(form.mileage).replace(/[^0-9.]/g, '');

if (!form.unit_id) { alert('Please select a unit.'); return; }
if (!mileageClean || isNaN(Number(mileageClean))) {
  alert('Please enter a valid mileage (numbers only).');
  return;
}
data.append('mileage', mileageClean);
