import React, { useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'

export default function SignaturePad({ onChange }) {
  const ref = useRef(null)
  const clear = () => ref.current.clear()
  const save = () => {
    const dataUrl = ref.current.toDataURL('image/png')
    onChange && onChange(dataUrl)
  }
  return (
    <div>
      <SignatureCanvas ref={ref} penColor='black' canvasProps={{ width: 500, height: 200, style: { border: '1px solid #ccc', borderRadius: 6 } }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="button" onClick={clear}>Clear</button>
        <button type="button" onClick={save}>Use Signature</button>
      </div>
    </div>
  )
}
