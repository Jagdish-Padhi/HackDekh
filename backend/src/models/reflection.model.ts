import mongoose from 'mongoose';

const reflectionSchema = new mongoose.Schema({
    stage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stage',
        required: true,
        index: true,
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    note: {
        type: String,
        required: true,
    }
}, { timestamps: true })
