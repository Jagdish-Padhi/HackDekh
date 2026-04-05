const Footer = () => (
    <footer className="mt-auto w-full px-3 pb-4 pt-2 sm:px-4 lg:px-6">
        <div className="rounded-[1.4rem] border border-zinc-200/90 bg-white/75 px-4 py-4 text-center text-sm text-zinc-500 shadow-sm backdrop-blur-md transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400 dark:shadow-md">
            &copy; {new Date().getFullYear()} HackDekh. All rights reserved.
        </div>
    </footer>
)

export default Footer;