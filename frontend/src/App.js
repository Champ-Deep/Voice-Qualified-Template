import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [formData, setFormData] = useState({
    phone: '',
    company: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/leads`);
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_BASE_URL}/leads`, formData);
      setMessage(`Lead created successfully! Lead ID: ${response.data.lead_id}`);
      setMessageType('success');
      setFormData({ phone: '', company: '', email: '' });
      fetchLeads(); // Refresh the leads list
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Error creating lead');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.phone && formData.company && formData.email;

  return (
    <div className="container">
      <div className="card">
        <h1>Lead Management System</h1>
        
        {message && (
          <div className={`alert alert-${messageType}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="phone">Phone Number *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="company">Company Name *</label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Enter company name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !isFormValid}
          >
            {loading ? 'Creating Lead...' : 'Create Lead'}
          </button>
        </form>
      </div>

      {leads.length > 0 && (
        <div className="card">
          <h2>Recent Leads</h2>
          <div className="lead-list">
            {leads.slice(0, 10).map((lead) => (
              <div key={lead.lead_id} className="lead-item">
                <h3>Lead ID: {lead.lead_id}</h3>
                <p><strong>Company:</strong> {lead.company}</p>
                <p><strong>Email:</strong> {lead.email}</p>
                <p><strong>Phone:</strong> {lead.phone}</p>
                <p><strong>Created:</strong> {new Date(lead.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;