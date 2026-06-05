import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 md:ml-64 min-h-screen p-4 md:p-8 bg-gray-50">
        <div className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur-sm -mx-4 px-4 md:-mx-8 md:px-8 py-3 mb-4 flex items-center md:hidden border-b border-gray-200">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-gray-200 transition-colors"
            aria-label="Abrir menú"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="ml-3 font-bold text-gray-700">RNPN Trazabilidad</span>
        </div>

        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
