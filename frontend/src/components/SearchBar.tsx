type SearchBarProps = {
    value: string
    onChange: (value: string) => void
}

const SearchBar = ({ value, onChange }: SearchBarProps) => (
    <input
        type="text"
        className="w-full md:w-1/2 px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-blue-500"
        placeholder="Search Hackathons..."
        value={value}
        onChange={e => onChange(e.target.value)}
    />
)

export default SearchBar