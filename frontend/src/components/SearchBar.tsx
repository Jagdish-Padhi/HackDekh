type SearchBarProps = {
    value: string
    onChange: (value: string) => void
}

const SearchBar = ({ value, onChange }: SearchBarProps) => (
    <input
        type="text"
        className="w-full md:w-1/2 px-4 py-2 border border-background-border rounded-md bg-background-card text-text-primary placeholder:text-text-muted mb-4 focus:outline-none focus:ring-2 focus:ring-violet-brand"
        placeholder="Search Hackathons..."
        value={value}
        onChange={e => onChange(e.target.value)}
    />
)

export default SearchBar