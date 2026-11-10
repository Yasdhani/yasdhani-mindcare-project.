import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [moodEntries, setMoodEntries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mindcare_moods")) || [];
    } catch {
      return [];
    }
  });
  const [selectedMood, setSelectedMood] = useState("");
  const [moodNote, setMoodNote] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [wellnessInsights, setWellnessInsights] = useState("");
  const [breathingText, setBreathingText] = useState("Ready to relax?");
  const [breathingCount, setBreathingCount] = useState(4);
  const [meditationMessage, setMeditationMessage] = useState("Press Start to begin your breathing exercise.");
  const [meditationRunning, setMeditationRunning] = useState(false);
  const [breathingStage, setBreathingStage] = useState(0);
  useEffect(() => {
    if (!meditationRunning) return;

    const stages = [
      "🌬️ Breathe In Slowly",
      "🧘 Hold Your Breath",
      "😮‍💨 Breathe Out Slowly"
    ];

    const timer = setInterval(() => {
      setBreathingCount((previousCount) => {
        if (previousCount <= 1) {
          const nextStage = (breathingStage + 1) % 3;

          setBreathingStage(nextStage);
          setBreathingText(stages[nextStage]);

          return 4;
        }

        return previousCount - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [meditationRunning, breathingStage]);
  const navigateTo = (page, sectionId) => {
    setActivePage(page);

    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth"
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  };
  const startMeditation = () => {
    setMeditationRunning(true);
    setBreathingText("Breathe in slowly...");
    setBreathingCount(4);
    setMeditationMessage("Relax and focus on your breathing.");
  };

  const pauseMeditation = () => {
    setMeditationRunning(false);
    setMeditationMessage("Meditation paused. Take your time.");
  };

  const resetMeditation = () => {
    setMeditationRunning(false);
    setBreathingCount(4);
    setBreathingText("Ready to relax?");
    setMeditationMessage("Press Start to begin your breathing exercise.");
  };

  const saveMood = () => {
    if (!selectedMood) {
      alert("Please select your mood!");
      return;
    }

    const now = new Date();

    const newEntry = {
      id: Date.now(),
      mood: selectedMood,
      note: moodNote.trim(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      }),
      createdAt: now.toISOString()
    };

    const updatedEntries = [newEntry, ...moodEntries];

    setMoodEntries(updatedEntries);

    localStorage.setItem(
      "mindcare_moods",
      JSON.stringify(updatedEntries)
    );

    setSelectedMood("");
    setMoodNote("");

    alert("Your mood has been recorded successfully! 💚");
  };
  // Generate AI Wellness Insights
  const generateWellnessInsights = async () => {
    if (moodEntries.length === 0) {
      alert("Please record your mood first!");
      return;
    }

    setInsightsLoading(true);
    setWellnessInsights("");

    try {
      const response = await fetch(
        "https://mindcare-ai-backend-ytyp.onrender.com/wellness-insights",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            moods: moodEntries
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to generate insights.");
      }

      setWellnessInsights(data.insights);

    } catch (error) {
      console.error("Wellness Insights Error:", error);

      setWellnessInsights(
        "Sorry, I couldn't generate your wellness insights. Please try again."
      );

    } finally {
      setInsightsLoading(false);
    }
  };

  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! 👋 I'm MindCare AI. I'm here to support your healthcare and mental wellness journey. How are you feeling today?"
    }
  ]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Send message to Gemini through FastAPI
  const sendMessage = async () => {
    const userMessage = message.trim();

    if (!userMessage || loading) return;

    // Send message to Gemini through FastAPI
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMessage }
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("https://mindcare-ai-backend-ytyp.onrender.com/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMessage
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong.");
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.reply || "Sorry, I couldn't generate a response."
        }
      ]);

    } catch (error) {
      console.error("Chat Error:", error);

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "I'm having trouble connecting right now. Please try again in a moment."
        }
      ]);

    } finally {
      setLoading(false);
    }
  };
  // WEEKLY MOOD ANALYTICS

  const today = new Date();

  const weeklyMoodData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    const entries = moodEntries.filter((entry) => {
      if (!entry.createdAt) return false;

      const entryDate = new Date(entry.createdAt);

      const entryKey = [
        entryDate.getFullYear(),
        String(entryDate.getMonth() + 1).padStart(2, "0"),
        String(entryDate.getDate()).padStart(2, "0")
      ].join("-");

      return entryKey === dateKey;
    });

    return {
      day: date.toLocaleDateString("en-US", {
        weekday: "short"
      }),
      count: entries.length
    };
  });

  const totalWeeklyEntries = weeklyMoodData.reduce(
    (total, day) => total + day.count,
    0
  );

  const moodCounts = {
    Happy: 0,
    Calm: 0,
    Neutral: 0,
    Sad: 0,
    Stressed: 0
  };

  moodEntries.forEach((entry) => {
    if (
      entry.createdAt &&
      Date.now() - new Date(entry.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000 &&
      Object.prototype.hasOwnProperty.call(moodCounts, entry.mood)
    ) {
      moodCounts[entry.mood]++;
    }
  });

  const mostFrequentMood = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="app">

      <aside className="sidebar">
        <h2 className="logo">💚 MindCare AI</h2>

        <p className="menu-title">MENU</p>

        <div
          className={activePage === "Dashboard" ? "menu active" : "menu"}
          onClick={() => navigateTo("Dashboard", null)}
        >
          🏠 Dashboard
        </div>

        <div
          className={activePage === "AI Assistant" ? "menu active" : "menu"}
          onClick={() => navigateTo("AI Assistant", "chat")}
        >
          💬 AI Assistant
        </div>

        <div
          className={activePage === "Mood Tracker" ? "menu active" : "menu"}
          onClick={() => navigateTo("Mood Tracker", "mood-tracker")}
        >
          😊 Mood Tracker
        </div>

        <div
          className={activePage === "Meditation" ? "menu active" : "menu"}
          onClick={() => navigateTo("Meditation", "meditation")}
        >
          🧘 Meditation
        </div>

        <div className="profile">
          <div className="avatar">U</div>
          <div>
            <h4>My Profile</h4>
            <p>Personal Account</p>
          </div>
        </div>
      </aside >

      <main className="main">

        <header className="topbar">
          <div>
            <h2>Welcome to MindCare AI 👋</h2>
            <p>Your health and happiness matter.</p>
          </div>
          <div className="status">● Online</div>
        </header>

        <section className="welcome">
          <div>
            <span className="tag">YOUR PERSONAL AI COMPANION</span>
            <h1>Take care of your<br /> mind and body.</h1>
            <p>
              Your personal space for healthcare information,
              mental wellness and healthy living.
            </p>

            <button onClick={() =>
              document.getElementById("chat").scrollIntoView({
                behavior: "smooth"
              })
            }>
              Start Conversation →
            </button>
          </div>

          <div className="welcome-icon">🧠</div>
        </section>

        <h2 className="section-title">Your Wellness Center</h2>

        <section className="cards">

          <div className="card">
            <span>🩺</span>
            <h3>Healthcare</h3>
            <p>Explore general health information and wellness guidance.</p>
            <button onClick={() => window.scrollTo(0, 0)}>
              Explore →
            </button>
          </div>

          <div className="card">
            <span>🧠</span>
            <h3>Mental Wellness</h3>
            <p>A supportive space to talk about everyday emotions and stress.</p>
            <button onClick={() =>
              document.getElementById("chat").scrollIntoView({
                behavior: "smooth"
              })
            }>
              Explore →
            </button>
          </div>

          <div className="card">
            <span>😊</span>
            <h3>Mood Tracker</h3>
            <p>Reflect on your feelings and record your daily mood.</p>
            <button onClick={() =>
              document.getElementById("mood-tracker").scrollIntoView({
                behavior: "smooth"
              })
            }>
              Explore →
            </button>
          </div>

        </section>
        {/* MOOD TRACKER */}

        <section className="chat-section" id="mood-tracker">

          <div className="chat-heading">
            <div>
              <h2>😊 Daily Mood Tracker</h2>
              <p>Understand your emotions and track your daily feelings.</p>
            </div>
          </div>

          <h3 style={{ marginTop: "25px" }}>
            How are you feeling right now?
          </h3>

          <div style={{
            display: "flex",
            gap: "15px",
            flexWrap: "wrap",
            marginTop: "20px"
          }}>

            {[
              { name: "Happy", emoji: "😄" },
              { name: "Calm", emoji: "😌" },
              { name: "Neutral", emoji: "😐" },
              { name: "Sad", emoji: "😔" },
              { name: "Stressed", emoji: "😣" }
            ].map((mood) => (

              <button
                key={mood.name}
                onClick={() => setSelectedMood(mood.name)}
                style={{
                  padding: "15px",
                  borderRadius: "12px",
                  border: selectedMood === mood.name
                    ? "2px solid #286c53"
                    : "1px solid #dce8e1",
                  background: selectedMood === mood.name
                    ? "#e1f3e9"
                    : "white",
                  cursor: "pointer",
                  fontSize: "15px"
                }}
              >
                <span style={{ fontSize: "25px" }}>
                  {mood.emoji}
                </span>
                <br />
                {mood.name}
              </button>

            ))}

          </div>

          <h3 style={{ marginTop: "25px" }}>
            Add a personal note (optional)
          </h3>

          <textarea
            value={moodNote}
            onChange={(e) => setMoodNote(e.target.value)}
            placeholder="Write about how you are feeling..."
            style={{
              width: "100%",
              minHeight: "90px",
              padding: "15px",
              marginTop: "12px",
              border: "1px solid #dce8e1",
              borderRadius: "10px",
              resize: "vertical",
              fontFamily: "Arial"
            }}
          />

          <button
            onClick={saveMood}
            style={{
              background: "#174b3c",
              color: "white",
              padding: "13px 22px",
              border: "none",
              borderRadius: "8px",
              marginTop: "15px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Save My Mood 💚
          </button>

          <h3 style={{ marginTop: "35px" }}>
            Your Mood History ({moodEntries.length})
          </h3>

          <div style={{ marginTop: "15px" }}>

            {moodEntries.length === 0 ? (

              <p style={{ color: "#81938c" }}>
                No mood entries yet. Record your first mood!
              </p>

            ) : (

              moodEntries.map((entry) => (

                <div
                  key={entry.id}
                  style={{
                    padding: "15px",
                    background: "#f7faf8",
                    borderRadius: "10px",
                    marginBottom: "12px"
                  }}
                >

                  <strong>
                    {entry.mood === "Happy" && "😄"}
                    {entry.mood === "Calm" && "😌"}
                    {entry.mood === "Neutral" && "😐"}
                    {entry.mood === "Sad" && "😔"}
                    {entry.mood === "Stressed" && "😣"}
                    {" "}{entry.mood}
                  </strong>

                  <p style={{
                    fontSize: "12px",
                    color: "#81938c",
                    marginTop: "5px"
                  }}>
                    {entry.date} at {entry.time}
                  </p>

                  {entry.note && (
                    <p style={{ marginTop: "8px" }}>
                      {entry.note}
                    </p>
                  )}

                </div>

              ))

            )}

          </div>

        </section>
        {/* WEEKLY MOOD ANALYTICS */}

        <section className="chat-section" id="mood-analytics">

          <div className="chat-heading">
            <div>
              <h2>📊 Weekly Mood Analytics</h2>
              <p>Understand your emotional patterns over the last 7 days.</p>
            </div>
          </div>

          {/* SUMMARY CARDS */}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "15px",
            marginTop: "25px"
          }}>

            <div className="card">
              <h3>Total Entries</h3>
              <h2 style={{ color: "#286c53", marginTop: "12px" }}>
                {totalWeeklyEntries}
              </h2>
              <p>This week's mood records</p>
            </div>

            <div className="card">
              <h3>Most Frequent Mood</h3>
              <h2 style={{ color: "#286c53", marginTop: "12px" }}>
                {totalWeeklyEntries > 0
                  ? mostFrequentMood[0]
                  : "No data"}
              </h2>
              <p>Your most recorded feeling</p>
            </div>

          </div>

          {/* WEEKLY ACTIVITY CHART */}

          <h3 style={{ marginTop: "30px" }}>
            Daily Mood Activity
          </h3>

          <div style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-around",
            gap: "12px",
            height: "200px",
            marginTop: "20px",
            padding: "15px",
            background: "#f7faf8",
            borderRadius: "12px"
          }}>

            {weeklyMoodData.map((day) => (

              <div
                key={day.day}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: "100%"
                }}
              >

                <strong style={{ fontSize: "12px", marginBottom: "6px" }}>
                  {day.count}
                </strong>

                <div style={{
                  width: "65%",
                  maxWidth: "40px",
                  height: `${Math.max(
                    5,
                    (day.count / Math.max(
                      1,
                      ...weeklyMoodData.map((d) => d.count)
                    )) * 125
                  )}px`,
                  background: "#378b69",
                  borderRadius: "7px 7px 0 0"
                }} />

                <span style={{
                  fontSize: "12px",
                  marginTop: "8px",
                  color: "#71847b"
                }}>
                  {day.day}
                </span>

              </div>

            ))}

          </div>

          {/* MOOD DISTRIBUTION */}

          <h3 style={{ marginTop: "30px" }}>
            Mood Distribution
          </h3>

          {Object.entries(moodCounts).map(([mood, count]) => {

            const emojis = {
              Happy: "😄",
              Calm: "😌",
              Neutral: "😐",
              Sad: "😔",
              Stressed: "😣"
            };

            const percentage = totalWeeklyEntries > 0
              ? (count / totalWeeklyEntries) * 100
              : 0;

            return (

              <div key={mood} style={{ marginTop: "18px" }}>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "7px"
                }}>

                  <strong>
                    {emojis[mood]} {mood}
                  </strong>

                  <span>{count} ({percentage.toFixed(0)}%)</span>

                </div>

                <div style={{
                  height: "10px",
                  background: "#e9f1ec",
                  borderRadius: "10px",
                  overflow: "hidden"
                }}>

                  <div style={{
                    width: `${percentage}%`,
                    height: "100%",
                    background: "#378b69",
                    borderRadius: "10px",
                    transition: "width 0.4s"
                  }} />

                </div>

              </div>

            );
          })}

        </section>
        {/* AI WELLNESS INSIGHTS */}
        {/* MEDITATION CENTRE */}
        <section className="chat-section" id="meditation">
          <div className="chat-heading">
            <div>
              <h2>🧘 Meditation Centre</h2>
              <p>Take a moment to relax and refresh your mind.</p>
            </div>
            <span className="status">• Wellness</span>
          </div>

          <div style={{ textAlign: "center", padding: "25px" }}>
            <h3>{breathingText}</h3>

            <div style={{
              fontSize: "55px",
              margin: "20px",
              fontWeight: "bold"
            }}>
              {breathingCount}
            </div>

            <p>{meditationMessage}</p>

            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginTop: "20px"
            }}>
              <button onClick={startMeditation}>Start</button>
              <button onClick={pauseMeditation}>Pause</button>
              <button onClick={resetMeditation}>Reset</button>
            </div>
          </div>
        </section>

        <section className="chat-section" id="ai-insights">

          <div className="chat-heading">
            <div>
              <h2>✨ AI Wellness Insights</h2>
              <p>Personalized wellness guidance powered by Gemini.</p>
            </div>
            <span className="status">● AI Powered</span>
          </div>

          <button
            onClick={generateWellnessInsights}
            disabled={insightsLoading}
            style={{
              background: "#174b3c",
              color: "white",
              padding: "14px 24px",
              border: "none",
              borderRadius: "9px",
              marginTop: "25px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            {insightsLoading
              ? "Analyzing your moods..."
              : "✨ Generate My Wellness Insights"}
          </button>

          {insightsLoading && (
            <p style={{ marginTop: "20px" }}>
              🤖 Gemini is analyzing your mood history. Please wait...
            </p>
          )}

          {wellnessInsights && (
            <div style={{
              background: "#e3f3e9",
              padding: "25px",
              borderRadius: "12px",
              marginTop: "25px",
              lineHeight: "1.8",
              whiteSpace: "pre-wrap"
            }}>
              <h3>💚 Your Personal Wellness Report</h3>
              <p style={{ marginTop: "15px" }}>
                {wellnessInsights}
              </p>
            </div>
          )}

          <p className="disclaimer">
            These insights provide general wellness support, not a medical diagnosis.
          </p>

        </section>
        <section className="chat-section" id="chat">
          <div className="chat-heading">
            <div>
              <h2>💬 MindCare AI Assistant</h2>
              <p>Your friendly healthcare and wellness companion.</p>
            </div>
            <span className="status">● Active</span>
          </div>

          <div className="chat-box">

            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}

            {loading && (
              <div className="message bot">
                MindCare AI is thinking... 💭
              </div>
            )}

          </div>

          <div className="input-area">

            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask me about health or wellness..."
              disabled={loading}
            />

            <button
              onClick={sendMessage}
              disabled={loading || !message.trim()}
            >
              {loading ? "Thinking..." : "Send ➤"}
            </button>

          </div>

          <p className="disclaimer">
            MindCare AI provides general information and wellness support.
            It does not replace professional medical care.
          </p>

        </section>

        <footer>
          © 2026 MindCare AI | Your Wellness, Our Priority 💚
        </footer>

      </main>S
    </div >
  );
}

export default App;