import "./Home.css";

function Home({ user, onStartNew, onLogout }) {
  const conversations = user.conversations || [];
  const sorted = conversations.slice().reverse();

  return (
    <div className="home-container">

      <div className="home-header">
        <div className="home-header-text">
          <p className="home-brand">Kagua</p>
          <h1 className="home-title">Welcome back, {user.name}</h1>
          <p className="home-county">{user.county} County</p>
          <p className="home-tagline">
            Start a conversation to organise what you're seeing in your field.
          </p>
        </div>
        <button className="home-logout-btn" onClick={onLogout}>
          Log out
        </button>
      </div>

      <button className="home-start-btn" onClick={onStartNew}>
        + Start New Conversation
      </button>

      <div className="home-section-header">
        <h2 className="home-subtitle">Recent Conversations</h2>
        {conversations.length > 0 && (
          <span className="home-conversations-count">
            {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="home-empty-note">
          You haven't started a conversation yet.
        </p>
      ) : (
        <div className="home-conversations">
          {sorted.map((c, index) => (
            <div key={index} className="home-conversation-item">
              <p className="home-conversation-crop">
                {c.crop} — {c.reported_problem}
              </p>
              <p className="home-conversation-date">
                {new Date(c.date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default Home;