import mongoose from 'mongoose';
import crypto from 'crypto';

const teamInvitationSchema = new mongoose.Schema({
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true,
    },

    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    invitedEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },

    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired'],
        default: 'pending',
    },

    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },

    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    acceptedAt: {
        type: Date,
    },

}, { timestamps: true });

// Auto-expire invitations
teamInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('TeamInvitation', teamInvitationSchema);
