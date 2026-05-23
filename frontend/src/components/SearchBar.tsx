import { Search } from 'lucide-react'

type SearchBarProps = {
    value: string
    onChange: (value: string) => void
}

const SearchBar = ({ value, onChange }: SearchBarProps) => (
    <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
            type="text"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3.5 py-2 text-sm text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-blue-500/45 focus:outline-none focus:ring-3 focus:ring-blue-500/12 lg:w-72 lg:shrink-0 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
            placeholder="Search hackathons"
            value={value}
            onChange={e => onChange(e.target.value)}
        />
    </div>
)

export default SearchBar