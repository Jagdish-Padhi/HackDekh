import { Github, Linkedin } from 'lucide-react';

const Footer = () => (
    <footer className="mt-auto w-full px-3 pb-4 pt-2 sm:px-4 lg:px-6">
        <div className="rounded-[1.4rem] border border-zinc-200/90 bg-white/85 px-4 py-5 shadow-sm backdrop-blur-md transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-md">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    &copy; {new Date().getFullYear()} HackDekh. Built with 🩵 by Jagdish Padhi.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <a
                        href="https://github.com/Jagdish-Padhi"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:text-white"
                        aria-label="GitHub profile"
                    >
                        <Github className="h-4 w-4" />
                        GitHub
                    </a>
                    <a
                        href="https://www.linkedin.com/in/jagdish-padhi/"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:text-white"
                        aria-label="LinkedIn profile"
                    >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                    </a>
                </div>
            </div>
        </div>
    </footer>
)

export default Footer;