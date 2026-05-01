import { useCallback, useEffect, useRef, useState } from "react";

export default function Dashboard() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [title, setTitle] = useState("");
  const [habitType, setHabitType] = useState("personal");
  const [goalTarget, setGoalTarget] = useState(5);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [actionId, setActionId] = useState("");
  const [habitViewMode, setHabitViewMode] = useState({});
  const token = localStorage.getItem("token");
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const reminderShownRef = useRef(new Set());
  const asArray = (value) => (Array.isArray(value) ? value : []);
  const habitTypes = ["health", "study", "fitness", "work", "personal", "other"];

  const getTodayString = () => new Date().toISOString().split("T")[0];
  const toDateString = (date) => date.toISOString().split("T")[0];

  const fetchHabits = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("http://localhost:5000/api/habits", {
        headers: { Authorization: token },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setErrorMessage(data.message || "Could not load habits.");
        setHabits([]);
        return;
      }
      setHabits(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage("Could not connect to backend. Check server on port 5000.");
      setHabits([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const addHabit = async () => {
    if (!title.trim()) {
      setErrorMessage("Please enter a habit title.");
      return;
    }
    setActionId("add");
    setErrorMessage("");
    setFeedbackMessage("");
    try {
      const res = await fetch("http://localhost:5000/api/habits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          title: title.trim(),
          type: habitType,
          goalTarget,
          reminderEnabled,
          reminderTime,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.message || "Could not create habit.");
        return;
      }
      setTitle("");
      setHabitType("personal");
      setGoalTarget(5);
      setReminderEnabled(false);
      setReminderTime("");
      setFeedbackMessage("Habit created.");
      fetchHabits();
    } catch (error) {
      setErrorMessage("Failed to create habit.");
    } finally {
      setActionId("");
    }
  };

  const markComplete = async (id) => {
    setActionId(id);
    try {
      const res = await fetch(`http://localhost:5000/api/habits/${id}`, {
        method: "PUT",
        headers: { Authorization: token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.message || "Could not mark as done.");
        return;
      }
      setFeedbackMessage("Marked complete for today.");
      fetchHabits();
    } finally {
      setActionId("");
    }
  };

  const applyFreeze = async (id) => {
    setActionId(id);
    setErrorMessage("");
    try {
      const res = await fetch(`http://localhost:5000/api/habits/${id}/freeze`, {
        method: "POST",
        headers: { Authorization: token },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        setErrorMessage(error.message || "Could not use streak freeze.");
        return;
      }

      setFeedbackMessage("Streak freeze used for today.");
      fetchHabits();
    } finally {
      setActionId("");
    }
  };

  const deleteHabit = async (id) => {
    setActionId(id);
    try {
      const res = await fetch(`http://localhost:5000/api/habits/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.message || "Could not delete habit.");
        return;
      }
      setFeedbackMessage("Habit deleted.");
      fetchHabits();
    } finally {
      setActionId("");
    }
  };

  const normalizeDateSet = (dates = []) => {
    return new Set(
      dates.map((date) => {
        if (typeof date === "string" && date.length >= 10) {
          return date.slice(0, 10);
        }
        return toDateString(new Date(date));
      })
    );
  };

  const getDayStatus = (dateKey, completedSet, freezeSet, todayKey) => {
    if (completedSet.has(dateKey)) return "completed";
    if (freezeSet.has(dateKey)) return "freeze";
    if (dateKey < todayKey) return "missed";
    return "pending";
  };

  const calculateCurrentStreak = (completedDates = [], freezeDates = []) => {
    const completedSet = normalizeDateSet(completedDates);
    const freezeSet = normalizeDateSet(freezeDates);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toDateString(today);

    let streak = 0;
    let cursor = new Date(today);
    let status = getDayStatus(toDateString(cursor), completedSet, freezeSet, todayKey);

    // Allow streak to continue from yesterday if user hasn't marked today yet.
    if (status === "pending") {
      cursor = new Date(cursor.getTime() - MS_PER_DAY);
      status = getDayStatus(toDateString(cursor), completedSet, freezeSet, todayKey);
    }

    while (status === "completed" || status === "freeze") {
      streak += 1;
      cursor = new Date(cursor.getTime() - MS_PER_DAY);
      status = getDayStatus(toDateString(cursor), completedSet, freezeSet, todayKey);
    }

    return streak;
  };

  const calculateLongestStreak = (completedDates = [], freezeDates = []) => {
    const allDoneDates = [...completedDates, ...freezeDates];
    if (!allDoneDates.length) return 0;

    const uniqueDates = [...normalizeDateSet(allDoneDates)].sort((a, b) =>
      a.localeCompare(b)
    );

    let longest = 1;
    let current = 1;

    for (let i = 1; i < uniqueDates.length; i += 1) {
      const prevDate = new Date(`${uniqueDates[i - 1]}T00:00:00`);
      const currDate = new Date(`${uniqueDates[i]}T00:00:00`);
      const diffDays = Math.round((currDate - prevDate) / MS_PER_DAY);

      if (diffDays === 1) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }

    return longest;
  };

  const getCalendarDays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingSpaces = firstDay.getDay();

    const calendarDays = [];

    for (let i = 0; i < leadingSpaces; i += 1) {
      calendarDays.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      calendarDays.push(new Date(year, month, day));
    }

    return calendarDays;
  };

  const getHistory = (habit) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toDateString(today);
    const completedSet = normalizeDateSet(asArray(habit.completedDates));
    const freezeSet = normalizeDateSet(asArray(habit.freezeDates));
    const history = [];

    for (let i = 0; i < 14; i += 1) {
      const date = new Date(today.getTime() - i * MS_PER_DAY);
      const dateKey = toDateString(date);
      history.push({
        dateKey,
        status: getDayStatus(dateKey, completedSet, freezeSet, todayKey),
      });
    }

    return history;
  };

  const getStatusBadgeClass = (status) => {
    if (status === "completed") return "bg-success-subtle text-success-emphasis";
    if (status === "freeze") return "bg-info-subtle text-info-emphasis";
    if (status === "missed") return "bg-danger-subtle text-danger-emphasis";
    return "bg-secondary-subtle text-secondary-emphasis";
  };

  const getStatusText = (status) => {
    if (status === "completed") return "Done";
    if (status === "freeze") return "Freeze";
    if (status === "missed") return "Missed";
    return "Pending";
  };

  const getViewMode = (habitId) => habitViewMode[habitId] || "overview";

  const getCompletedCountInLast7Days = (habit) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedSet = normalizeDateSet(asArray(habit.completedDates));
    const freezeSet = normalizeDateSet(asArray(habit.freezeDates));
    let count = 0;

    for (let i = 0; i < 7; i += 1) {
      const day = new Date(today.getTime() - i * MS_PER_DAY);
      const key = toDateString(day);
      if (completedSet.has(key) || freezeSet.has(key)) {
        count += 1;
      }
    }

    return count;
  };

  const getWeeklyGraphData = (habit) => {
    const doneSet = normalizeDateSet([
      ...asArray(habit.completedDates),
      ...asArray(habit.freezeDates),
    ]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const data = [];

    for (let weekOffset = 3; weekOffset >= 0; weekOffset -= 1) {
      const weekEnd = new Date(today.getTime() - weekOffset * 7 * MS_PER_DAY);
      const weekStart = new Date(weekEnd.getTime() - 6 * MS_PER_DAY);
      let count = 0;

      for (let i = 0; i < 7; i += 1) {
        const day = new Date(weekStart.getTime() + i * MS_PER_DAY);
        if (doneSet.has(toDateString(day))) {
          count += 1;
        }
      }

      data.push({
        label: `W${4 - weekOffset}`,
        count,
        percent: Math.min(100, Math.round((count / 7) * 100)),
      });
    }

    return data;
  };

  useEffect(() => {
    if (!habits.length) return;
    const dateSetFrom = (dates = []) =>
      new Set(
        dates.map((date) => {
          if (typeof date === "string" && date.length >= 10) {
            return date.slice(0, 10);
          }
          return toDateString(new Date(date));
        })
      );

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const checkReminders = () => {
      const now = new Date();
      const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      const todayKey = getTodayString();

      habits.forEach((habit) => {
        if (!habit.reminderEnabled || !habit.reminderTime) return;

        const alreadyDoneToday =
          dateSetFrom(asArray(habit.completedDates)).has(todayKey) ||
          dateSetFrom(asArray(habit.freezeDates)).has(todayKey);
        if (alreadyDoneToday) return;

        const reminderKey = `${habit._id}-${todayKey}-${habit.reminderTime}`;
        if (reminderShownRef.current.has(reminderKey)) return;

        if (habit.reminderTime === nowTime) {
          reminderShownRef.current.add(reminderKey);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Habit Reminder", {
              body: `Time to complete: ${habit.title}`,
            });
          } else {
            alert(`Reminder: time to complete "${habit.title}"`);
          }
        }
      });
    };

    checkReminders();
    const timer = setInterval(checkReminders, 60 * 1000);
    return () => clearInterval(timer);
  }, [habits]);

  const visibleHabits = habits.filter((habit) => {
    const matchesSearch = habit.title
      ?.toLowerCase()
      .includes(searchText.toLowerCase().trim());
    const matchesType = filterType === "all" ? true : (habit.type || "personal") === filterType;
    return matchesSearch && matchesType;
  });

  const averageProgress =
    habits.length === 0
      ? 0
      : Math.round(
          habits.reduce((sum, habit) => {
            const goal = Number(habit.goalTarget) || 5;
            const completed = getCompletedCountInLast7Days(habit);
            return sum + Math.min(100, Math.round((completed / goal) * 100));
          }, 0) / habits.length
        );

  const totalCurrentStreak = habits.reduce(
    (sum, habit) =>
      sum +
      calculateCurrentStreak(
        asArray(habit.completedDates),
        asArray(habit.freezeDates)
      ),
    0
  );

  return (
    <div className="dashboard-page py-4 py-md-5">
      <div className="container">
        <div className="dashboard-header mb-4">
          <div>
            <h1 className="dashboard-title mb-1">Your Habit Dashboard</h1>
            <p className="text-muted mb-0">Track streaks, goals, and daily consistency.</p>
          </div>
          <button
            className="btn btn-outline-secondary dashboard-logout-btn"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/";
            }}
          >
            Logout
          </button>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="stat-card">
              <p className="stat-label mb-1">Total Habits</p>
              <h3 className="mb-0">{habits.length}</h3>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stat-card">
              <p className="stat-label mb-1">Combined Current Streaks</p>
              <h3 className="mb-0">{totalCurrentStreak}</h3>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stat-card">
              <p className="stat-label mb-1">Average Goal Progress</p>
              <h3 className="mb-0">{averageProgress}%</h3>
            </div>
          </div>
        </div>

        {(errorMessage || feedbackMessage) && (
          <div
            className={`alert ${errorMessage ? "alert-danger" : "alert-success"} py-2`}
            role="alert"
          >
            {errorMessage || feedbackMessage}
          </div>
        )}

        <div className="card mb-4 dashboard-panel">
          <div className="card-body">
              <h5 className="mb-3 panel-title">Add Habit</h5>
            <div className="row g-2">
              <div className="col-lg-4">
                <input
                  className="form-control"
                  placeholder="Enter new habit..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="col-lg-2 col-md-4">
                <select
                  className="form-select"
                  value={habitType}
                  onChange={(e) => setHabitType(e.target.value)}
                >
                  {habitTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-lg-2 col-md-4">
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  max="7"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
                  placeholder="Goal / week"
                />
              </div>
              <div className="col-lg-2 col-md-4">
                <input
                  className="form-control"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  disabled={!reminderEnabled}
                />
              </div>
              <div className="col-lg-1 col-md-6 d-flex align-items-center">
                <div className="form-check">
                  <input
                    id="reminderEnabled"
                    className="form-check-input"
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="reminderEnabled">
                    Remind
                  </label>
                </div>
              </div>
              <div className="col-lg-1 col-md-6 d-grid">
                <button
                  className="btn btn-primary"
                  onClick={addHabit}
                  disabled={actionId === "add"}
                >
                  {actionId === "add" ? "..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-4 dashboard-panel">
          <div className="card-body">
            <h5 className="mb-3 panel-title">Filter</h5>
            <div className="row g-2">
              <div className="col-md-8">
                <input
                  className="form-control"
                  placeholder="Search by habit name..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <select
                  className="form-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {habitTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">Loading habits...</div>
        ) : visibleHabits.length === 0 ? (
          <div className="empty-state">
            <h5 className="mb-2">No habits to show</h5>
            <p className="text-muted mb-0">
              Add a habit above or change your filters.
            </p>
          </div>
        ) : (
          visibleHabits.map((h) => {
            const weeklyCompleted = getCompletedCountInLast7Days(h);
            const weeklyGoal = h.goalTarget || 5;
            const weeklyProgress = Math.min(
              100,
              Math.round((weeklyCompleted / weeklyGoal) * 100)
            );
            const selectedView = getViewMode(h._id);

            return (
              <div className="card mb-4 habit-card" key={h._id}>
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                    <div>
                      <h4 className="card-title mb-1">{h.title}</h4>
                      <p className="text-muted mb-2">
                        <span className="badge text-bg-light border me-2 text-capitalize">
                          {h.type || "personal"}
                        </span>
                        Goal {weeklyGoal}/7
                        {" • "}
                        Reminder{" "}
                        {h.reminderEnabled && h.reminderTime ? h.reminderTime : "Off"}
                      </p>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-success btn-sm habit-action-btn"
                        onClick={() => markComplete(h._id)}
                        disabled={actionId === h._id}
                      >
                        Done
                      </button>
                      <button
                        className="btn btn-info btn-sm text-white habit-action-btn"
                        onClick={() => applyFreeze(h._id)}
                        disabled={(h.freezeCount ?? 0) <= 0 || actionId === h._id}
                      >
                        Freeze ({h.freezeCount ?? 0})
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm habit-action-btn"
                        onClick={() => deleteHabit(h._id)}
                        disabled={actionId === h._id}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="row g-3 mt-1 mb-3">
                    <div className="col-md-4">
                      <div className="mini-stat">Current Streak: {calculateCurrentStreak(asArray(h.completedDates), asArray(h.freezeDates))}</div>
                    </div>
                    <div className="col-md-4">
                      <div className="mini-stat">Longest Streak: {calculateLongestStreak(asArray(h.completedDates), asArray(h.freezeDates))}</div>
                    </div>
                    <div className="col-md-4">
                      <div className="mini-stat">Goal Progress: {weeklyProgress}%</div>
                    </div>
                  </div>

                  <div className="progress mb-3" role="progressbar" aria-label="Goal progress">
                    <div className="progress-bar" style={{ width: `${weeklyProgress}%` }}>
                      {weeklyCompleted}/{weeklyGoal}
                    </div>
                  </div>

                  <div className="view-switch mb-3">
                    <button
                      className={`btn btn-sm habit-tab-btn ${selectedView === "overview" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() =>
                        setHabitViewMode((prev) => ({ ...prev, [h._id]: "overview" }))
                      }
                    >
                      Overview
                    </button>
                    <button
                      className={`btn btn-sm habit-tab-btn ${selectedView === "calendar" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() =>
                        setHabitViewMode((prev) => ({ ...prev, [h._id]: "calendar" }))
                      }
                    >
                      Calendar
                    </button>
                    <button
                      className={`btn btn-sm habit-tab-btn ${selectedView === "history" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() =>
                        setHabitViewMode((prev) => ({ ...prev, [h._id]: "history" }))
                      }
                    >
                      History
                    </button>
                    <button
                      className={`btn btn-sm habit-tab-btn ${selectedView === "graph" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() =>
                        setHabitViewMode((prev) => ({ ...prev, [h._id]: "graph" }))
                      }
                    >
                      Weekly Graph
                    </button>
                  </div>

                  {selectedView === "overview" && null}

                  {selectedView === "calendar" && (
                    <>
                      <h6 className="section-title">Calendar (This Month)</h6>
                      <div className="calendar-grid mb-3">
                        {getCalendarDays().map((day, index) => {
                          if (!day) {
                            return (
                              <div key={`empty-${h._id}-${index}`} className="calendar-cell calendar-empty" />
                            );
                          }

                          const dateKey = toDateString(day);
                          const todayKey = getTodayString();
                          const status = getDayStatus(
                            dateKey,
                            normalizeDateSet(asArray(h.completedDates)),
                            normalizeDateSet(asArray(h.freezeDates)),
                            todayKey
                          );

                          return (
                            <div
                              key={`${h._id}-${dateKey}`}
                              className={`calendar-cell status-${status}`}
                              title={`${dateKey} - ${getStatusText(status)}`}
                            >
                              {day.getDate()}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {selectedView === "history" && (
                    <>
                      <h6 className="section-title">Daily History (14 days)</h6>
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {getHistory(h).map((item) => (
                          <span
                            key={`${h._id}-${item.dateKey}`}
                            className={`badge rounded-pill ${getStatusBadgeClass(item.status)}`}
                          >
                            {item.dateKey}: {getStatusText(item.status)}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedView === "graph" && (
                    <>
                      <h6 className="section-title">Weekly Graph (4 weeks)</h6>
                      <div className="graph-wrap">
                        {getWeeklyGraphData(h).map((week) => (
                          <div className="graph-row" key={`${h._id}-${week.label}`}>
                            <span className="graph-label">{week.label}</span>
                            <div className="graph-bar-track">
                              <div className="graph-bar-fill" style={{ width: `${week.percent}%` }} />
                            </div>
                            <span className="graph-value">{week.count}/7</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}