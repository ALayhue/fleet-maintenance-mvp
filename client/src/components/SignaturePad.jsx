import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export default function SignaturePad({ onChange }) {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const [dims, setDims] = useState({ w: 500, h: 200 });

  useEffect(() => {
    function resize() {
      const max = 600;
      const pad = 24;
      const w = Math.min(max, (wrapRef.current?.offsetWidth || window.innerWidth) - pad);
      const h = Math.max(150, Math.round(w * 0.35));
      setDims({ w, h });
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const clear = () => ref.current.clear();
  const save = () => {
    const dataUrl = ref.current.toDataURL('image/png');
    onChange && onChange(dataUrl);
  };

  return (
    <div ref={wrapRef}>
      <SignatureCanvas
        ref={ref}
        penColor="black"
        canvasProps={{ width: dims.w, height: dims.h, style: { width: '100%', height: dims.h, border: '1px solid #ccc', borderRadius: 6 } }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="button" onClick={clear}>Clear</button>
        <button type="button" onClick={save}>Use Signature</button>
      </div>
    </div>
  );
}
