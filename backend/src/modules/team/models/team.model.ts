import mongoose from 'mongoose';
const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }
    ],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    code: {
        type: String,
        unique: true,
        sparse: true,
    },
}, { timestamps: true });

export default mongoose.model('Team', teamSchema);