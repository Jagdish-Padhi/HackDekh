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
        default: 'pending',
    },

    notes: {
        type: String,
        default: '',
    },

    reflections: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            note: { type: String, default: '' },
        },
    ],

    // Users who need to write a reflection after this stage was resolved
    pendingReflectionFor: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],

}, { timestamps: true });

export default mongoose.model('Stage', stageSchema);