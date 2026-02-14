import { useEffect, useState } from 'react'
import HackathonCard from './HackathonCard'
import axiosInstance from '../utils/axiosInstance'
import SearchBar from './SearchBarProps'
import FilterPanel from './FilterPanel'

type Hackathon = {
    _id: string
    title: string
    platform: string
    coverImage?: string
    startDate?: string
    deadline?: string
    mode?: string
    prize?: string
    location?: string
}

const HackathonList = () => {
    const [hackathons, setHackathons] = useState<Hackathon[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [platform, setPlatform] = useState('')
    const [mode, setMode] = useState('')

    useEffect(() => {
        axiosInstance.get('/hackathons')
            .then(res => {
                setHackathons(res.data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    // Filter logic (frontend for now)
    const filtered = hackathons.filter(h =>
        h.title.toLowerCase().includes(search.toLowerCase()) &&
        (platform ? h.platform === platform : true) &&
        (mode ? h.mode === mode : true)
    )

    if (loading) return <div>Loading...</div>
    if (!hackathons.length) return <div>No hackathons found.</div>

    return (
        <div>
            <SearchBar value={search} onChange={setSearch} />
            <FilterPanel platform={platform} setPlatform={setPlatform} mode={mode} setMode={setMode} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filtered.map(hack => (
                    <HackathonCard key={hack._id} hackathon={hack} />
                ))}
            </div>

        </div>
    )
}

export default HackathonList