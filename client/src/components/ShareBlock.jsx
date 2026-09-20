import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export default function ShareBlock({ url, title = 'Ce lien ouvre directement la page de l\'événement pour les bénévoles :' }) {
  const canvasRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 160, margin: 1 }, () => {});
    }
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('Lien copié !');
    } catch {
      setCopyStatus('Copie impossible ici — sélectionne et copie le texte manuellement.');
    }
  }

  return (
    <div className="form-card share-block">
      <p className="muted" style={{ marginTop: 0 }}>{title}</p>
      <div className="inline-form" style={{ marginTop: 0 }}>
        <input readOnly value={url} onFocus={(e) => e.target.select()} style={{ flex: '1 1 220px' }} />
        <button onClick={copy}>Copier</button>
      </div>
      {copyStatus && <p className="muted" style={{ margin: '0.4rem 0 0' }}>{copyStatus}</p>}
      <div style={{ marginTop: '0.75rem' }}><canvas ref={canvasRef} /></div>
    </div>
  );
}
