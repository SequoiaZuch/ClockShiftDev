import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import MainPage from './pages/MainPage';
import ComparePage from './pages/ComparePage';
import ConversionPage from './pages/ConversionPage';
import GlobalManagementPage from './pages/GlobalManagementPage';
import { LocationProvider } from './contexts/LocationContext';

export default function App() {
  return (
    <LocationProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/convert" element={<ConversionPage />} />
            <Route path="/manage" element={<GlobalManagementPage />} />
          </Routes>
        </div>
      </Router>
    </LocationProvider>
  );
}