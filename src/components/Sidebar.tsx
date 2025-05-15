import React, { useState } from 'react';
import { Home, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarItemProps {
  icon: React.ElementType;
  text: string;
  active?: boolean;
  onClick: () => void;
  collapsed: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, text, active, onClick, collapsed }) => {
  return (
    <div 
      className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-3 cursor-pointer rounded-lg transition-all duration-300 ${
        active 
          ? 'bg-gradient-to-r from-blue-600/40 to-blue-500/20 text-blue-300 font-medium border-l-2 border-blue-400' 
          : 'hover:bg-slate-800/50 hover:translate-x-1'
      }`}
      onClick={onClick}
    >
      <Icon size={20} className={active ? 'text-blue-300' : 'text-slate-400'} />
      {!collapsed && <span className={`text-sm ${active ? 'text-blue-300' : 'text-slate-300'}`}>{text}</span>}
    </div>
  );
};

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 ${collapsed ? 'w-20' : 'w-64'} p-4 shadow-xl border-r border-blue-900/30 h-full relative transition-all duration-300`}>
      <div className="mb-8 flex justify-between items-center">
        {!collapsed && (
          <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Navigation
          </span>
        )}
        <button 
          onClick={() => setCollapsed(prev => !prev)} 
          className="p-1.5 bg-slate-800 rounded-full hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 transition-colors shadow-md border border-blue-900/30 flex items-center justify-center"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="space-y-2">
        <SidebarItem 
          icon={Home} 
          text="Dashboard" 
          active={activePage === 'dashboard'} 
          onClick={() => onNavigate('dashboard')}
          collapsed={collapsed}
        />
      </div>
    </div>
  );
};

export default Sidebar;
