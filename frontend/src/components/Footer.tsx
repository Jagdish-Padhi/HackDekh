import { Github, Linkedin, Mail } from 'lucide-react';

const Footer = () => (
    <footer className="mt-auto w-full px-3 pb-4 pt-2 sm:px-4 lg:px-6">
        <div className="overflow-hidden rounded-[1.4rem] border border-zinc-200/90 bg-white/80 px-4 py-6 text-zinc-700 shadow-sm backdrop-blur-md transition-all duration-200 sm:px-6 sm:py-7 dark:border-zinc-800 dark:bg-zinc-900/75 dark:text-zinc-300 dark:shadow-md">
            <div className="grid gap-8 border-b border-zinc-200/80 pb-7 dark:border-zinc-800 lg:grid-cols-[1.2fr_0.8fr_0.9fr]">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <img
                            src="/BrandImages/HackDekh.png"
                            alt="HackDekh Logo"
                            className="h-11 w-11 rounded-2xl object-contain"
                        />
                        <div>
                            <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">HackDekh</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">by Jagdish Padhi</p>
                        </div>
                    </div>

                    <p className="max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                        A complete hackathon listing and tracking platform for modern teams. Built with focus on clean UX and practical workflows.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                        <a
                            href="https://github.com/Jagdish-Padhi"
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                            aria-label="GitHub profile"
                        >
                            <Github className="h-5 w-5" />
                        </a>
                        <a
                            href="https://www.linkedin.com/in/jagdish-padhi/"
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                            aria-label="LinkedIn profile"
                        >
                            <Linkedin className="h-5 w-5" />
                        </a>
                        <a
                            href="mailto:code369decode@gmail.com"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                            aria-label="Email Jagdish Padhi"
                        >
                            <Mail className="h-5 w-5" />
                        </a>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Quick Links</h3>
                    <div className="space-y-2 text-sm">
                        <a href="/" className="block text-zinc-600 transition hover:text-blue-700 dark:text-zinc-300 dark:hover:text-blue-300">Home</a>
                        <a href="/hackathons" className="block text-zinc-600 transition hover:text-blue-700 dark:text-zinc-300 dark:hover:text-blue-300">Hackathons</a>
                        <a href="/teams" className="block text-zinc-600 transition hover:text-blue-700 dark:text-zinc-300 dark:hover:text-blue-300">Teams</a>
                        <a href="/login" className="block text-zinc-600 transition hover:text-blue-700 dark:text-zinc-300 dark:hover:text-blue-300">Login</a>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Contact</h3>
                    <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                        <a href="mailto:code369decode@gmail.com" className="block break-all transition hover:text-blue-700 dark:hover:text-blue-300">
                            code369decode@gmail.com
                        </a>
                        <a href="https://github.com/Jagdish-Padhi" target="_blank" rel="noreferrer noopener" className="block transition hover:text-blue-700 dark:hover:text-blue-300">
                            github.com/Jagdish-Padhi
                        </a>
                        <a href="https://www.linkedin.com/in/jagdish-padhi/" target="_blank" rel="noreferrer noopener" className="block transition hover:text-blue-700 dark:hover:text-blue-300">
                            linkedin.com/in/jagdish-padhi
                        </a>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2 pt-6 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                <p>&copy; {new Date().getFullYear()} HackDekh. All rights reserved.</p>
                <p>
                    Built by <span className="font-semibold text-zinc-800 dark:text-zinc-200">Jagdish Padhi</span>
                </p>
            </div>
        </div>
    </footer>
)

export default Footer;