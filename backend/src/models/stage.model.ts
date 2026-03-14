import mongoose from 'mongoose';

const stageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },

    teamHackathon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamHackathon',
        required: true,
        index: true,
    },

    deadline: {
        type: Date,
    },
    result: {
        type: String,
        enum: ['pending', 'qualified', 'rejected'],
        default: 'pending'
    },
    notes: {
        type: String,
    },
    reflections: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId, ref: 'User',
                required: true
            },
            note: { type: String }

        },

    ]
}, { timestamps: true });