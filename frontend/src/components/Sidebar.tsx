import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Calendar, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  if (user?.rol === 'jefatura') {
    menuItems.push({ path: '/misiones-solicitud', label: 'Mis Solicitudes', icon: Calendar });
  }

  if (user?.rol === 'admin') {
    menuItems.push({ path: '/programacion', label: 'Misiones/Asignaciones', icon: Calendar });
    menuItems.push({ path: '/vehiculos', label: 'Vehículos', icon: Car });
    menuItems.push({ path: '/motoristas', label: 'Motoristas', icon: Users });
  }

  if (user?.rol === 'seguridad') {
    menuItems.push({ path: '/control-acceso', label: 'Control Accesos', icon: ShieldCheck });
  }

  if (user?.id_motorista) {
    menuItems.push({ path: '/panel-motorista', label: 'Panel Misión', icon: Calendar });
  }

  if (user?.rol === 'admin') {
    menuItems.push({ path: '/usuarios', label: 'Usuarios', icon: ShieldCheck });
  }

  return (
    <>
      <aside
        className={`
          w-64 h-screen glass border-r flex flex-col fixed left-0 top-0 z-50
          transition-transform duration-300 ease-in-out
          -translate-x-full md:translate-x-0
          ${open ? 'translate-x-0' : ''}
        `}
      >
        <div className="flex items-center justify-between p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1a73e8] rounded-xl flex items-center justify-center shadow-lg">
              <Car className="text-[#34A853] w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1a73e8] leading-tight">RNPN</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Trazabilidad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 transition-colors md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-[#1a73e8] text-white shadow-xl shadow-blue-500/20' 
                  : 'text-gray-500 hover:bg-blue-50 hover:text-[#1a73e8]'}
              `}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="mb-4 px-4 py-3 rounded-2xl bg-blue-50/50 border border-blue-100">
            <p className="text-xs text-gray-400">Usuario</p>
            <p className="text-sm font-bold text-[#174ea6] truncate">{user?.nombre}</p>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
              {user?.rol}
            </span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
