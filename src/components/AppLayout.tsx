import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LayoutDashboard, Smartphone, Users, LogOut, Sun, Moon, Menu, X, Shield, User, MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { to: string; label: string; icon: any; adminOnly?: boolean }[] = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/smartphones', label: 'Smartphones', icon: Smartphone },
    { to: '/attendance', label: 'Attendance', icon: MapPin },
    { to: '/staff', label: 'Staff', icon: Users, adminOnly: true },
    { to: '/profile', label: 'My Profile', icon: User },
  ].filter(Boolean) as any;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-full overflow-y-auto">
        <div className="p-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-border/50 overflow-hidden bg-white shadow-lg shadow-primary/5 flex-shrink-0 transition-transform group-hover:scale-105 duration-500 p-0.5">
              <img src="/brand-logo.jpg" alt="Logo icon" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-display font-black text-sidebar-foreground text-xl leading-tight tracking-tight">Jayam</h1>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-3 mt-0.5">Mobiles</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => {
            if (item.adminOnly && !isAdmin) return null;
            const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">{user?.role}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="flex-1 text-sidebar-foreground/70 hover:text-sidebar-foreground">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="flex-1 text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 h-screen overflow-y-auto">
        {/* Top Header for Desktop & Mobile */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="md:hidden flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg border border-border/50 overflow-hidden bg-white shadow-md p-0.5">
              <img src="/brand-logo.jpg" alt="Mobile Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-xs uppercase tracking-tight leading-none">Jayam</span>
              <span className="text-[8px] font-black text-primary uppercase tracking-widest leading-none mt-0.5">Mobiles</span>
            </div>
          </div>

          <div className="hidden md:block">
            {/* Desktop breadcrumb or just spacer */}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="rounded-xl hover:bg-muted font-bold text-xs"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={signOut}
              className="rounded-xl font-black text-[10px] uppercase tracking-widest px-4 h-9 shadow-lg shadow-destructive/20 hover:scale-105 transition-all"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" /> Logout
            </Button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 hover:bg-muted rounded-xl transition-colors">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile menu overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
            <div className="absolute top-14 left-0 right-0 bg-card border-b border-border p-4 space-y-2 animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>
              {navItems.map(item => {
                const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-foreground/70 hover:bg-muted'
                      }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
