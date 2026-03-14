const Footer = () => (
    <footer className="px-4 pb-6 pt-2 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[1.4rem] border border-zinc-200/90 bg-white/75 px-6 py-4 text-center text-sm text-zinc-500 shadow-sm backdrop-blur-md transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400 dark:shadow-md">
            &copy; {new Date().getFullYear()} HackDekh. All rights reserved.
        </div>
    </footer>
)

export default Footer;