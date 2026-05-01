const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["health", "study", "fitness", "work", "personal", "other"],
    default: "personal",
  },
  goalTarget: {
    type: Number,
    default: 5,
    min: 1,
    max: 7,
  },
  reminderEnabled: {
    type: Boolean,
    default: false,
  },
  reminderTime: {
    type: String,
    default: "",
  },
  completedDates: {
    type: [String],
    default: [],
  },
  freezeDates: {
    type: [String],
    default: [],
  },
  freezeCount: {
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model("Habit", habitSchema);