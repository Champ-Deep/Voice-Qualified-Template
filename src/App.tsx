import React from 'react';
import { useLeadGeneration } from './hooks/useLeadGeneration';
import LeadForm from './components/LeadForm/LeadForm';
import LeadDisplay from './components/LeadDisplay/LeadDisplay';
import TranscriptViewer from './components/TranscriptViewer/TranscriptViewer';
import './App.css';

const App: React.FC = () => {
  const {
    leadId,
    callStatus,
    isLoading,
    error,
    submitLead,
    reset,
  } = useLeadGeneration();

  return (
    <div className="app">
      <header className="app-header">
        <h1>ChampQualifier</h1>
        <p>AI-Powered Lead Call Management System</p>
      </header>

      <main className="app-main">
        <section className="form-section">
          <LeadForm
            onSubmit={submitLead}
            isLoading={isLoading}
          />
          {error && <div className="error-message">{error}</div>}
        </section>

        {leadId && (
          <section className="result-section">
            <LeadDisplay leadId={leadId} status={callStatus} />
            <TranscriptViewer leadId={leadId} />
            <button className="reset-btn" onClick={reset}>
              New Call
            </button>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by ChampQualifier AI</p>
      </footer>
    </div>
  );
};

export default App;
