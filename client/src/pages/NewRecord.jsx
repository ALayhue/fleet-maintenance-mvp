function dataURLtoBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = (header.match(/data:(.*?);base64/) || [])[1] || 'image/png';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

import React, { useEffect, useState } from 'react';
import { api } from '../api';
import SignaturePad from '../components/SignaturePad';

export default function NewRecord({ token }) {
  const client = api(token);
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({
    unit_id: '',
    technician_id: null,
    company_name: '',
    mileage: '',
    estimated_time_minutes: '',
    notes: '',
    vehicle_type: 'tractor',
  });
  const [items, setItems] = useState([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    client.get('/units').then(r => setUnits(r.data));
  }, []);

  useEffect(() => {
    client
      .get('/checklist-templates', { params: { vehicle_type: form.vehicle_type } })
      .then(r => setItems(r.data.items.map(x => ({ ...x, status: 'pass', comments: '' }))));
  }, [form.vehicle_type]);

  const updateItem = (id, patch) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
  };

  const submit = async (e) => {
    e.preventDefault();

    // Normalize mileage: accept "100000" or "100,000"
    const mileageClean = String(form.mileage).replace(/[^0-9.]/g, '');

    if (!form.unit_id) {
      alert('Please select a unit.');
      return;
    }
    if (!mileageClean || isNaN(Number(mileageClean))) {
      alert('Please enter a valid mileage (numbers only).');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('unit_id', form.unit_id);
      data.append('company_name', form.company_name || '');
      data.append('mileage', mileageClean);
      data.append('estimated_time_minutes', form.estimated_time_minutes || '');
      data.append('notes', form.notes || '');
      data.append('vehicle_type', form.vehicle_type);
      data.append(
        'checklistItems',
        JSON.stringify(items.map(i => ({ item_id: i.id, status: i.status, comments: i.comments })))
      );
      // NEW
if (signatureDataUrl) {
  const blob = dataURLtoBlob(signatureDataUrl);
  data.append('signature', new File([blob], 'signature.png', { type: 'image/png' }));
}

      const r = await client.post('/maintenance-records', data);
      alert('Saved record #' + r.data.id);
      setForm({
        unit_id: '',
        technician_id: null,
        company_name: '',
        mileage: '',
        estimated_time_minutes: '',
        notes: '',
        vehicle_type: 'tractor',
      });
      setSignatureDataUrl(null);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Submit failed';
      alert('Submit failed: ' + msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
      <h3>New Maintenance Entry</h3>
      <div style={{ color: '#555', fontSize: 12 }}>
        Select a unit and enter mileage to submit. Signature is optional—tap "Use Signature" to attach it.
      </div>

      <label>Vehicle Type
        <select
          value={form.vehicle_type}
          onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
        >
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

      <label>Mileage
        <input
          required
          inputMode="numeric"
          placeholder="e.g. 100000"
          value={form.mileage}
          onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))}
        />
      </label>

      <label>Company Doing the Work
        <input
          value={form.company_name}
          onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
        />
      </label>

      <label>Technician Name (optional)
        <input
          value={form.tech_name || ''}
          onChange={e => setForm(f => ({ ...f, tech_name: e.target.value }))}
        />
      </label>

      <label>Estimated Time (minutes)
        <input
          inputMode="numeric"
          value={form.estimated_time_minutes}
          onChange={e => setForm(f => ({ ...f, estimated_time_minutes: e.target.value }))}
        />
      </label>

      <label>Notes
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />
      </label>

      <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10 }}>
        <strong>Checklist</strong>
        <div style={{ fontSize: 12, color: '#666' }}>Set status / comments per item</div>
        {items.map(i => (
          <div
            key={i.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 160px 1fr',
              gap: 8,
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div>
              <div><b>{i.item_name}</b></div>
              <div style={{ fontSize: 12, color: '#666' }}>{i.description}</div>
            </div>
            <select
              value={i.status}
              onChange={e => updateItem(i.id, { status: e.target.value })}
            >
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="repair_needed">Repair Needed</option>
            </select>
            <input
              placeholder="comments"
              value={i.comments}
              onChange={e => updateItem(i.id, { comments: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div>
        <label>Technician Signature (optional)</label>
        <SignaturePad onChange={setSignatureDataUrl} />
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
