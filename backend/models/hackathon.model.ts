import mongoose from "mongoose";

const hackSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      index: true,
    },

    startDate: {
      type: Date,
    },

    deadline: {
      type: Date,
    },

    applyLink: {
      type: String,
    },

    mode: {
      type: String,
      required: true,
      index: true,
    },

    teamSize: {
      type: String,
    },

    platform: {
      type: String,
    },

    organization: {
      type: String,
    },

    scrapedFromURL: {
      type: String,
    },

    tags: {
      type: [String],
    },

    prize: {
      type: String,
    },

    location: {
      type: String,
    },

    coverImage: {
      type: String,
    },
  },
  { timestamps: true }
);

hackSchema.index({slug:1, platform:1},{unique:true});

export default mongoose.model("Hackathon", hackSchema);