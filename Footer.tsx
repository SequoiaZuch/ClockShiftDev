import React from 'react';
import { Clock, Globe, Github } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-gray-600">ClockShift © {currentYear}</span>
          </div>

          <div className="flex items-center space-x-6">
            <a
              href="#"
              className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>World Time</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>Source Code</span>
            </a>
          </div>

          <div className="text-sm text-gray-500">
            Powered by React & Supabase
          </div>
        </div>
      </div>
    </footer>
  );
}