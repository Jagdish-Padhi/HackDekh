type SearchBarProps = {
    value: string
    onChange: (value: string) => void
}

const SearchBar = ({ value, onChange }: SearchBarProps) => (
    <input
        type="text"
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-blue-500/45 focus:outline-none focus:ring-4 focus:ring-blue-500/12 lg:w-68 lg:shrink-0 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
        placeholder="Search hackathons"
        value={value}
        onChange={e => onChange(e.target.value)}
    />
)

export default SearchBar