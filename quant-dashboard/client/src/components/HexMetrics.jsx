import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faChartLine, faCoins, faShieldHalved } from '@fortawesome/free-solid-svg-icons';

const HEX_POLYGON = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';
const HEX_INNER = 'polygon(50% 8%, 88% 27%, 88% 73%, 50% 92%, 12% 73%, 12% 27%)';

export default function HexMetrics({ positions, totalMarketVal, totalPnl, dayPnlPct }) {
  const cards = [
    { icon: faDatabase, label: '持仓数量', value: `${positions.length}只`,
      glowColor: 'rgba(59,130,246,0.5)', borderColor: '#3b82f6', delay: 0 },
    { icon: faChartLine, label: '日收益率', value: `${dayPnlPct>=0?'+':''}${dayPnlPct.toFixed(2)}%`,
      glowColor: dayPnlPct>=0?'rgba(34,197,94,0.5)':'rgba(239,68,68,0.5)',
      borderColor: dayPnlPct>=0?'#22c55e':'#ef4444', delay: 150 },
    { icon: faCoins, label: '总市值', value: `${(totalMarketVal/10000).toFixed(1)}万`,
      glowColor: 'rgba(6,182,212,0.5)', borderColor: '#06b6d4', delay: 300 },
    { icon: faShieldHalved, label: '总盈亏', value: `${totalPnl>=0?'+':''}${totalPnl.toFixed(0)}`,
      glowColor: totalPnl>=0?'rgba(34,197,94,0.5)':'rgba(239,68,68,0.5)',
      borderColor: totalPnl>=0?'#22c55e':'#ef4444', delay: 450 },
  ];

  return (
    <div className="grid gap-4 h-full" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
      {cards.map((card, i) => (
        <div key={i} className="relative flex items-center justify-center hex-wrapper clickable"
          style={{ filter: `drop-shadow(0 0 15px ${card.glowColor})`,
            animation: `chartSlideUp 0.8s cubic-bezier(0.22,0.61,0.36,1) ${card.delay}ms both`,
          }}>
          <div className="absolute inset-0 hex-outer" style={{ background:'rgba(15,23,42,0.9)', clipPath: HEX_POLYGON }} />
          <div className="absolute hex-border" style={{ top:'-1px',left:'-1px',right:'-1px',bottom:'-1px',
            background:`linear-gradient(135deg, ${card.borderColor}, ${card.glowColor.replace('0.5','0.8')})`,
            clipPath: HEX_POLYGON, zIndex:-1 }} />
          <div className="absolute hex-inner" style={{ top:'2px',left:'2px',right:'2px',bottom:'2px',
            background:'rgba(15,23,42,0.95)', clipPath: HEX_INNER,
            animation:`hexBreatheBlue 3s ease-in-out infinite`, animationDelay:`${card.delay}ms` }} />
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-5 py-5">
            <FontAwesomeIcon icon={card.icon} className="text-2xl mb-2"
              style={{ color:card.borderColor, filter:`drop-shadow(0 0 8px ${card.glowColor})` }} />
            <span className="text-[11px] text-cyber-gray mb-0.5">{card.label}</span>
            <span className="text-[16px] font-bold font-mono" style={{ color:card.borderColor, textShadow:`0 0 10px ${card.glowColor}` }}>
              {card.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
