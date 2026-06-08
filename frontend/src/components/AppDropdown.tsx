/**
 * AppDropdown — Shared branded dropdown component for the entire app.
 * Identical look to FilterPanel's Dropdown. Zero native OS select rendering.
 */

import { useEffect, useRef, useState } from 'react'

export type DropdownOption = {
    label: string
    value: string
    /** Optional dot color class e.g. "bg-emerald-500" for colored status dots */
    dotClass?: string
    /** If true renders the option slightly dimmer (for "all" placeholder options) */
    isPlaceholder?: boolean
}

type AppDropdownProps = {
    value: string
    onChange: (value: string) => void
    options: DropdownOption[]
    placeholder?: string
    /** Extra Tailwind classes on the trigger button e.g. "w-full" */
    className?: string
    disabled?: boolean
    /** If true, trigger fills 100% width */
    fullWidth?: boolean
}

export const AppDropdown = ({
    value,
    onChange,
    options,
    placeholder = 'Select…',
    className = '',
    disabled = false,
    fullWidth = false,
}: AppDropdownProps) => {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const selected = options.find(o => o.value === value)
    const label = selected ? selected.label : placeholder

    return (
        <div
            ref={ref}
            className={`relative ${fullWidth ? 'w-full' : 'w-full sm:w-36 sm:shrink-0 xl:w-44'} ${open ? 'z-60' : 'z-0'} ${className}`}
        >
            {/* Trigger */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen(prev => !prev)}
                className={`flex h-10 w-full items-center justify-between gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-[0.82rem] font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-3 select-none cursor-pointer ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-md'
                } ${
                    open
                        ? 'border-blue-500/45 ring-3 ring-blue-500/12 dark:border-blue-400/50 dark:ring-blue-400/20'
                        : 'border-zinc-250 dark:border-zinc-250'
                } bg-white text-zinc-900 dark:bg-zinc-150 dark:text-zinc-100`}
            >
                {/* Label row */}
                <span className={`flex min-w-0 items-center gap-1.5 truncate ${value ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {selected?.dotClass && (
                        <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dotClass}`} />
                    )}
                    <span className="truncate">{label}</span>
                </span>

                {/* Chevron */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${open ? 'rotate-180' : 'rotate-0'}`}
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {/* Dropdown panel — animated */}
            <div
                className={`absolute left-0 z-60 mt-2 w-full min-w-max origin-top overflow-hidden rounded-2xl border border-zinc-250 bg-white shadow-lg backdrop-blur-md transition-all duration-150 dark:border-zinc-250 dark:bg-zinc-150 dark:shadow-xl ${
                    open
                        ? 'pointer-events-auto scale-100 opacity-100'
                        : 'pointer-events-none scale-95 opacity-0'
                }`}
            >
                <div className="p-1.5 space-y-0.5">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false) }}
                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors duration-100 cursor-pointer ${
                                value === opt.value
                                    ? 'bg-blue-600 font-semibold text-white dark:bg-blue-500'
                                    : 'font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-250'
                            }`}
                        >
                            {/* Checkmark for selected */}
                            {value === opt.value ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            ) : opt.dotClass ? (
                                <span className={`h-2 w-2 shrink-0 rounded-full ${opt.dotClass}`} />
                            ) : (
                                <span className="w-[13px] shrink-0" />
                            )}

                            <span className="truncate">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default AppDropdown
