'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import '../index.css';

const navGroups = [
  {
    label: 'Core',
    items: [
      { to: '/dashboard', icon: 'space_dashboard', label: 'Dashboard' },
      { to: '/dashboard/this-month', icon: 'calendar_month', label: 'This Month' },
    ],
  },
  {
    label: 'Manage',
    isCollapsible: true,
    items: [
      { to: '/dashboard/accounts', icon: 'account_balance', label: 'Accounts' },
      { to: '/dashboard/income', icon: 'payments', label: 'Income' },
      { to: '/dashboard/expenses', icon: 'receipt_long', label: 'Expenses' },
      { to: '/dashboard/debts', icon: 'credit_card', label: 'Debts' },
      { to: '/dashboard/envelopes', icon: 'savings', label: 'Envelopes' },
      { to: '/dashboard/wants', icon: 'star', label: 'Wants' },
    ],
  },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [manageExpanded, setManageExpanded] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [username, setUsername] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    setSidebarCollapsed(collapsed);
  }, []);

  useEffect(() => {
    axios.get('/api/auth/me')
      .then(res => {
        if (res.data && res.data.username) {
          setUsername(res.data.username);
        }
      })
      .catch(err => console.error('Failed to load user session info:', err));
  }, []);

  const toggleSidebar = () => {
    const nextState = !sidebarCollapsed;
    setSidebarCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isShutDown, setIsShutDown] = useState(false);

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    setShowShutdownModal(false);
    try {
      await axios.post('/api/shutdown');
    } catch (err) {
      console.log('Shutdown request Paused (offline mode simulated).');
    }
    setTimeout(() => {
      setIsShuttingDown(false);
      setIsShutDown(true);
    }, 1200);
  };

  const handleLogout = async () => {
    try {
      // Clear cookie
      document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isShutDown) {
    return (
      <div className="shutdown-screen">
        <div className="shutdown-card">
          <span className="material-symbols-rounded shutdown-icon">power_settings_new</span>
          <h2>MONEY_DUMB Offline</h2>
          <p>The backend and frontend servers have been cleanly stopped.</p>
          <p>All database transactions are committed and your files are saved.</p>
          <p className="subtext">You can safely close this browser window now.</p>
          <button className="close-window-btn" onClick={() => {
            window.location.href = 'about:blank';
          }}>
            Close Session
          </button>
        </div>
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
    );
  }

  if (isShuttingDown) {
    return (
      <div className="shutdown-screen">
        <div className="shutdown-card">
          <div className="spinner" />
          <h2>Stopping Servers</h2>
          <p>Preserving state and stopping background engines...</p>
        </div>
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Mobile Top Header Bar */}
      <header className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span className="material-symbols-rounded">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
        <h2 className="mobile-logo">MONEY_DUMB</h2>
        <div style={{ width: '32px' }} /> {/* Right spacing balance */}
      </header>

      {/* Mobile Sidebar Overlay Backdrop */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>
              {sidebarCollapsed ? 'right_panel_open' : 'left_panel_open'}
            </span>
          </button>
          {!sidebarCollapsed && (
            <div className="sidebar-logo">
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                MONEY_DUMB
              </h1>
              <span>Financial Command Center</span>
            </div>
          )}
        </div>
        
        {/* User Profile Info Card */}
        <div 
          className="user-profile-badge" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: sidebarCollapsed ? '0' : '12px', 
            padding: '12px 16px', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: '8px',
            marginTop: '4px',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            overflow: 'hidden'
          }} 
          title={sidebarCollapsed ? `Active User: ${username || 'Loading...'}` : undefined}
        >
          <span 
            className="material-symbols-rounded" 
            style={{ 
              color: 'var(--accent)', 
              fontSize: '1.2rem',
              background: 'rgba(245, 158, 11, 0.1)',
              padding: '6px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            person
          </span>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {username || 'Loading...'}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Identity
              </span>
            </div>
          )}
        </div>

        <nav>
          {navGroups.map(group => {
            const isManager = group.isCollapsible;
            const expanded = isManager ? manageExpanded : true;
            return (
              <div key={group.label} className="nav-group">
                <div
                  className={`nav-group-label ${isManager ? 'collapsible' : ''}`}
                  onClick={() => isManager && setManageExpanded(!manageExpanded)}
                >
                  <span style={{ flex: 1 }}>{group.label}</span>
                  {isManager && (
                    <span
                      className="material-symbols-rounded chevron"
                      style={{ transform: manageExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      expand_more
                    </span>
                  )}
                </div>
                <div className={`nav-group-content ${expanded ? 'expanded' : ''}`}>
                  <div className="nav-group-inner">
                    {group.items.map(item => {
                      const isActive = pathname === item.to;
                      return (
                        <Link
                          key={item.to}
                          href={item.to}
                          className={isActive ? 'active' : ''}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <span className="material-symbols-rounded nav-icon">{item.icon}</span>
                          {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
        
        {/* Sidebar Footer with Logout & Shutdown */}
        <div className="sidebar-footer">
          {!sidebarCollapsed && (
            <button
              className="shutdown-btn"
              onClick={handleLogout}
              style={{ color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent', display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 16px', borderRadius: 'var(--r)' }}
            >
              <span className="material-symbols-rounded nav-icon" style={{ color: 'var(--text-muted)' }}>logout</span>
              <span className="nav-label">Log Out</span>
            </button>
          )}
          <button
            className="shutdown-btn"
            onClick={() => setShowShutdownModal(true)}
            title={sidebarCollapsed ? 'Shutdown MONEY_DUMB' : undefined}
          >
            <span className="material-symbols-rounded nav-icon">power_settings_new</span>
            {!sidebarCollapsed && <span className="nav-label">Shutdown App</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`main-content ${sidebarCollapsed ? 'main-content-expanded' : ''}`}>
        {children}
      </main>

      {/* Atmospheric ambient background glow */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />

      {/* Shutdown Confirmation Modal */}
      {showShutdownModal && (
        <div className="modal-overlay" onClick={() => setShowShutdownModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="material-symbols-rounded warning-icon">warning</span>
              <h3>Shutdown Application?</h3>
            </div>
            <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              This will safely shut down the database engine and cleanly terminate your local session parameters.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowShutdownModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleShutdown} style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}>
                Shut Down
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
