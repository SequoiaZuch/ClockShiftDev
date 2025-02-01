import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Users, Calendar, Globe } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const links = [
    { path: '/', icon: Clock, label: 'Home' },
    { path: '/compare', icon: Users, label: 'Compare' },
    { path: '/convert', icon: Calendar, label: 'Convert' },
    { path: '/manage', icon: Globe, label: 'Manage' },
  ];

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Clock className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">TimeShift</span>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {links.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(path)
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {links.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`${
                isActive(path)
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              <div className="flex items-center">
                <Icon className="w-5 h-5 mr-3" />
                {label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}