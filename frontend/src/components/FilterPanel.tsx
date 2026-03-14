type FilterPanelProps = {
  platform: string
  setPlatform: (value: string) => void
  mode: string
  setMode: (value: string) => void
}

const FilterPanel = ({ platform, setPlatform, mode, setMode }: FilterPanelProps) => (
  <div className="flex flex-wrap gap-3">
    <select
      className="theme-field theme-select min-w-[12rem] rounded-2xl px-4 py-3 text-sm text-text-primary"
      value={platform}
      onChange={e => setPlatform(e.target.value)}
    >
      <option value="">All Platforms</option>
      <option value="Devfolio">Devfolio</option>
      <option value="Unstop">Unstop</option>
    </select>
    <select
      className="theme-field theme-select min-w-[12rem] rounded-2xl px-4 py-3 text-sm text-text-primary"
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