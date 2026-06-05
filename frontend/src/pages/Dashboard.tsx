import { useState, useEffect } from 'react';
import { 
  Users, 
  Car, 
  CheckCircle2, 
  Clock, 
  MapPin,
  TrendingUp,
  AlertCircle,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import type { Asignacion, Vehiculo, Motorista } from '../types';
import { FileText, History, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [asignacionesHoy, setAsignacionesHoy] = useState<Asignacion[]>([]);
  const [historialMisiones, setHistorialMisiones] = useState<Asignacion[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [selectedEstadoMotorista, setSelectedEstadoMotorista] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [respAsig, respVeh, respMot] = await Promise.all([
          api.get('misiones').catch(() => ({ data: { misiones: [] } })),
          api.get('vehiculos').catch(() => ({ data: { vehiculos: [] } })),
          api.get('motoristas').catch(() => ({ data: { motoristas: [] } }))
        ]);
        
        // Filtrar misiones de hoy y mapear al formato esperado
        const hoy = new Date().toISOString().split('T')[0];
        let misionesRaw = respAsig.data?.misiones || [];

        // Filtrar misiones según el rol y vinculación del usuario
        if (user?.rol === 'jefatura' || user?.rol === 'auxiliar' || user?.id_motorista) {
          misionesRaw = misionesRaw.filter((m: any) => {
            const esSolicitante = (user?.rol === 'jefatura' || user?.rol === 'auxiliar') && m.id_usuario_solicitante === user.id;
            const esMotorista = user?.id_motorista && m.id_motorista === user.id_motorista;
            return esSolicitante || esMotorista;
          });
        }

        const allMapped = misionesRaw.map((m: any) => ({
          ...m,
          id_asignacion: m.id_mision,
          fecha: m.fecha_mision || m.fecha_solicitud || '',
          mision: m.objetivo_mision || m.descripcion_mision || '',
          estado: m.estado_mision
        }));

        const misAsignacionesHoy = allMapped.filter((a: any) => a.fecha && a.fecha.startsWith(hoy));
        
        setAsignacionesHoy(misAsignacionesHoy);
        setHistorialMisiones(allMapped.sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime()));
        setVehiculos(respVeh.data?.vehiculos || []);
        setMotoristas(respMot.data?.motoristas || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);



  const getAlertStyle = (asig: Asignacion) => {
    if (asig.estado !== 'programado' || !asig.hora_salida) {
      return { border: 'border-gray-100', text: 'text-emerald-600' };
    }

    const [hours, minutes] = asig.hora_salida.split(':').map(Number);
    const missionTime = new Date();
    missionTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const diffMs = missionTime.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMins < -15) {
      return { border: 'border-red-500 shadow-lg shadow-red-100', text: 'text-red-600' };
    }
    if (diffMins <= 60) {
      return { border: 'border-amber-500 shadow-md shadow-amber-50', text: 'text-amber-600' };
    }

    return { border: 'border-gray-100', text: 'text-emerald-600' };
  };

  const googlePalette = ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];

  const stats = [
    { label: 'Vehículos Totales', value: vehiculos.length, icon: Car, color: 'text-[#4285F4]', bg: 'bg-blue-50' },
    { label: 'En Mantenimiento', value: vehiculos.filter(v => v.estado === 'mantenimiento').length, icon: AlertCircle, color: 'text-[#EA4335]', bg: 'bg-red-50' },
    { label: 'Misiones Hoy', value: asignacionesHoy.length, icon: Users, color: 'text-[#FBBC05]', bg: 'bg-amber-50' },
    { label: 'Completadas', value: asignacionesHoy.filter(a => a.estado === 'completado').length, icon: CheckCircle2, color: 'text-[#34A853]', bg: 'bg-emerald-50' },
  ];

  const motoristaEstados = [
    { estado: 'activo', label: 'Activo', color: 'text-emerald-600', bg: 'bg-emerald-50', count: motoristas.filter(m => m.estado === 'activo').length },
    { estado: 'inactivo', label: 'Inactivo', color: 'text-gray-600', bg: 'bg-gray-50', count: motoristas.filter(m => m.estado === 'inactivo').length },
    { estado: 'destaque', label: 'Destaque', color: 'text-blue-600', bg: 'bg-blue-50', count: motoristas.filter(m => m.estado === 'destaque').length },
    { estado: 'baja', label: 'Baja', color: 'text-red-600', bg: 'bg-red-50', count: motoristas.filter(m => m.estado === 'baja').length },
    { estado: 'compensatorio', label: 'Compensatorio', color: 'text-amber-600', bg: 'bg-amber-50', count: motoristas.filter(m => m.estado === 'compensatorio').length },
    { estado: 'incapacitado', label: 'Incapacitado', color: 'text-orange-600', bg: 'bg-orange-50', count: motoristas.filter(m => m.estado === 'incapacitado').length },
  ];

  // Datos para gráfico circular (Estado de flota)
  const flotaData = [
    { name: 'Disponible', value: vehiculos.filter(v => v.estado === 'disponible').length, color: '#34A853' },
    { name: 'En Uso', value: vehiculos.filter(v => v.estado === 'en_uso').length, color: '#4285F4' },
    { name: 'Mantenimiento', value: vehiculos.filter(v => v.estado === 'mantenimiento').length, color: '#EA4335' },
  ];

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="h-32 bg-gray-200 rounded-3xl w-full"></div>
      <div className="grid grid-cols-2 gap-8">
        <div className="h-64 bg-gray-200 rounded-3xl"></div>
        <div className="h-64 bg-gray-200 rounded-3xl"></div>
      </div>
    </div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-[#1a73e8]">{showHistory ? 'Historial de Misiones' : 'Dashboard'}</h1>
          <p className="text-gray-500 font-medium">
            {(user?.rol === 'jefatura' || user?.rol === 'seguridad' || user?.rol === 'auxiliar' || user?.id_motorista)
              ? (showHistory ? 'Todas las misiones registradas' : (user?.id_motorista ? 'Tus misiones asignadas para hoy' : 'Misiones programadas para hoy'))
              : 'Resumen general de las operaciones de hoy'}
          </p>
        </div>
        
        {(user?.rol === 'jefatura' || user?.rol === 'seguridad' || user?.rol === 'auxiliar' || user?.id_motorista) && (
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-[#1a73e8] font-black text-xs uppercase tracking-tight"
          >
            {showHistory ? (
              <>
                <LayoutDashboard size={18} className="text-emerald-500" />
                <span>Volver al Dashboard</span>
              </>
            ) : (
              <>
                <History size={18} className="text-amber-500" />
                <span>Ver Historial Completo</span>
              </>
            )}
          </button>
        )}
      </header>

      {/* Stats Grid - HIDE for Jefatura, Seguridad, Motoristas and Auxiliar */}
      {(user?.rol !== 'jefatura' && user?.rol !== 'seguridad' && user?.rol !== 'auxiliar' && !user?.id_motorista) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="glass p-6 rounded-[2rem] flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow transition-transform hover:-translate-y-1">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-navy-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showHistory ? (
        <div className="glass p-8 rounded-[2.5rem] animate-in slide-in-from-bottom-4 duration-500">
          {/* ... (historial code) ... */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-8">
            <h2 className="text-xl font-black text-[#1a73e8] flex items-center gap-2">
              <FileText className="text-blue-500" />
              Historial de Solicitudes
            </h2>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full uppercase border border-blue-100 self-start md:self-auto">
              {historialMisiones.length} Registros Encontrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-4 pl-4">ID Misión</th>
                  <th className="pb-4">Fecha Solicitud</th>
                  <th className="pb-4">Destino / Objetivo</th>
                  <th className="pb-4">Vehículo / Motorista</th>
                  <th className="pb-4">Estado</th>
                  <th className="pb-4 pr-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historialMisiones.map((m: any) => (
                  <tr key={m.id_mision} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-5 pl-4">
                      <span className="font-black text-[#1a73e8]">#M-{m.id_mision}</span>
                    </td>
                    <td className="py-5">
                      <p className="text-sm font-bold text-gray-600">{new Date(m.fecha_solicitud).toLocaleDateString()}</p>
                      <p className="text-[10px] text-gray-400">{new Date(m.fecha_solicitud).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="py-5">
                      <p className="text-sm font-black text-navy-900">{m.destino || 'Sin Destino'}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{m.mision}</p>
                    </td>
                    <td className="py-5">
                      {m.motorista ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600">
                            {m.motorista.nombre[0]}{m.motorista.apellido[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700">{m.motorista.nombre} {m.motorista.apellido}</p>
                            <p className="text-[10px] text-gray-400">{m.vehiculo?.placa || 'Sin placa'}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-300 uppercase italic">Pendiente de Asignación</span>
                      )}
                    </td>
                    <td className="py-5">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                        m.estado === 'aprobada' ? 'bg-blue-50 text-blue-600' :
                        m.estado === 'en_curso' ? 'bg-amber-50 text-amber-600' :
                        m.estado === 'finalizada' ? 'bg-emerald-50 text-emerald-600' :
                        m.estado === 'rechazada' ? 'bg-red-50 text-red-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {m.estado}
                      </span>
                    </td>
                    <td className="py-5 pr-4">
                      <button className="p-2 hover:bg-white rounded-xl shadow-sm transition-all text-gray-400 hover:text-[#1a73e8]">
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historialMisiones.length === 0 && (
              <div className="text-center py-20 text-gray-300 italic">
                No tienes misiones registradas en el historial.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${(user?.rol === 'jefatura' || user?.rol === 'seguridad' || user?.rol === 'auxiliar' || user?.id_motorista) ? '' : 'lg:grid-cols-2'} gap-8`}>
          {/* Missions for Today */}
          <div className="glass p-8 rounded-[2.5rem]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-8">
              <h2 className="text-xl font-black text-[#1a73e8] flex items-center gap-2">
                <Clock className="text-[#34A853]" />
                {(user?.rol === 'jefatura' || user?.rol === 'seguridad' || user?.rol === 'auxiliar' || user?.id_motorista) ? (user?.id_motorista ? 'Tus Misiones de Hoy' : 'Misiones de Hoy') : 'Misiones de Hoy'}
              </h2>
              <span className="text-[10px] font-bold bg-[#1a73e8] text-white px-3 py-1 rounded-full uppercase self-start md:self-auto">
                {asignacionesHoy.length} Total
              </span>
            </div>

            <div className={`space-y-4 ${(user?.rol === 'jefatura' || user?.rol === 'seguridad' || user?.rol === 'auxiliar' || user?.id_motorista) ? '' : 'max-h-[400px] overflow-y-auto pr-2 custom-scrollbar'}`}>
              {asignacionesHoy.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-sm font-medium italic">No hay misiones programadas para hoy</p>
                </div>
              ) : asignacionesHoy.map((asig) => {
                const style = getAlertStyle(asig);
                return (
                  <div key={asig.id_asignacion} className={`group p-5 bg-white rounded-2xl border ${style.border} transition-all relative overflow-hidden`}>
                    {asig.estado === 'programado' && asig.hora_salida && (
                      <div className={`absolute top-0 right-0 w-1.5 h-full ${style.text.replace('text-', 'bg-')}`} />
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-[#1a73e8] text-xs text-center leading-none">
                          {asig.motorista ? `${asig.motorista.nombre[0]}${asig.motorista.apellido[0]}` : '??'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#174ea6]">{asig.motorista ? `${asig.motorista.nombre} ${asig.motorista.apellido}` : 'Sin Asignar'}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-tight ${style.text}`}>{asig.mision || asig.objetivo_mision || asig.tipo_actividad}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${asig.estado === 'programado' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {asig.estado}
                        </span>
                        {asig.hora_salida && (
                          <span className={`text-[10px] font-black ${style.text} flex items-center gap-1`}>
                            <Clock size={12} />
                            {asig.hora_salida}
                          </span>
                        )}
                      </div>
                    </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <Car size={14} className="text-navy-900 opacity-40" />
                      <span>{asig.vehiculo?.placa || 'Sin Vehículo'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <MapPin size={14} className="text-emerald-500 opacity-60" />
                      <span>{asig.area_destino?.nombre_area || 'Sede Central'}</span>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts Section - HIDE for Jefatura, Seguridad, Motoristas and Auxiliar */}
          {(user?.rol !== 'jefatura' && user?.rol !== 'seguridad' && user?.rol !== 'auxiliar' && !user?.id_motorista) && (
            <div className="space-y-8">
              {/* Distribution by status */}
              <div className="glass p-8 rounded-[2.5rem] h-[300px]">
                <h2 className="text-xl font-black text-[#1a73e8] mb-6 flex items-center gap-2">
                  <TrendingUp className="text-[#34A853]" />
                  Estado de la Flota
                </h2>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={flotaData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {flotaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-4 -mt-4">
                    {flotaData.map(item => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass p-8 rounded-[2.5rem] h-[400px] flex flex-col">
                 <h2 className="text-xl font-black text-[#1a73e8] mb-6 flex items-center gap-2">
                   <Users className="text-[#34A853]" />
                   Disponibilidad de Motoristas
                 </h2>
                 <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    {motoristaEstados.map(item => (
                      <button 
                        key={item.estado}
                        onClick={() => item.count > 0 && setSelectedEstadoMotorista(item.estado)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-100 transition-all ${item.count > 0 ? 'hover:scale-[1.02] hover:shadow-md cursor-pointer' : 'opacity-60 cursor-default'} bg-white`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl mb-2 ${item.bg} ${item.color}`}>
                          {item.count}
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider text-center">{item.label}</span>
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedEstadoMotorista && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <header className="p-6 pb-4 flex justify-between items-center border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Users size={20} className="text-[#1a73e8]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#1a73e8] uppercase">
                      {selectedEstadoMotorista}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {motoristas.filter(m => m.estado === selectedEstadoMotorista).length} Motoristas en este estado
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedEstadoMotorista(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
             </header>
             <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
                {motoristas.filter(m => m.estado === selectedEstadoMotorista).map(m => (
                  <div key={m.id_motorista} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-gray-400 shadow-sm text-sm">
                      {m.nombre[0]}{m.apellido[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#174ea6]">{m.nombre} {m.apellido}</p>
                      {m.codigo_empleado && (
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Cód: {m.codigo_empleado}</p>
                      )}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
