import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderGit2,
  Sparkles,
  Compass,
  FlaskConical,
  Boxes,
  Settings,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { BrandLogo } from '../common/BrandLogo';
import { FutureModuleModal } from '../common/FutureModuleModal';
import { NotificationBell } from '../notifications/NotificationBell';

interface NavItemDef {
  label: string;
  path?: string;
  icon: React.ElementType;
  badge?: string;
  isAction?: boolean;
}

const SIDEBAR_ITEMS: NavItemDef[] = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Projects', path: '/projects', icon: FolderGit2 },
  { label: 'Idea Analysis', icon: Sparkles, badge: 'Phase 2', isAction: true },
  { label: 'Customer Discovery', icon: Compass, badge: 'Phase 3', isAction: true },
  { label: 'Experiments', icon: FlaskConical, badge: 'Phase 3', isAction: true },
  { label: 'Resource Intelligence', icon: Boxes, badge: 'Phase 3', isAction: true },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('blindspot_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeFutureModule, setActiveFutureModule] = useState<string | null>(null);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Persist collapse preference
  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('blindspot_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  const handleItemClick = (item: NavItemDef) => {
    if (item.isAction || !item.path) {
      setActiveFutureModule(item.label);
    } else {
      navigate(item.path);
    }
  };

  // Determine current breadcrumb
  const getBreadcrumbs = () => {
    const p = location.pathname;
    if (p === '/dashboard') return [{ label: 'Dashboard', path: '/dashboard' }];
    if (p === '/projects') return [{ label: 'Projects', path: '/projects' }];
    if (p === '/settings') return [{ label: 'Settings', path: '/settings' }];
    if (p === '/projects/new') {
      return [
        { label: 'Projects', path: '/projects' },
        { label: 'Create New Project', path: '/projects/new' },
      ];
    }
    if (p.startsWith('/projects/')) {
      return [
        { label: 'Projects', path: '/projects' },
        { label: 'Workspace', path: p },
      ];
    }
    return [{ label: 'Dashboard', path: '/dashboard' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-sand text-forest flex overflow-x-hidden selection:bg-purple/20 selection:text-forest">
      {/* 1. DESKTOP SIDEBAR */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 260 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="hidden md:flex flex-col bg-sand-light border-r border-forest/15 z-30 flex-shrink-0 select-none relative"
      >
        {/* Sidebar Header */}
        <div className={`h-20 flex items-center border-b border-forest/10 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <NavLink to="/dashboard" className="flex items-center gap-3 overflow-hidden group">
            <BrandLogo size={isCollapsed ? 'sm' : 'md'} iconOnly={isCollapsed} />
          </NavLink>
          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-forest/50 hover:text-forest hover:bg-forest/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto" aria-label="Main Navigation">
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon;
            const isRouteActive = item.path ? location.pathname === item.path || (item.path === '/projects' && location.pathname.startsWith('/projects/')) : false;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleItemClick(item)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all group relative ${
                  isRouteActive
                    ? 'bg-forest text-sand shadow-sm'
                    : 'text-forest/75 hover:text-forest hover:bg-forest/5'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105 ${
                    isRouteActive ? 'text-purple' : 'text-forest/60 group-hover:text-forest'
                  }`}
                />

                {!isCollapsed && (
                  <span className="flex-1 text-left truncate tracking-tight">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isRouteActive
                        ? 'bg-purple/20 text-purple border border-purple/30'
                        : 'bg-forest/10 text-forest/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Subtle active indicator dot */}
                {isRouteActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-purple"
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Expand Toggle when collapsed */}
        {isCollapsed && (
          <div className="p-3 border-t border-forest/10 flex justify-center">
            <button
              onClick={toggleCollapse}
              className="p-2 rounded-xl text-forest/50 hover:text-forest hover:bg-forest/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sidebar Footer with User Profile */}
        <div className={`p-4 border-t border-forest/10 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex-shrink-0">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8 rounded-full border border-forest/20 shadow-sm',
                },
              }}
            />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-forest truncate">
                {user?.fullName || user?.username || 'Builder'}
              </p>
              <p className="text-[10px] font-mono text-forest/55 truncate">
                {user?.primaryEmailAddress?.emailAddress || 'Authenticated'}
              </p>
            </div>
          )}
        </div>
      </motion.aside>

      {/* 2. MOBILE DRAWER NAVIGATION */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-forest-dark/70 backdrop-blur-sm"
            />

            {/* Slide-out Sheet */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-72 max-w-[85vw] bg-sand-light border-r border-forest/20 flex flex-col h-full shadow-2xl z-10"
            >
              {/* Drawer Header */}
              <div className="h-16 flex items-center justify-between px-5 border-b border-forest/10">
                <BrandLogo size="sm" />
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 rounded-xl text-forest/60 hover:text-forest hover:bg-forest/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Links */}
              <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
                {SIDEBAR_ITEMS.map(item => {
                  const Icon = item.icon;
                  const isRouteActive = item.path ? location.pathname === item.path || (item.path === '/projects' && location.pathname.startsWith('/projects/')) : false;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-colors ${
                        isRouteActive
                          ? 'bg-forest text-sand'
                          : 'text-forest/75 hover:text-forest hover:bg-forest/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isRouteActive ? 'text-purple' : 'text-forest/60'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider bg-forest/10 text-forest/60">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Profile Footer */}
              <div className="p-4 border-t border-forest/10 flex items-center gap-3">
                <UserButton afterSignOutUrl="/" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-forest truncate">
                    {user?.fullName || user?.username || 'Builder'}
                  </p>
                  <p className="text-[10px] font-mono text-forest/55 truncate">
                    {user?.primaryEmailAddress?.emailAddress || 'Authenticated'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 md:h-20 bg-sand/80 backdrop-blur-md border-b border-forest/10 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl text-forest hover:bg-forest/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Hierarchy */}
            <nav className="flex items-center gap-2 text-xs font-medium text-forest/60" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.path + idx}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-forest/30 flex-shrink-0" />}
                    {isLast ? (
                      <span className="font-bold text-forest text-sm sm:text-base tracking-tight truncate max-w-[180px] sm:max-w-xs">
                        {crumb.label}
                      </span>
                    ) : (
                      <NavLink
                        to={crumb.path}
                        className="hover:text-forest transition-colors truncate max-w-[120px]"
                      >
                        {crumb.label}
                      </NavLink>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Quick Create Project Action Button */}
            {location.pathname !== '/projects/new' && (
              <button
                onClick={() => navigate('/projects/new')}
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold bg-forest text-sand hover:bg-forest-light hover:shadow-md transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple"
              >
                <Plus className="w-3.5 h-3.5 text-purple group-hover:rotate-90 transition-transform duration-300" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </button>
            )}

            {/* In-App Notification Center Bell */}
            <NotificationBell />

            {/* Header User Profile on desktop */}
            <div className="hidden sm:block">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8 rounded-full border border-forest/20 shadow-sm',
                  },
                }}
              />
            </div>
          </div>
        </header>

        {/* Dynamic Route Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Future Roadmap Module Dialog */}
      <FutureModuleModal
        isOpen={Boolean(activeFutureModule)}
        onClose={() => setActiveFutureModule(null)}
        moduleName={activeFutureModule || ''}
      />
    </div>
  );
};
