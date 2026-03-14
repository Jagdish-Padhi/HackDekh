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
            <div className="rounded-[1.8rem] border border-gray-200/80 bg-white/82 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 sm:p-5 dark:border-[#1F1F22] dark:bg-[#121214]/80 dark:shadow-[0_24px_50px_rgba(0,0,0,0.42)]">
                <div className="flex flex-col gap-4">
                    <SearchBar value={search} onChange={setSearch} />
                    <FilterPanel platform={platform} setPlatform={setPlatform} mode={mode} setMode={setMode} />
                </div>
            </div>
            {loading ? (
                <div className="rounded-[1.8rem] border border-gray-200/80 bg-white/80 px-6 py-16 text-center text-sm font-medium uppercase tracking-[0.18em] text-gray-600 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 dark:border-[#1F1F22] dark:bg-[#121214]/78 dark:text-gray-400 dark:shadow-[0_20px_44px_rgba(0,0,0,0.38)]">
                    Loading...
                </div>
            ) : filtered.length ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map(hack => (
                        <HackathonCard key={hack._id} hackathon={hack} />
                    ))}
                </div>
            ) : (
                <div className="rounded-[1.8rem] border border-gray-200/80 bg-white/80 px-6 py-16 text-center text-base text-gray-600 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 dark:border-[#1F1F22] dark:bg-[#121214]/78 dark:text-gray-400 dark:shadow-[0_20px_44px_rgba(0,0,0,0.38)]">
                    No hackathons found...
                </div>
            )}

        </div>
    )
}

export default HackathonList