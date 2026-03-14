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
            <div className="sticky top-26 z-30 bg-white/95 pb-4 backdrop-blur-md dark:bg-zinc-950/95">
                <div className="rounded-[1.8rem] border border-zinc-200 bg-zinc-50 p-4 shadow-sm transition-all duration-200 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-md">
                    <div className="flex flex-row gap-4 max-md:flex-col">
                        <SearchBar value={search} onChange={setSearch} />
                        <FilterPanel platform={platform} setPlatform={setPlatform} mode={mode} setMode={setMode} />
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <div className="rounded-[1.8rem] border border-zinc-200/90 bg-white/90 px-6 py-16 text-center text-sm font-medium uppercase tracking-[0.18em] text-zinc-600 shadow-sm backdrop-blur-md transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900/78 dark:text-zinc-400 dark:shadow-md">
                        Loading...
                    </div>
                ) : filtered.length ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {filtered.map(hack => (
                            <HackathonCard key={hack._id} hackathon={hack} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[1.8rem] border border-zinc-200/90 bg-white/90 px-6 py-16 text-center text-base text-zinc-600 shadow-sm backdrop-blur-md transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900/78 dark:text-zinc-400 dark:shadow-md">
                        No hackathons found...
                    </div>
                )}
            </div>

        </div>
    )
}

export default HackathonList