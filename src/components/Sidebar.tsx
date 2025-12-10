/**
 * Sidebar Navigation Component
 * Animasyonlu yan men\u00fc
 */

import React, { memo } from 'react';
import {
  FileText, Users, Palette, Layers, Download,
  Settings, HelpCircle, Sparkles, ChevronLeft, ChevronRight
} from 'lucide-react';

type TabId = 'input' | 'characters' | 'style' | 'scenes' | 'export';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  scenesCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  description?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'input',
    label: 'Hikaye Giri\u015fi',
    icon: <FileText className="w-5 h-5" />,
    description: 'Metninizi girin'
  },
  {
    id: 'characters',
    label: 'Karakterler',
    icon: <Users className="w-5 h-5" />,
    description: 'Karakter tan\u0131mlar\u0131'
  },
  {
    id: 'style',
    label: 'G\u00f6rsel Stil',
    icon: <Palette className="w-5 h-5" />,
    description: 'Stil ayarlar\u0131'
  },
  {
    id: 'scenes',
    label: 'Sahneler',
    icon: <Layers className="w-5 h-5" />,
    description: 'Sahne \u00f6nizleme'
  },
  {
    id: 'export',
    label: 'D\u0131\u015fa Aktar',
    icon: <Download className="w-5 h-5" />,
    description: 'G\u00f6rselleri indir'
  }
];

export const Sidebar: React.FC<SidebarProps> = memo(({
  activeTab,
  onTabChange,
  scenesCount = 0,
  isCollapsed = false,
  onToggleCollapse
}) => {
  return (
    <div className={`
      relative h-full
      bg-gray-900/50 backdrop-blur-xl
      border-r border-gray-800/50
      flex flex-col
      transition-all duration-300 ease-out
      ${isCollapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="
            w-10 h-10 rounded-xl
            bg-gradient-to-br from-purple-500 to-cyan-500
            flex items-center justify-center
            shadow-lg shadow-purple-500/20
          ">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="animate-fadeIn">
              <h1 className="font-bold text-white">G\u00f6rsel Hikaye</h1>
              <p className="text-xs text-gray-500">\u00dcretici v4.0</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item, index) => {
          const isActive = activeTab === item.id;
          const badge = item.id === 'scenes' ? scenesCount : undefined;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full
                flex items-center gap-3
                px-3 py-3 rounded-xl
                transition-all duration-200
                group relative
                ${isActive
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="
                  absolute left-0 top-1/2 -translate-y-1/2
                  w-1 h-6 rounded-r-full
                  bg-gradient-to-b from-purple-400 to-cyan-400
                " />
              )}

              {/* Icon with glow on active */}
              <div className={`
                relative
                ${isActive ? 'text-purple-400' : 'group-hover:text-purple-400'}
                transition-colors duration-200
              `}>
                {item.icon}
                {isActive && (
                  <div className="
                    absolute inset-0
                    bg-purple-500/30 blur-md
                    -z-10
                  " />
                )}
              </div>

              {/* Label */}
              {!isCollapsed && (
                <div className="flex-1 text-left animate-fadeIn">
                  <span className="text-sm font-medium block">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-gray-500 block mt-0.5">
                      {item.description}
                    </span>
                  )}
                </div>
              )}

              {/* Badge */}
              {badge !== undefined && badge > 0 && (
                <div className={`
                  ${isCollapsed ? 'absolute -top-1 -right-1' : ''}
                  px-2 py-0.5 rounded-full
                  text-xs font-medium
                  bg-purple-500/20 text-purple-300
                  border border-purple-500/30
                  ${isActive ? 'bg-purple-500/30' : ''}
                `}>
                  {badge}
                </div>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="
                  absolute left-full ml-2
                  px-3 py-2 rounded-lg
                  bg-gray-800 border border-gray-700
                  text-sm text-white whitespace-nowrap
                  opacity-0 group-hover:opacity-100
                  pointer-events-none
                  transition-opacity duration-200
                  z-50
                ">
                  {item.label}
                  {badge !== undefined && badge > 0 && (
                    <span className="ml-2 text-purple-400">({badge})</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="p-3 border-t border-gray-800/50 space-y-1">
        <button className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-xl
          text-gray-400 hover:text-white hover:bg-gray-800/50
          transition-all duration-200
        `}>
          <Settings className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm">Ayarlar</span>}
        </button>
        <button className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-xl
          text-gray-400 hover:text-white hover:bg-gray-800/50
          transition-all duration-200
        `}>
          <HelpCircle className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm">Yard\u0131m</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="
            absolute -right-3 top-1/2 -translate-y-1/2
            w-6 h-12 rounded-full
            bg-gray-800 border border-gray-700
            flex items-center justify-center
            text-gray-400 hover:text-white
            transition-colors duration-200
            z-10
          "
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
