import { NavLink } from 'react-router-dom';

const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Hackathons', path: '/hackathons' },
    { name: 'Teams', path: '/teams' },
    { name: 'My Dashboard', path: '/dashboard' },
   
];

const Navbar = () => (
    <nav className="theme-panel mx-auto flex w-full max-w-7xl flex-col gap-4 rounded-[1.4rem] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-[0_16px_36px_rgba(0,0,0,0.24)]">
                <img src="/HackDekhSVG.svg" alt="HackDekh Logo" className="h-9 w-9 object-contain" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-text-primary">Hack<span className="accent-text">Dekh</span></span>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/8 bg-white/[0.02] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            {navItems.map((item) => (
                <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                        `rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'theme-button-primary border-transparent px-4 py-2 text-white'
                            : 'text-text-secondary hover:border-white/10 hover:bg-white/[0.05] hover:text-text-primary'
                        }`
                    }
                >
                    {item.name}
                </NavLink>
            ))}
        </div>
    </nav>
);

export default Navbar;
