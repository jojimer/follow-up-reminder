import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [contacts, setContacts] = useState([]);
  const [frequency, setFrequency] = useState(7);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
    
    const savedFrequency = localStorage.getItem('notificationFrequency');
    if (savedFrequency) {
      setFrequency(parseInt(savedFrequency));
    }
  }, []);

  // Fetch contacts if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchContacts();
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/contacts');
      if (response.status === 200) {
        setIsAuthenticated(true);
      } else if (response.status === 401) {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contacts');
      
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      if (error.message === 'Failed to fetch') {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/auth';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setContacts([]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleFrequencyChange = (newFrequency) => {
    setFrequency(newFrequency);
    localStorage.setItem('notificationFrequency', newFrequency);
  };

  const viewLastMessage = async (contact) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/message/${contact.lastMessageId}`);
      
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      
      const data = await response.json();
      setSelectedContact({...contact, lastMessage: data.message});
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching message:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedContact(null);
  };

  const getDaysSinceLastContact = (lastContactDate) => {
    const lastDate = new Date(lastContactDate);
    const today = new Date();
    const diffTime = Math.abs(today - lastDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isOverdue = (lastContactDate) => {
    return getDaysSinceLastContact(lastContactDate) > frequency;
  };

  if (authChecking) {
    return (
      <div className="app">
        <div className="loading">Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-card">
            <h1>Follow-Up Reminder</h1>
            <p>Connect your Gmail to track email follow-ups</p>
            <button onClick={handleLogin} className="login-btn">
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Follow-Up Reminder</h1>
        <div className="header-controls">
          <div className="frequency-selector">
            <label>Notify me after: </label>
            <select 
              value={frequency} 
              onChange={(e) => handleFrequencyChange(parseInt(e.target.value))}
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
              <option value={30}>1 month</option>
            </select>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard">
        <div className="dashboard-header">
          <h2>Your Contacts</h2>
          <button onClick={fetchContacts} className="refresh-btn">
            Refresh
          </button>
        </div>
        
        {loading ? (
          <div className="loading">Loading contacts...</div>
        ) : (
          <div className="contacts-list">
            {contacts.length === 0 ? (
              <div className="empty-state">
                <p>No contacts found or unable to load contacts.</p>
                <button onClick={fetchContacts}>Try Again</button>
              </div>
            ) : (
              contacts.map(contact => (
                <div 
                  key={contact.id} 
                  className={`contact-card ${isOverdue(contact.lastContact) ? 'overdue' : ''}`}
                >
                  <div className="contact-info">
                    <h3>{contact.name}</h3>
                    <p className="contact-email">{contact.email}</p>
                    <p className="last-contact">
                      Last contact: {new Date(contact.lastContact).toLocaleDateString()}
                      <span className="days-ago">
                        ({getDaysSinceLastContact(contact.lastContact)} days ago)
                      </span>
                    </p>
                  </div>
                  <div className="contact-actions">
                    <button 
                      onClick={() => viewLastMessage(contact)}
                      className="view-message-btn"
                    >
                      View Last Message
                    </button>
                    {isOverdue(contact.lastContact) && (
                      <span className="overdue-badge">Overdue for follow-up</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {showModal && selectedContact && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Last message to {selectedContact.name}</h2>
              <button onClick={closeModal} className="close-btn">&times;</button>
            </div>
            <div className="message-content">
              <p className="message-meta">
                Sent on: {new Date(selectedContact.lastContact).toLocaleString()}
              </p>
              <div className="message-body">
                {selectedContact.lastMessage || "Message content not available."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;