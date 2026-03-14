const Footer = () => (
    <footer className="px-4 pb-6 pt-2 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[1.4rem] border border-gray-200/80 bg-white/75 px-6 py-4 text-center text-sm text-gray-500 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 dark:border-[#1F1F22] dark:bg-[#121214]/70 dark:text-gray-400 dark:shadow-[0_20px_48px_rgba(0,0,0,0.45)]">
            &copy; {new Date().getFullYear()} HackDekh. All rights reserved.
        </div>
    </footer>
)

export default Footer;