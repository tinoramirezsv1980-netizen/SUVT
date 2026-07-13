import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
//import Programacion from './pages/Programacion';
import GestionMisiones from './pages/GestionMisiones';
import Vehiculos from './pages/Vehiculos';
import Motoristas from './pages/Motoristas';
import Reportes from './pages/Reportes';

import Usuarios from './pages/Usuarios';
import MisionesJefatura from './pages/MisionesJefatura';
import ControlSeguridad from './pages/ControlSeguridad';
import PanelMotorista from './pages/PanelMotorista';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-100 border-t-emerald-500"></div>
          <p className="text-[10px] font-black text-navy-900 uppercase tracking-widest opacity-40">Verificando Credenciales</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="programacion" element={<GestionMisiones />} />
            <Route path="vehiculos" element={<Vehiculos />} />
            <Route path="motoristas" element={<Motoristas />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="misiones-solicitud" element={<MisionesJefatura />} />
            <Route path="control-acceso" element={<ControlSeguridad />} />
            <Route path="panel-motorista" element={<PanelMotorista />} />
            <Route path="reportes" element={<Reportes />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
