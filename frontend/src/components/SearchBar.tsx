type SearchBarProps = {
    value: string
    onChange: (value: string) => void
}

const SearchBar = ({ value, onChange }: SearchBarProps) => (
    <input
        type="text"
        className="theme-field w-full rounded-2xl px-5 py-3.5 text-sm text-text-primary md:max-w-xl"
        placeholder="Search Hackathons..."
        value={value}
        onChange={e => onChange(e.target.value)}
    />
)

export default SearchBar