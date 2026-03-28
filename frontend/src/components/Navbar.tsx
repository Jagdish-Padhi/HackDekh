import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Settings, UserCircle2, X } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import axiosInstance from '../utils/axiosInstance';

type CurrentUser = {
  _id: string;
  username?: string;
  fullName?: string;
  email?: string;
};

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Hackathons', path: '/hackathons' },
  { name: 'Teams', path: '/teams' },
  { name: 'My Dashboard', path: '/dashboard' },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const token = localStorage.getItem('accessToken');
  const isLoggedIn = Boolean(token);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      if (!isLoggedIn) {
        setUser(null);
        return;
      }

      try {
        setLoadingUser(true);
        const response = await axiosInstance.get('/users/me');
        if (!isMounted) {
          return;
        }
        setUser(response.data?.data || null);
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoadingUser(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  const displayName = useMemo(() => {
    return user?.fullName || user?.username || (loadingUser ? 'Loading...' : 'Account');
  }, [user, loadingUser]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileProfileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      if (isLoggedIn) {
        await axiosInstance.post('/users/logout');
      }
    } catch {
      // Even if API logout fails, clear local auth and continue.
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setProfileOpen(false);
      setMobileProfileOpen(false);
      setMenuOpen(false);
      navigate('/login');
    }
  };

  return (
    <nav className="mx-auto w-full max-w-7xl rounded-[1.4rem] border border-zinc-200/90 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl transition-all duration-200 sm:px-5 sm:py-2.5 dark:border-zinc-800 dark:bg-zinc-900/75 dark:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-2.5 shadow-sm ring-1 ring-blue-100/70 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-blue-500/15">
            <img src="/BrandImages/HackDekh.png" alt="HackDekh Logo" className="h-11 w-11 object-contain sm:h-12 sm:w-12" />
          </div>
          <span className="text-xl font-semibold leading-none tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Hack
            <span className="bg-linear-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-500">Dekh</span>
          </span>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-zinc-200/90 bg-zinc-50/85 p-1.5 shadow-sm transition-all duration-200 sm:flex dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white dark:shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-white'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}

          <DarkModeToggle />

          {!isLoggedIn ? (
            <div className="ml-1 flex items-center gap-1.5">
              <NavLink
                to="/login"
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                className="rounded-full border border-blue-500/35 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 dark:border-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                Sign Up
              </NavLink>
            </div>
          ) : (
            <div
              className="relative ml-1"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <UserCircle2 className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                </span>
                <span className="max-w-28 truncate text-xs sm:max-w-32">{displayName}</span>
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-lg ring-1 ring-zinc-200/70 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-700/80">
                  <div className="mb-1 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/70">
                    <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{displayName}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user?.email || 'Signed in'}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>

                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <DarkModeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-full border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-sm transition-all duration-200 hover:bg-zinc-100 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:shadow-md"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mt-3 space-y-1 border-t border-zinc-200/90 pt-3 sm:hidden dark:border-zinc-800">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-white'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}

          {!isLoggedIn ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <NavLink
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                onClick={() => setMenuOpen(false)}
                className="rounded-2xl border border-blue-500/35 bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Sign Up
              </NavLink>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200/90 p-2 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setMobileProfileOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                    <UserCircle2 className="h-6 w-6 text-zinc-600 dark:text-zinc-300" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{displayName}</p>
                    <p className="max-w-[180px] truncate text-xs text-zinc-500 dark:text-zinc-400">{user?.email || 'Signed in'}</p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-zinc-500 transition ${mobileProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {mobileProfileOpen && (
                <div className="mt-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setMobileProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
