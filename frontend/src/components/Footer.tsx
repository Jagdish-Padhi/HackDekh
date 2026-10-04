import { Github, Heart, Linkedin, Mail } from 'lucide-react';

const Footer = () => (
    <footer className="mt-auto w-full border-t border-zinc-200/80 bg-white/40 backdrop-blur-md dark:border-zinc-850 dark:bg-zinc-950/40">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
            {/* Left: Built with heart by Jagdish Padhi (with GitHub link) */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span>Built with</span>
                <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 shrink-0" />
                <span>by</span>
                <a
                    href="https://github.com/Jagdish-Padhi"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-zinc-900 underline-offset-4 transition hover:underline hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
                >
                    Jagdish Padhi
                </a>
            </div>

            {/* Center: Copyright */}
            <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                &copy; {new Date().getFullYear()} HackDekh. All rights reserved.
            </div>

            {/* Right: Platform & Contact Icon Links */}
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <a
                    href="https://github.com/Jagdish-Padhi"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-white"
                    aria-label="GitHub profile"
                    title="GitHub"
                >
                    <Github className="h-4 w-4" />
                </a>
                <a
                    href="https://www.linkedin.com/in/jagdish-padhi/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-white"
                    aria-label="LinkedIn profile"
                    title="LinkedIn"
                >
                    <Linkedin className="h-4 w-4" />
                </a>
                <a
                    href="mailto:code369decode@gmail.com"
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-white"
                    aria-label="Email Jagdish Padhi"
                    title="Contact Email"
                >
                    <Mail className="h-4 w-4" />
                </a>
            </div>
        </div>
    </footer>
);

export default Footer;
