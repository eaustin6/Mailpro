import { Outlet, Link, useLocation } from "react-router-dom";
import { Mail, Settings, Terminal, Ghost } from "lucide-react";

const Layout = () => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-cyber-black grid-bg relative">
      {/* Scanline overlay */}
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />
      
      {/* Header */}
      <header className="border-b border-neon-green/20 bg-cyber-gray/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-3 group"
              data-testid="logo-link"
            >
              <Ghost className="w-8 h-8 text-neon-green group-hover:animate-glitch" />
              <span className="font-display text-xl tracking-wider text-neon-green text-glow uppercase">
                GhostMail
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              <Link
                to="/"
                data-testid="nav-home"
                className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-all ${
                  isActive('/') && location.pathname === '/'
                    ? 'text-neon-green border-b-2 border-neon-green'
                    : 'text-gray-400 hover:text-neon-green'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span className="hidden sm:inline">Terminal</span>
              </Link>
              
              <Link
                to="/admin"
                data-testid="nav-admin"
                className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-all ${
                  isActive('/admin')
                    ? 'text-neon-green border-b-2 border-neon-green'
                    : 'text-gray-400 hover:text-neon-green'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Config</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-neon-green/10 bg-cyber-gray/50 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Terminal className="w-3 h-3" />
              <span>SYSTEM STATUS: <span className="text-neon-green">ONLINE</span></span>
            </div>
            <div className="text-gray-600 text-xs tracking-wider">
              GHOSTMAIL v1.0 // ENCRYPTED CONNECTION
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
