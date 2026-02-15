import { NavLink } from 'react-router-dom';

const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Hackathons', path: '/hackathons' },
    { name: 'Teams', path: '/teams' },
    { name: 'My Dashboard', path: '/dashboard' },
   
];

const Navbar = () => (
    <nav className="bg-background-elevated border-b border-background-border px-4 py-2 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
            <img src="/HackDekhSVG.svg" alt="HackDekh Logo" className="rounded-full h-12 w-12" />
            <span className="text-xl font-bold text-violet-brand font-sans tracking-tight">HackDekh</span>
        </div>
        <div className="flex gap-4">
            {navItems.map((item) => (
                <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                        `px-3 py-1 rounded-md font-medium transition-colors text-text-secondary hover:text-violet-brand hover:bg-background-card ${isActive ? 'bg-violet-brand text-white shadow-violet' : ''
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
