import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';

export function ToolBar({ search, onSearchChange, sector, sectors, onSectorChange }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="relative flex-1 max-w-[320px]">
        <FontAwesomeIcon
          icon={faSearch}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px]"
          style={{ color: '#64748b' }}
        />
        <input
          type="text"
          placeholder="搜索代码或名称..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-2 rounded-md text-[12px] text-white placeholder-[#475569] outline-none transition-all duration-200"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.1)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
            e.currentTarget.style.boxShadow = '0 0 14px rgba(59, 130, 246, 0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
            e.currentTarget.style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.1)';
          }}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#64748b] hover:text-[#94a3b8] transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={faFilter} className="text-[11px]" style={{ color: '#64748b' }} />
        <div className="flex items-center gap-1">
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => onSectorChange(s)}
              className="px-3 py-1.5 rounded text-[11px] font-medium transition-all duration-200"
              style={{
                color: sector === s ? '#e2e8f0' : '#64748b',
                background: sector === s ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                border: sector === s ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                boxShadow: sector === s ? '0 0 8px rgba(59, 130, 246, 0.2)' : 'none',
              }}
            >
              {s === 'all' ? '全部' : s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
