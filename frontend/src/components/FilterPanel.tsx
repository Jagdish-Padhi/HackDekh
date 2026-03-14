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
        <div ref={ref} className="relative w-full sm:w-auto sm:min-w-48">
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 ${
                    open
                        ? 'border-blue-500/45 ring-4 ring-blue-500/12 dark:border-blue-400/50 dark:ring-blue-400/20'
                        : 'border-gray-200 dark:border-[#1F1F22]'
                } bg-white text-gray-900 dark:bg-[#121214] dark:text-gray-100`}
            >
                <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
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
                    className={`shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${open ? 'rotate-180' : 'rotate-0'}`}
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {/* Dropdown panel */}
            <div
                className={`absolute left-0 z-50 mt-2 w-full min-w-full origin-top overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-200 dark:border-[#1F1F22] dark:bg-[#161618] dark:shadow-[0_20px_48px_rgba(0,0,0,0.5)] ${
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
                                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/8'
                            }`}
                        >
                            {value === opt.value && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            )}
                            <span className={value === opt.value ? '' : 'ml-[17px]'}>{opt.label}</span>
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

const FilterPanel = ({ platform, setPlatform, mode, setMode }: FilterPanelProps) => (
    <div className="flex flex-wrap gap-3">
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
    </div>
)

export default FilterPanel