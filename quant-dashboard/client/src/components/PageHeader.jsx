import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const COLOR_SCHEMES = {
  blue: {
    borderColor: 'rgba(59,130,246,0.2)',
    gradientBar: 'from-transparent via-blue-400/60 via-purple-400/40 to-transparent',
    leftDecor1: 'from-blue-500/8',
    leftDecor2: 'from-purple-500/10',
    rightDecor1: 'from-blue-500/8',
    rightDecor2: 'from-purple-500/10',
    iconColor: '#3b82f6',
    iconGlow: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))',
    textShadow: '0 0 14px rgba(59,130,246,0.4), 0 0 28px rgba(139,92,246,0.2)',
    divider: 'via-blue-400/60',
  },
  cyan: {
    borderColor: 'rgba(6, 182, 212, 0.2)',
    gradientBar: 'from-transparent via-cyan-400/60 via-teal-400/40 to-transparent',
    leftDecor1: 'from-cyan-500/8',
    leftDecor2: 'from-teal-500/10',
    rightDecor1: 'from-cyan-500/8',
    rightDecor2: 'from-teal-500/10',
    iconColor: '#06b6d4',
    iconGlow: 'drop-shadow(0 0 6px rgba(6,182,212,0.5))',
    textShadow: '0 0 14px rgba(6,182,212,0.4), 0 0 28px rgba(20,184,166,0.2)',
    divider: 'via-cyan-400/60',
  },
  fund: {
    borderColor: 'rgba(59,130,246,0.25)',
    gradientBar: 'from-transparent via-blue-400/50 via-purple-400/50 to-transparent',
    leftDecor1: 'from-blue-600/10',
    leftDecor2: 'from-purple-600/12',
    rightDecor1: 'from-blue-600/10',
    rightDecor2: 'from-purple-600/12',
    iconColor: '#3b82f6',
    iconGlow: 'drop-shadow(0 0 8px rgba(59,130,246,0.6))',
    textShadow: '0 0 16px rgba(59,130,246,0.5), 0 0 32px rgba(139,92,246,0.3)',
    divider: 'via-blue-400/50',
  },
};

export default function PageHeader({ icon, title, tag, rightContent, color = 'blue' }) {
  const c = COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;

  return (
    <header
      className="relative flex h-[60px] shrink-0 items-center justify-between overflow-hidden border-b px-6"
      style={{ borderColor: c.borderColor, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)' }}
    >
      {/* Top gradient bar */}
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${c.gradientBar}`} />

      {/* Left decorations */}
      <div className={`absolute -left-12 top-1/2 h-28 w-24 -translate-y-1/2 -skew-x-[18deg] bg-gradient-to-r ${c.leftDecor1} to-transparent`} />
      <div className={`absolute -left-6 top-1/2 h-20 w-12 -translate-y-1/2 -skew-x-[18deg] bg-gradient-to-r ${c.leftDecor2} to-transparent`} />

      {/* Right decorations */}
      <div className={`absolute -right-12 top-1/2 h-28 w-24 -translate-y-1/2 skew-x-[18deg] bg-gradient-to-l ${c.rightDecor1} to-transparent`} />
      <div className={`absolute -right-6 top-1/2 h-20 w-12 -translate-y-1/2 skew-x-[18deg] bg-gradient-to-l ${c.rightDecor2} to-transparent`} />

      {/* Title block */}
      <div className="relative z-10 flex items-center gap-4">
        <FontAwesomeIcon icon={icon} className="text-sm" style={{ color: c.iconColor, filter: c.iconGlow }} />
        <h1 className="text-xl font-bold tracking-widest text-white" style={{ textShadow: c.textShadow }}>{title}</h1>
        <div className={`h-5 w-px bg-gradient-to-b from-transparent ${c.divider} to-transparent`} />
        <span className="text-xs font-medium tracking-[0.2em] text-cyber-gray">{tag}</span>
      </div>

      {/* Right content (tabs, buttons, etc.) */}
      <div className="relative z-10">{rightContent}</div>
    </header>
  );
}
