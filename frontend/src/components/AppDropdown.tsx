/**
 * AppDropdown — Shared branded dropdown component for the entire app.
 * Identical look to FilterPanel's Dropdown. Zero native OS select rendering.
 * Fully responsive with alignment & size support, and strict zero-overflow bounds.
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
    /** Extra Tailwind classes on the trigger button container e.g. "w-full" or "w-64" */
    className?: string
    disabled?: boolean
    /** If true, trigger fills 100% width */
    fullWidth?: boolean
    /** Alignment of menu popover relative to trigger button */
    align?: 'left' | 'right'
    /** Size variant: 'md' (40px, default) or 'sm' (36px) */
    size?: 'sm' | 'md'
}

export const AppDropdown = ({
    value,
    onChange,
    options,
    placeholder = 'Select…',
    className = '',
    disabled = false,
    fullWidth = false,
    align = 'left',
    size = 'md',
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

    const widthClass = fullWidth
        ? 'w-full'
        : className.includes('w-')
            ? ''
            : 'w-full sm:w-36 sm:shrink-0 xl:w-44'

    const heightClass = size === 'sm' ? 'h-9 px-2.5 py-1 text-xs' : 'h-10 px-3 py-2 text-[0.82rem]'

    return (
        <div
            ref={ref}
            className={`relative ${widthClass} ${open ? 'z-60' : 'z-0'} ${className}`}
        >
            {/* Trigger */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen(prev => !prev)}
                title={label}
                className={`flex ${heightClass} w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg border font-medium shadow-xs transition-all duration-150 focus:outline-none select-none cursor-pointer ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-350 dark:hover:border-zinc-650'
                } ${
                    open
                        ? 'border-blue-500 ring-2 ring-blue-500/15 dark:border-blue-400 dark:ring-blue-400/20'
                        : 'border-zinc-250 dark:border-zinc-750'
                } bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100`}
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
                    width={size === 'sm' ? 10 : 12}
                    height={size === 'sm' ? 10 : 12}
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

            {/* Dropdown panel — aligned, bounded and zero overflow */}
            <div
                className={`absolute ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} z-60 mt-1.5 min-w-full sm:min-w-[200px] max-w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl backdrop-blur-md transition-all duration-150 dark:border-zinc-800 dark:bg-zinc-900 ${
                    open
                        ? 'pointer-events-auto scale-100 opacity-100'
                        : 'pointer-events-none scale-95 opacity-0'
                }`}
            >
                <div className="p-1 space-y-0.5 max-h-64 overflow-y-auto">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false) }}
                            title={opt.label}
                            className={`flex w-full items-center justify-between gap-2 rounded-md ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'} transition-colors duration-100 cursor-pointer ${
                                value === opt.value
                                    ? 'bg-blue-600 font-semibold text-white dark:bg-blue-600'
                                    : 'font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <span className="flex min-w-0 items-center gap-2 truncate">
                                {opt.dotClass && (
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${opt.dotClass}`} />
                                )}
                                <span className="truncate">{opt.label}</span>
                            </span>

                            {value === opt.value && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default AppDropdown
