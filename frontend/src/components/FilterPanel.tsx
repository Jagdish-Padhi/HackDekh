type FilterPanelProps = {
  platform: string
  setPlatform: (value: string) => void
  mode: string
  setMode: (value: string) => void
}

const FilterPanel = ({ platform, setPlatform, mode, setMode }: FilterPanelProps) => (
  <div className="flex flex-wrap gap-4 mb-4">
    <select
      className="px-3 py-2 border rounded-md focus:outline-none"
      style={{ background: '#181825', color: '#F3F4F6', borderColor: '#2A2A3A' }}
      value={platform}
      onChange={e => setPlatform(e.target.value)}
    >
      <option value="">All Platforms</option>
      <option value="Devfolio">Devfolio</option>
      <option value="Unstop">Unstop</option>
    </select>
    <select
      className="px-3 py-2 border rounded-md focus:outline-none"
      style={{ background: '#181825', color: '#F3F4F6', borderColor: '#2A2A3A' }}
      value={mode}
      onChange={e => setMode(e.target.value)}
    >
      <option value="">All Modes</option>
      <option value="Online">Online</option>
      <option value="Offline">Offline</option>
    </select>
  </div>
)

export default FilterPanel