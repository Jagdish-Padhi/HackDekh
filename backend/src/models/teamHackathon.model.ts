import mongoose from 'mongoose';

const teamHackathonSchema = new mongoose.Schema({

    currentStage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stage',
    },

    status: {
        type: String,
        enum: ['active', 'eliminated', 'finalist', 'won'],
        default: 'active'
    },

    stages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stage',
    }],

    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true,
    },

    hackathon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hackathon',
        required: true,
        index: true,

    }

}, { timestamps: true });

export default mongoose.model('TeamHackathon', teamHackathonSchema);