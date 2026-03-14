import { useEffect, useState } from 'react'
import HackathonCard from './HackathonCard'
import axiosInstance from '../utils/axiosInstance'
import SearchBar from './SearchBar'
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


    return (
        <div className="space-y-6">
            <div className="theme-panel rounded-[1.8rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4">
                    <SearchBar value={search} onChange={setSearch} />
                    <FilterPanel platform={platform} setPlatform={setPlatform} mode={mode} setMode={setMode} />
                </div>
            </div>
            {loading ? (
                <div className="theme-panel rounded-[1.8rem] px-6 py-16 text-center text-sm font-medium tracking-[0.18em] text-text-secondary uppercase">
                    Loading...
                </div>
            ) : filtered.length ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map(hack => (
                        <HackathonCard key={hack._id} hackathon={hack} />
                    ))}
                </div>
            ) : (
                <div className="theme-panel rounded-[1.8rem] px-6 py-16 text-center text-base text-text-secondary">
                    No hackathons found...
                </div>
            )}

        </div>
    )
}

export default HackathonList