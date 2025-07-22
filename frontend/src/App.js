import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import './App.css';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Opportunities from './pages/Opportunities';
import LegalConsultant from './pages/LegalConsultant';
import DocumentAnalyzer from './pages/DocumentAnalyzer';
import Monitors from './pages/Monitors';
import Reports from './pages/Reports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/legal" element={<LegalConsultant />} />
              <Route path="/documents" element={<DocumentAnalyzer />} />
              <Route path="/monitors" element={<Monitors />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </main>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;