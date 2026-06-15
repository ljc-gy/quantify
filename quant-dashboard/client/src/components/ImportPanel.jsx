import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faFileCsv, faCheckCircle, faTimes, faDownload } from '@fortawesome/free-solid-svg-icons';
import { importCsv } from '../services/api';

const SAMPLE_CSV = `stock_code,stock_name,quantity,cost_price
600519,贵州茅台,200,1680.00
300750,宁德时代,500,198.50
002594,比亚迪,300,265.40
000858,五粮液,400,148.50
688981,中芯国际,800,58.20`;

export default function ImportPanel({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.txt'))) {
      setFile(f);
      setError(null);
    } else {
      setError('Please select a .csv file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await importCsv(formData);
      setResult(data);
      if (onImported) onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_holdings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (result) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
          <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#22c55e', fontSize: 48, marginBottom: 16 }} />
          <h2 style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>Import Complete</h2>
          <p style={{ fontSize: 14, color: '#22c55e', marginBottom: 4 }}>Successfully imported {result.imported} records</p>
          {result.errors?.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 11, color: '#f59e0b', textAlign: 'left', maxHeight: 120, overflow: 'auto' }}>
              {result.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          <button onClick={onClose} style={{ marginTop: 20, padding: '8px 24px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#fff', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', cursor: 'pointer' }}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>
            <FontAwesomeIcon icon={faUpload} style={{ color: '#3b82f6', marginRight: 10 }} />
            Import Holdings (CSV)
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <button onClick={handleDownloadSample} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 500, color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(148,163,184,0.05)', cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faDownload} /> Download Sample CSV
          </button>
          <div style={{ marginTop: 8, fontSize: 10, color: '#475569' }}>
            Columns: stock_code, stock_name, quantity, cost_price
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#3b82f6' : 'rgba(148,163,184,0.3)'}`,
            borderRadius: 8, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'rgba(59,130,246,0.05)' : 'rgba(15,23,42,0.5)',
            transition: 'all 0.2s', marginBottom: 16,
          }}
        >
          <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={(e) => handleFile(e.target.files[0])} style={{ display: 'none' }} />
          <FontAwesomeIcon icon={faFileCsv} style={{ color: file ? '#22c55e' : '#64748b', fontSize: 32, marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: file ? '#e2e8f0' : '#94a3b8' }}>
            {file ? file.name : 'Click or drag CSV file here'}
          </div>
          {file && <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</div>}
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#fff', border: 'none',
            background: file ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(148,163,184,0.15)',
            boxShadow: file ? '0 0 14px rgba(59,130,246,0.3)' : 'none',
            cursor: file ? 'pointer' : 'default', opacity: file ? 1 : 0.5,
          }}
        >
          {loading ? 'Importing...' : 'Upload and Import'}
        </button>
      </div>
    </div>
  );
}
