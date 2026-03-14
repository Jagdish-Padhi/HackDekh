type SearchBarProps = {
    value: string
    onChange: (value: string) => void
}

const SearchBar = ({ value, onChange }: SearchBarProps) => (
    <input
        type="text"
        className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm text-gray-900 shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-blue-500/45 focus:outline-none focus:ring-4 focus:ring-blue-500/12 md:max-w-xl dark:border-[#1F1F22] dark:bg-[#121214] dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
        placeholder="Search Hackathons..."
        value={value}
        onChange={e => onChange(e.target.value)}
    />
)

export default SearchBar