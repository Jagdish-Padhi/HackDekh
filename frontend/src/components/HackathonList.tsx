import { useEffect, useState } from 'react'
import HackathonCard from './HackathonCard'
import axiosInstance from '../utils/axiosInstance'

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

    useEffect(() => {
        axiosInstance.get('/hackathons')
            .then(res => {
                setHackathons(res.data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    if (loading) return <div>Loading...</div>
    if (!hackathons.length) return <div>No hackathons found.</div>

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {hackathons.map(hack => (
                <HackathonCard key={hack._id} hackathon={hack} />
            ))}
        </div>
    )
}

export default HackathonList