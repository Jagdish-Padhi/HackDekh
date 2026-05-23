import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Settings, UserCircle2 } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import { usePageChrome } from '../context/pageChrome';

type CurrentUser = {
  _id: string;
  username?: string;
  fullName?: string;
  email?: string;
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarExpanded } = usePageChrome();
  const [profileOpen, setProfileOpen] = useState(false);
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
    setProfileOpen(false);
  }, [location.pathname]);

  return (
    <nav className="w-full border-b border-zinc-200/80 bg-white/82 px-3 py-3 shadow-sm backdrop-blur-xl transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950/82 dark:shadow-md sm:px-4 lg:px-5">
      <div className="flex items-center justify-end gap-2.5">
        <div className="flex shrink-0 items-center gap-2.5">

          {isLoggedIn && (
            <div
              className="relative"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${
                  sidebarExpanded ? 'px-2.5 py-1.5' : 'p-1.5'
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <UserCircle2 className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                </span>
                {sidebarExpanded && (
                  <>
                    <span className="hidden max-w-28 truncate text-xs sm:inline-block sm:max-w-32">{displayName}</span>
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  </>
                )}
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
                      setProfileOpen(false)
                      navigate('/settings')
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
