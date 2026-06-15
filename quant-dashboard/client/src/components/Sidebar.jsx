import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { BRAND_ICON, SIDEBAR_SECTIONS } from '../navigation/sidebarNavigation';

function SectionToggle({ label, open, onToggle }) {
  return (
    <div
      className="flex cursor-pointer items-center gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 hover:text-white/80 transition-colors"
      onClick={onToggle}
    >
      <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`} />
      {label}
    </div>
  );
}

function MenuItems({ items, location }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {items.map((item) => {
        const isActive = item.id === 'dashboard'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path);
        return (
          <NavLink key={item.id} to={item.path} className={`menu-item ${isActive ? 'active' : ''}`}>
            <FontAwesomeIcon icon={item.icon} className={`w-4 text-sm ${isActive ? 'text-cyan-400' : ''}`} />
            <span className="text-sm">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const [openSections, setOpenSections] = useState(() => Object.fromEntries(
    SIDEBAR_SECTIONS.map(section => [section.id, section.defaultOpen !== false]),
  ));
  const location = useLocation();

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col bg-[#060b14] border-r border-indigo-500/10 select-none">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 shadow-lg">
          <FontAwesomeIcon icon={BRAND_ICON} className="text-base text-white" />
        </div>
        <span className="text-xl font-bold tracking-wider text-white">量化看盘</span>
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-indigo-500/40 via-indigo-500/15 to-transparent" />

      <div className="mt-5 flex flex-1 flex-col overflow-hidden gap-1">
        {SIDEBAR_SECTIONS.map((section) => {
          const open = openSections[section.id];
          return (
            <div key={section.id}>
              <SectionToggle
                label={section.label}
                open={open}
                onToggle={() => setOpenSections(current => ({ ...current, [section.id]: !current[section.id] }))}
              />
              <div className={`overflow-hidden transition-all duration-300 ${open ? `${section.collapsedHeight} opacity-100` : 'max-h-0 opacity-0'}`}>
                <MenuItems items={section.items} location={location} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-indigo-500/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-slate-400">系统状态</span>
          <span className="text-xs font-medium text-green-400">正常运行中</span>
        </div>
      </div>
    </aside>
  );
}
