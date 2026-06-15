import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faTimes, faCheck, faDatabase, faCloud } from '@fortawesome/free-solid-svg-icons';
import { fetchConfig, updateConfig } from '../services/api';

export default function DataSettings({ onClose, on保存d }) {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchConfig().then(setConfig).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handle保存 = async (key, value) => {
    setSaving(key);
    try {
      await updateConfig(key, value);
      setConfig(prev => ({ ...prev, [key]: value }));
      setMessage({ type: 'success', text: `已保存: ${key} = ${value}` });
      if (on保存d) on保存d();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const sources = [
    { value: 'mock', label: '模拟数据', desc: '随机模拟，无需 API 密钥' },
    { value: 'eastmoney', label: '东方财富', desc: '免费公共 API，无需认证' },
    { value: 'tushare', label: 'Tushare Pro', desc: '需要 tushare.pro 的 API Token' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>
            <FontAwesomeIcon icon={faCog} style={{ color: '#8b5cf6', marginRight: 10 }} />
            数据设置
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {loading ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : (
          <>
            {/* Data Source */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <FontAwesomeIcon icon={faDatabase} style={{ color: '#3b82f6', fontSize: 12 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>市场数据源</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sources.map(s => (
                  <label key={s.value} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                    background: config.data_source === s.value ? 'rgba(59,130,246,0.1)' : 'rgba(15,23,42,0.5)',
                    border: `1px solid ${config.data_source === s.value ? 'rgba(59,130,246,0.4)' : 'rgba(148,163,184,0.1)'}`,
                    transition: 'all 0.2s',
                  }}>
                    <input type="radio" name="source" value={s.value} checked={config.data_source === s.value}
                      onChange={() => handle保存('data_source', s.value)}
                      style={{ marginTop: 2, accentColor: '#3b82f6' }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Tushare Token */}
            {config.data_source === 'tushare' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <FontAwesomeIcon icon={faCloud} style={{ color: '#8b5cf6', fontSize: 12 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Tushare API Token</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    defaultValue={config.tushare_token || ''}
                    id="tushare-token"
                    placeholder="输入 Tushare Token..."
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 6, fontSize: 12, color: '#e2e8f0',
                      background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.2)', outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => handle保存('tushare_token', document.getElementById('tushare-token').value)}
                    disabled={saving === 'tushare_token'}
                    style={{
                      padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#fff', border: 'none',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', cursor: 'pointer',
                      opacity: saving === 'tushare_token' ? 0.6 : 1,
                    }}
                  >
                    <FontAwesomeIcon icon={faCheck} style={{ marginRight: 4 }} />
                    {saving === 'tushare_token' ? '...' : '保存'}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
                  在 https://tushare.pro — 免费注册获取 Token
                </div>
              </div>
            )}
          </>
        )}

        {message && (
          <div style={{
            padding: '10px 14px', borderRadius: 6, fontSize: 12, marginTop: 12,
            background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: message.type === 'success' ? '#22c55e' : '#ef4444',
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
