const router = require("express").Router();
const Habit = require("../models/Habit");
const auth = require("../middleware/authMiddleware");

const formatDate = (date = new Date()) => {
  return date.toISOString().split("T")[0];
};

const allowedTypes = ["health", "study", "fitness", "work", "personal", "other"];

// ================= CREATE HABIT =================
router.post("/", auth, async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const {
      title,
      type = "personal",
      goalTarget = 5,
      reminderEnabled = false,
      reminderTime = "",
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const normalizedType = allowedTypes.includes(type) ? type : "personal";
    const normalizedGoal = Math.min(7, Math.max(1, Number(goalTarget) || 1));
    const normalizedReminderTime =
      typeof reminderTime === "string" ? reminderTime.trim() : "";

    const habit = await Habit.create({
      user: req.user.id,
      title,
      type: normalizedType,
      goalTarget: normalizedGoal,
      reminderEnabled: Boolean(reminderEnabled),
      reminderTime: normalizedReminderTime,
      completedDates: [],
      freezeDates: [],
      freezeCount: 1,
    });

    console.log("SAVED HABIT:", habit);

    res.json(habit);

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// ================= GET HABITS =================
router.get("/", auth, async (req, res) => {
  try {
    console.log("GET USER:", req.user);

    const habits = await Habit.find({
      user: req.user.id,
    });

    console.log("FOUND HABITS:", habits);

    res.json(habits);

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// MARK HABIT COMPLETE FOR TODAY
router.put("/:id", auth, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    if (habit.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const today = formatDate();

    if (!habit.completedDates.includes(today)) {
      habit.completedDates.push(today);
    }

    // If user had frozen today, completion replaces freeze.
    habit.freezeDates = habit.freezeDates.filter((date) => date !== today);

    await habit.save();
    res.json(habit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// USE STREAK FREEZE FOR TODAY
router.post("/:id/freeze", auth, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    if (habit.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const today = formatDate();

    if (habit.completedDates.includes(today)) {
      return res
        .status(400)
        .json({ message: "Today's habit is already completed." });
    }

    if (habit.freezeDates.includes(today)) {
      return res.status(400).json({ message: "Freeze already used for today." });
    }

    if (habit.freezeCount <= 0) {
      return res.status(400).json({ message: "No streak freeze left." });
    }

    habit.freezeDates.push(today);
    habit.freezeCount -= 1;

    await habit.save();
    res.json(habit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE HABIT
router.delete("/:id", auth, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    if (habit.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await habit.deleteOne();

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;