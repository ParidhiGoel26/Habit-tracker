import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter email and password.");
      return;
    }

    if (isRegisterMode && !name.trim()) {
      setErrorMessage("Please enter your name to create an account.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isRegisterMode ? "register" : "login";
      const payload = isRegisterMode
        ? { name: name.trim(), email, password }
        : { email, password };

      const res = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(
          data.message || `${isRegisterMode ? "Register" : "Login"} failed.`
        );
        return;
      }

      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setErrorMessage(
        "Cannot connect to server. Make sure backend is running on http://localhost:5000"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand-top">Habit Tracker</div>
      <div className="auth-card">
        <p className="auth-tag">Habit Tracker</p>
        <h1 className="auth-title">
          {isRegisterMode ? "Create your account" : "Welcome back"}
        </h1>
        <p className="auth-subtitle">
          {isRegisterMode
            ? "Start building streaks and goals today."
            : "Login to continue your progress."}
        </p>

        <form onSubmit={handleSubmit}>
          {isRegisterMode && (
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control form-control-lg"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control form-control-lg"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="alert alert-danger py-2" role="alert">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg w-100 mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Please wait..."
              : isRegisterMode
              ? "Create Account"
              : "Login"}
          </button>
        </form>

        <button
          className="btn btn-link w-100 mt-2"
          onClick={() => {
            setIsRegisterMode((prev) => !prev);
            setErrorMessage("");
          }}
          disabled={isSubmitting}
        >
          {isRegisterMode ? "I already have an account" : "Create new account"}
        </button>
      </div>
    </div>
  );
}