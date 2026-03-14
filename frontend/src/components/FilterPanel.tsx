import { useEffect, useRef, useState } from 'react'

type Option = { label: string; value: string }

type DropdownProps = {
    value: string
    onChange: (value: string) => void
    options: Option[]
    placeholder: string
}

const Dropdown = ({ value, onChange, options, placeholder }: DropdownProps) => {
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
        <div ref={ref} className="relative w-full sm:w-43 sm:shrink-0">
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className={`flex h-12 w-full items-center justify-between gap-3 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 ${
                    open
                        ? 'border-blue-500/45 ring-4 ring-blue-500/12 dark:border-blue-400/50 dark:ring-blue-400/20'
                        : 'border-zinc-200 dark:border-zinc-800'
                } bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100`}
            >
                <span className={`truncate ${value ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {label}
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

            {/* Dropdown panel */}
            <div
                className={`absolute left-0 z-50 mt-2 w-full min-w-full origin-top overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm backdrop-blur-md transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-md ${
                    open
                        ? 'pointer-events-auto scale-100 opacity-100'
                        : 'pointer-events-none scale-95 opacity-0'
                }`}
            >
                <div className="p-1.5">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false) }}
                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 ${
                                value === opt.value
                                    ? 'bg-blue-600 font-medium text-white dark:bg-blue-500'
                                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/70'
                            }`}
                        >
                            {value === opt.value && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            )}
                            <span className={`${value === opt.value ? '' : 'ml-4'} truncate`}>{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

type FilterPanelProps = {
    platform: string
    setPlatform: (value: string) => void
    mode: string
    setMode: (value: string) => void
    sortBy: string
    setSortBy: (value: string) => void
}

const platformOptions: Option[] = [
    { label: 'All Platforms', value: '' },
    { label: 'Devfolio', value: 'Devfolio' },
    { label: 'Unstop', value: 'Unstop' },
]

const modeOptions: Option[] = [
    { label: 'All Modes', value: '' },
    { label: 'Online', value: 'Online' },
    { label: 'Offline', value: 'Offline' },
]

const sortOptions: Option[] = [
    { label: 'Default Order', value: '' },
    { label: 'Deadline (Ascending)', value: 'deadline-asc' },
    { label: 'Deadline (Descending)', value: 'deadline-desc' },
    { label: 'Prize (Descending)', value: 'prize-desc' },
    { label: 'Prize (Ascending)', value: 'prize-asc' },
]

const FilterPanel = ({ platform, setPlatform, mode, setMode, sortBy, setSortBy }: FilterPanelProps) => (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto lg:shrink-0 lg:flex-nowrap">
        <Dropdown
            value={platform}
            onChange={setPlatform}
            options={platformOptions}
            placeholder="All Platforms"
        />
        <Dropdown
            value={mode}
            onChange={setMode}
            options={modeOptions}
            placeholder="All Modes"
        />
        <Dropdown
            value={sortBy}
            onChange={setSortBy}
            options={sortOptions}
            placeholder="Sort By"
        />
    </div>
)

export default FilterPanel