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

const HackathonCard = ({ hackathon }: { hackathon: Hackathon }) => (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col hover:shadow-lg transition">
        {hackathon.coverImage && (
            <img src={hackathon.coverImage} alt={hackathon.title}
                className="h-32 w-full object-cover rounded mb-2" />
        )}

        <h2 className="h-32 w-full object-cover rounded mb-2"> {hackathon.title} </h2>
        <div className="text-sm text-gray-500 mb-2"> {hackathon.platform}</div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
            <span> start: {hackathon.startDate?.slice(0, 10)}</span>
            <span> start: {hackathon.deadline?.slice(0, 10)}</span>
        </div>

        <div className="flex justify-between items-center mt-auto">
            <span className="text-blue-600 font-semibold">
                {hackathon.mode}
            </span>

            {hackathon.prize && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                    {hackathon.prize}
                </span>
            )}
        </div>
    </div>
);


export default HackathonCard;