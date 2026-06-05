import { useState, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Loader2,
  X,
  Check,
  Pencil,
  Plus,
  Car,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import type { Motorista, Vehiculo } from '../types';

export default function Motoristas() {
  const { user } = useAuth();
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Estado para gestión de vehículos en el modal ──
  const [vehiculoToAdd, setVehiculoToAdd] = useState('');
  const [addingVehiculo, setAddingVehiculo] = useState(false);

  // ── Estado para fila expandida en la tabla ──
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [respMot, respVeh] = await Promise.all([
        api.get('/motoristas'),
        api.get('/vehiculos')
      ]);
      setMotoristas(respMot.data.motoristas);
      setVehiculos(respVeh.data.vehiculos);
    } catch (error) {
      console.error('Error fetching motoristas data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (motorista: Motorista | null = null) => {
    setSelectedMotorista(motorista);
    setVehiculoToAdd('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedMotorista(null);
    setVehiculoToAdd('');
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};
    // Solo incluir campos de motorista, no los de vehículos
    for (const [key, value] of formData.entries()) {
      if (['nombre', 'apellido', 'codigo_empleado', 'numero_licencia', 'estado'].includes(key)) {
        data[key] = value;
      }
    }

    try {
      if (selectedMotorista) {
        await api.patch(`/motoristas/${selectedMotorista.id_motorista}`, data);
      } else {
        await api.post('/motoristas', data);
      }
      fetchData();
      handleCloseModal();
    } catch (error) {
      alert('Error al guardar motorista');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este motorista?')) return;
    try {
      await api.delete(`/motoristas/${id}`);
      fetchData();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  // ── Funciones de gestión de vehículos habituales ──

  const handleAddVehiculo = async () => {
    if (!selectedMotorista || !vehiculoToAdd) return;
    setAddingVehiculo(true);
    try {
      await api.post(`/motoristas/${selectedMotorista.id_motorista}/vehiculos`, {
        id_vehiculo: parseInt(vehiculoToAdd)
      });
      // Recargar motorista actualizado
      const resp = await api.get(`/motoristas/${selectedMotorista.id_motorista}`);
      setSelectedMotorista(resp.data.motorista);
      setVehiculoToAdd('');
      // Refrescar lista completa
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al asignar vehículo');
    } finally {
      setAddingVehiculo(false);
    }
  };

  const handleRemoveVehiculo = async (idVehiculo: number) => {
    if (!selectedMotorista) return;
    if (!confirm('¿Desasignar este vehículo del motorista?')) return;
    try {
      await api.delete(`/motoristas/${selectedMotorista.id_motorista}/vehiculos/${idVehiculo}`);
      const resp = await api.get(`/motoristas/${selectedMotorista.id_motorista}`);
      setSelectedMotorista(resp.data.motorista);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al desasignar vehículo');
    }
  };

  // Vehículos que aún NO están asignados a este motorista
  const getVehiculosDisponibles = () => {
    if (!selectedMotorista?.conductores_habituales) return vehiculos;
    const idsAsignados = selectedMotorista.conductores_habituales.map(ch => ch.id_vehiculo);
    return vehiculos.filter(v => !idsAsignados.includes(v.id_vehiculo));
  };

  const filtered = motoristas.filter(m => 
    `${m.nombre} ${m.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.codigo_empleado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1a73e8]">Catálogo de Motoristas</h1>
          <p className="text-gray-500 font-medium">Gestión administrativa de conductores institucionales</p>
        </div>
        {user?.rol === 'admin' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#1a73e8] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-[#174ea6] transition-all active:scale-95"
          >
            <Plus size={18} className="text-[#34A853]" />
            <span>Nuevo Motorista</span>
          </button>
        )}
      </header>

      {/* Toolbox */}
      <div className="flex bg-white p-4 rounded-3xl border border-gray-100 shadow-sm items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o código..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Motorista</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehículos Asignados</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Licencia / DUI</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1a73e8] mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">No se encontraron resultados</td>
                </tr>
              ) : filtered.map((m) => {
                const vehiculosHab = m.conductores_habituales || [];
                const isExpanded = expandedRow === m.id_motorista;
                return (
                  <tr key={m.id_motorista} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-[#1a73e8] flex items-center justify-center font-black text-xs text-white transform group-hover:rotate-6 transition-transform">
                          {m.nombre[0]}{m.apellido[0]}
                        </div>
                        <div>
                          <p className="font-black text-[#174ea6]">{m.nombre} {m.apellido}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{m.codigo_empleado}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5">
                        {vehiculosHab.length === 0 ? (
                          <span className="text-[10px] font-bold text-gray-300 italic">Sin vehículos</span>
                        ) : (
                          <>
                            {/* Mostrar el primer vehículo siempre */}
                            <div className="flex items-center gap-2">
                              <Car size={12} className="text-[#1a73e8]" />
                              <span className="text-xs font-bold text-gray-600">
                                {vehiculosHab[0].vehiculo.placa}
                              </span>
                              <span className="text-[9px] text-gray-400">
                                {vehiculosHab[0].vehiculo.marca} {vehiculosHab[0].vehiculo.modelo}
                              </span>
                            </div>
                            {/* Si hay más, mostrar badge con toggle */}
                            {vehiculosHab.length > 1 && (
                              <>
                                <button
                                  onClick={() => setExpandedRow(isExpanded ? null : m.id_motorista)}
                                  className="flex items-center gap-1 text-[9px] font-black text-[#1a73e8] hover:text-[#174ea6] transition-colors"
                                >
                                  {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                  +{vehiculosHab.length - 1} más
                                </button>
                                {isExpanded && vehiculosHab.slice(1).map(ch => (
                                  <div key={ch.id_conductor_hab} className="flex items-center gap-2 pl-1 animate-in fade-in duration-200">
                                    <Car size={12} className="text-emerald-500" />
                                    <span className="text-xs font-bold text-gray-600">
                                      {ch.vehiculo.placa}
                                    </span>
                                    <span className="text-[9px] text-gray-400">
                                      {ch.vehiculo.marca} {ch.vehiculo.modelo}
                                    </span>
                                  </div>
                                ))}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-blue-800 bg-gray-100 px-3 py-1 rounded-lg">{m.numero_licencia || 'PENDIENTE'}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                        m.estado === 'activo' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {m.estado}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {user?.rol === 'admin' ? (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleOpenModal(m)}
                            className="p-2 hover:bg-blue-50 hover:text-[#1a73e8] rounded-xl transition-all text-gray-400"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(m.id_motorista)}
                            className="p-2 hover:bg-red-50 hover:text-white rounded-xl transition-all text-gray-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-300 italic">Solo Lectura</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar Motorista */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <header className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
              <h2 className="text-2xl font-black text-[#1a73e8]">
                {selectedMotorista ? 'Editar Motorista' : 'Registrar Motorista'}
              </h2>
              <button onClick={handleCloseModal} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </header>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nombres</label>
                  <input name="nombre" defaultValue={selectedMotorista?.nombre} required className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Apellidos</label>
                  <input name="apellido" defaultValue={selectedMotorista?.apellido} required className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Código de Empleado</label>
                  <input name="codigo_empleado" defaultValue={selectedMotorista?.codigo_empleado} required className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Estado</label>
                  <select name="estado" defaultValue={selectedMotorista?.estado || 'activo'} className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold appearance-none">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="destaque">Destaque</option>
                    <option value="baja">Baja</option>
                    <option value="compensatorio">Compensatorio</option>
                    <option value="incapacitado">Incapacitado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Número de Licencia o DUI</label>
                <input name="numero_licencia" defaultValue={selectedMotorista?.numero_licencia} placeholder="0614-000000-000-0" className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold" />
              </div>

              {/* ═══════════════════════════════════════════════════════
                  SECCIÓN: Vehículos Habituales (solo en modo edición)
                  ═══════════════════════════════════════════════════════ */}
              {selectedMotorista && (
                <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50/60 to-emerald-50/40 rounded-[2rem] border border-blue-100/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car size={16} className="text-[#1a73e8]" />
                      <h3 className="text-sm font-black text-[#1a73e8] uppercase tracking-wider">Vehículos Asignados</h3>
                    </div>
                    <span className="text-[10px] font-black bg-[#1a73e8] text-white px-3 py-1 rounded-full">
                      {selectedMotorista.conductores_habituales?.length || 0}
                    </span>
                  </div>

                  {/* Lista de vehículos actualmente asignados */}
                  <div className="space-y-2">
                    {(!selectedMotorista.conductores_habituales || selectedMotorista.conductores_habituales.length === 0) ? (
                      <div className="text-center py-6 text-gray-400">
                        <Car size={28} className="mx-auto mb-2 opacity-20" />
                        <p className="text-[10px] font-bold uppercase">Sin vehículos asignados</p>
                      </div>
                    ) : (
                      selectedMotorista.conductores_habituales.map(ch => (
                        <div 
                          key={ch.id_conductor_hab}
                          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm group/veh hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#1a73e8]/10 flex items-center justify-center">
                              <Car size={16} className="text-[#1a73e8]" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-[#174ea6]">{ch.vehiculo.placa}</p>
                              <p className="text-[10px] text-gray-400 font-bold">
                                {ch.vehiculo.marca} {ch.vehiculo.modelo} {ch.vehiculo.anio ? `(${ch.vehiculo.anio})` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVehiculo(ch.id_vehiculo)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/veh:opacity-100"
                            title="Desasignar vehículo"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Agregar nuevo vehículo */}
                  <div className="flex gap-2 pt-2">
                    <select
                      value={vehiculoToAdd}
                      onChange={(e) => setVehiculoToAdd(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold appearance-none"
                    >
                      <option value="">Seleccione un vehículo para asignar…</option>
                      {getVehiculosDisponibles().map(v => (
                        <option key={v.id_vehiculo} value={v.id_vehiculo}>
                          {v.placa} — {v.marca} {v.modelo}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddVehiculo}
                      disabled={!vehiculoToAdd || addingVehiculo}
                      className="px-5 py-3 bg-[#34A853] text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {addingVehiculo ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus size={16} />}
                      Asignar
                    </button>
                  </div>
                </div>
              )}

              <footer className="pt-6 flex gap-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-4 px-6 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 px-6 bg-[#1a73e8] text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-500/20 hover:bg-[#174ea6] transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    <>
                      <Check size={18} className="text-[#34A853]" />
                      <span>{selectedMotorista ? 'Guardar Cambios' : 'Registrar Motorista'}</span>
                    </>
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
