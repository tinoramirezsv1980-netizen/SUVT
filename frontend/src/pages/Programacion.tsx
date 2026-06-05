import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MapPin, 
  Clock, 
  Loader2,
  X,
  Car,
  Check,
  Pencil,
  Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import type { Asignacion, Motorista, Vehiculo } from '../types';

export default function Programacion() {
  const { user } = useAuth();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState<Asignacion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aplicaVales, setAplicaVales] = useState(false);

  // ── Estado para filtrado de vehículos por motorista ──
  const [selectedMotoristaId, setSelectedMotoristaId] = useState<number | null>(null);
  const [showAllVehiculos, setShowAllVehiculos] = useState(false);

  // Fecha de referencia para la semana (lunes actual)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [respAsig, respMot, respVeh] = await Promise.all([
        api.get('/asignaciones'),
        api.get('/motoristas'),
        api.get('/vehiculos')
      ]);
      setAsignaciones(respAsig.data.asignaciones);
      setMotoristas(respMot.data.motoristas);
      setVehiculos(respVeh.data.vehiculos);
    } catch (error) {
      console.error('Error fetching programacion data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (asig: Asignacion | null = null) => {
    setSelectedAsignacion(asig);
    setSelectedMotoristaId(asig?.id_motorista || null);
    setShowAllVehiculos(false);
    setAplicaVales(asig?.aplica_vales || false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedAsignacion(null);
    setSelectedMotoristaId(null);
    setShowAllVehiculos(false);
    setAplicaVales(false);
    setIsModalOpen(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Obtener vehículos filtrados por motorista seleccionado ──
  const getVehiculosFiltrados = (): Vehiculo[] => {
    if (showAllVehiculos || !selectedMotoristaId) {
      // Mostrar todos los disponibles/en_uso
      return vehiculos.filter(v => v.estado === 'disponible' || v.estado === 'en_uso');
    }

    // Buscar el motorista seleccionado y sus vehículos habituales
    const motorista = motoristas.find(m => m.id_motorista === selectedMotoristaId);
    const vehiculosHabituales = motorista?.conductores_habituales?.map(ch => ch.vehiculo) || [];

    if (vehiculosHabituales.length === 0) {
      // Si no tiene vehículos habituales, mostrar todos
      return vehiculos.filter(v => v.estado === 'disponible' || v.estado === 'en_uso');
    }

    return vehiculosHabituales;
  };

  const handleMotoristaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    setSelectedMotoristaId(isNaN(id) ? null : id);
    setShowAllVehiculos(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const nuevoEstado = formData.get('estado') as string;
    const estadoAnterior = selectedAsignacion?.estado || '';
    const kmRetorno = formData.get('kilometraje_retorno') ? parseInt(formData.get('kilometraje_retorno') as string) : null;
    const hojaRetorno = (formData.get('hoja_transporte_rnpn') as string) || '';

    // Validación solo cuando se TRANSICIONA a FINALIZADA (no si ya estaba finalizada)
    const transicionandoAFinalizada = nuevoEstado === 'finalizada' && estadoAnterior !== 'finalizada';
    if (transicionandoAFinalizada) {
      if (!kmRetorno || !hojaRetorno.trim()) {
        alert('Para finalizar la misión debe ingresar el Kilometraje de Retorno y el No. de Hoja de Transporte RNPN.');
        return;
      }

      if (selectedAsignacion?.vehiculo && kmRetorno <= selectedAsignacion.vehiculo.kilometraje_actual) {
        alert(`El kilometraje de retorno (${kmRetorno}) debe ser mayor al kilometraje inicial del vehículo (${selectedAsignacion.vehiculo.kilometraje_actual} km).`);
        return;
      }
    }

    if (selectedAsignacion && !confirm('¿Desea guardar los cambios en esta misión?')) {
      return;
    }

    setIsSubmitting(true);
    const rawFecha = formData.get('fecha') as string;
    const dateObj = new Date(rawFecha);
    
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dia_semana = days[dateObj.getDay()];

    const id_motorista = parseInt(formData.get('id_motorista') as string);
    const id_vehiculo_raw = formData.get('id_vehiculo') as string;
    const id_vehiculo = id_vehiculo_raw ? parseInt(id_vehiculo_raw) : null;

    if (isNaN(id_motorista)) {
      alert('Debe seleccionar un motorista válido');
      setIsSubmitting(false);
      return;
    }

    const data = {
      id_motorista,
      id_vehiculo,
      fecha: rawFecha,
      tipo_actividad: formData.get('tipo_actividad') || 'Gestión Interna',
      mision: formData.get('mision'),
      hora_salida: formData.get('hora_salida'),
      dia_semana,
      estado: nuevoEstado || 'programado',
      unidad_solicitante: formData.get('unidad_solicitante'),
      destino: formData.get('destino'),
      kilometraje_retorno: kmRetorno,
      hoja_transporte_rnpn: hojaRetorno,
      aplica_vales: formData.get('aplica_vales') === 'on',
      detalle_vales: formData.get('detalle_vales') as string || null,
      id_semana: selectedAsignacion?.id_semana || 1
    };

    try {
      if (selectedAsignacion) {
        await api.patch(`/asignaciones/${selectedAsignacion.id_asignacion}`, data);
        
        // Si se ACABA de finalizar (transición nueva), actualizar el kilometraje MAESTRO del vehículo
        if (transicionandoAFinalizada && id_vehiculo && kmRetorno) {
          await api.patch(`/vehiculos/${id_vehiculo}`, {
            kilometraje_actual: kmRetorno,
            numero_hoja_transporte: hojaRetorno
          });
        }
      } else {
        await api.post('/asignaciones', data);
      }
      fetchData();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error al procesar asignación:', error);
      alert(error.response?.data?.error || 'Error al procesar asignación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDayLabel = (offset: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + offset);
    return {
      name: d.toLocaleDateString('es-ES', { weekday: 'long' }),
      date: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      isoStr: d.toISOString().split('T')[0]
    };
  };

  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(offset => getDayLabel(offset));
  const hoyStr = new Date().toISOString().split('T')[0];

  const getAlertStyle = (asig: Asignacion) => {
    const estado = asig.estado?.toLowerCase() || 'programado';
    const isHoy = asig.fecha.startsWith(hoyStr);

    // Colores base por estado (Bordes e Iconos)
    const baseStyles: Record<string, { border: string, text: string, bg: string }> = {
      programado: { border: 'border-blue-200', text: 'text-blue-600', bg: 'bg-white' },
      iniciada: { border: 'border-emerald-500', text: 'text-emerald-600', bg: 'bg-white' },
      en_desarrollo: { border: 'border-indigo-500', text: 'text-indigo-600', bg: 'bg-white' },
      suspendida: { border: 'border-amber-500', text: 'text-amber-600', bg: 'bg-white' },
      finalizada: { border: 'border-gray-200 opacity-60', text: 'text-gray-400', bg: 'bg-white' }
    };

    let style = baseStyles[estado] || baseStyles.programado;

    // Lógica de tiempo solo para programado o iniciada
    if ((estado === 'programado' || estado === 'iniciada') && asig.hora_salida && isHoy) {
      const [hours, minutes] = asig.hora_salida.split(':').map(Number);
      const missionTime = new Date();
      missionTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      const diffMins = (missionTime.getTime() - now.getTime()) / (1000 * 60);

      if (diffMins < -15) {
        // Retraso crítico: Cambiar a Rojo
        return { border: 'border-red-500 shadow-lg shadow-red-100', text: 'text-red-600', bg: 'bg-white' };
      }
      if (diffMins <= 60) {
        // Próximo: Cambiar a Ámbar/Naranja
        return { border: 'border-orange-400', text: 'text-orange-500', bg: 'bg-white' };
      }
    }

    return style;
  };

  // Obtener el conteo de misiones del motorista
  const motoristaSelected = selectedMotoristaId 
    ? motoristas.find(m => m.id_motorista === selectedMotoristaId) 
    : null;
  const vehiculosFiltrados = getVehiculosFiltrados();
  const tieneVehiculosHabituales = (motoristaSelected?.conductores_habituales?.length || 0) > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1a73e8]">Programación Semanal</h1>
          <p className="text-gray-500 font-medium">Asignaciones de misiones y rutas para la flota</p>
        </div>
        {user?.rol === 'admin' && (
          <div className="flex gap-2">
             <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#1a73e8] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-[#174ea6] transition-all active:scale-95"
            >
              <Plus size={18} className="text-[#34A853]" />
              <span>Nueva Asignación</span>
            </button>
          </div>
        )}
      </header>

      {/* Week Navigation */}
      <div className="flex items-center justify-between glass p-4 rounded-3xl">
        <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-[#34A853]" size={20} />
          <span className="font-black text-[#1a73e8] uppercase tracking-widest text-sm">
            Semana del {weekDays[0].date} al {weekDays[6].date}
          </span>
        </div>
        <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="grid grid-cols-7 gap-4 md:gap-6 min-w-[700px] md:min-w-0">
          {weekDays.map((day) => {
             const dayAsignaciones = asignaciones.filter(a => a.fecha.startsWith(day.isoStr));
             return (
               <div key={day.isoStr} className="space-y-4">
                 <div className="text-center p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{day.name}</p>
                   <p className="text-lg font-black text-navy-900">{day.date}</p>
                 </div>

                 <div className="space-y-3 min-h-[300px]">
                   {dayAsignaciones.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-100 rounded-3xl text-gray-300">
                        <Clock size={24} className="mb-2 opacity-20" />
                        <span className="text-[10px] font-bold uppercase text-center">Sin misiones</span>
                     </div>
                   ) : dayAsignaciones.map((asig) => {
                     const style = getAlertStyle(asig);
                     return (
                       <div 
                         key={asig.id_asignacion} 
                         onClick={() => handleOpenModal(asig)}
                         className={`p-4 bg-white rounded-2xl border-2 ${style.border} transition-all group relative overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-95`}
                       >
                         {asig.estado === 'programado' && asig.hora_salida && asig.fecha.startsWith(hoyStr) && (
                            <div className={`absolute top-0 right-0 w-1.5 h-full ${style.text.replace('text-', 'bg-')}`} />
                         )}
                         <div className="flex items-start justify-between mb-3">
                            <div className={`w-8 h-8 rounded-xl ${style.text.replace('text-', 'bg-')} flex items-center justify-center font-bold text-[10px] text-white shadow-sm`}>
                               {asig.motorista.nombre[0]}{asig.motorista.apellido[0]}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[8px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase">
                                 {asig.estado}
                              </span>
                              {asig.hora_salida && (
                                <span className={`text-[9px] font-black ${style.text} flex items-center gap-1`}>
                                  <Clock size={10} />
                                  {asig.hora_salida}
                                </span>
                              )}
                            </div>
                         </div>
                         <p className="text-xs font-black text-[#174ea6] mb-0.5">{asig.motorista.nombre} {asig.motorista.apellido}</p>
                         <p className={`text-[9px] font-bold uppercase mb-1 ${style.text}`}>{asig.mision || asig.tipo_actividad}</p>
                         {asig.tipo_actividad && (
                           <span className="text-[7px] font-black uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mb-2 inline-block">{asig.tipo_actividad}</span>
                         )}
                         
                         <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-50">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                               <Car size={12} className="text-[#1a73e8] opacity-30" />
                               <span className="truncate">{asig.vehiculo?.placa || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                               <MapPin size={12} className="text-emerald-500 opacity-40" />
                               <span className="truncate">{asig.destino || asig.area_destino?.nombre_area || 'Sede Central'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-black uppercase mt-1">
                               <span className="truncate">Unidad: {asig.unidad_solicitante || 'N/A'}</span>
                            </div>
                            {asig.estado === 'finalizada' && asig.kilometraje_retorno && (
                              <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 flex flex-col gap-1">
                                <div className="flex justify-between items-center text-[8px] font-black uppercase text-gray-400">
                                  <span>Km Retorno</span>
                                  <span className="text-emerald-600">{asig.kilometraje_retorno}</span>
                                </div>
                                 <div className="text-[7px] text-gray-400 truncate">
                                   Doc: {asig.hoja_transporte_rnpn}
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               );
             })}
             </div>
           </div>
         )}

         {/* Basic Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
             <header className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#1a73e8]/10 flex items-center justify-center">
                    {selectedAsignacion ? <Pencil size={20} className="text-[#1a73e8]" /> : <Plus size={20} className="text-[#1a73e8]" />}
                  </div>
                  <h2 className="text-2xl font-black text-[#1a73e8]">
                    {selectedAsignacion ? 'Detalle de Misión' : 'Programar Misión'}
                  </h2>
                </div>
                <button onClick={handleCloseModal} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </header>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Motorista</label>
                  <select 
                    name="id_motorista" 
                    required 
                    defaultValue={selectedAsignacion?.id_motorista} 
                    onChange={handleMotoristaChange}
                    className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold appearance-none"
                  >
                    <option value="">Seleccione un conductor</option>
                    {motoristas.map(m => (
                      <option key={m.id_motorista} value={m.id_motorista}>
                        {m.nombre} {m.apellido}
                        {m.conductores_habituales && m.conductores_habituales.length > 0 
                          ? ` (${m.conductores_habituales.length} veh.)` 
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Estado de la Misión</label>
                  <select name="estado" required defaultValue={selectedAsignacion?.estado || 'programado'} className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-black appearance-none text-[#1a73e8]">
                    <option value="programado">📅 PROGRAMADA</option>
                    <option value="iniciada">🚀 INICIADA</option>
                    <option value="en_desarrollo">🔄 EN DESARROLLO</option>
                    <option value="suspendida">⚠️ SUSPENDIDA</option>
                    <option value="finalizada">✅ FINALIZADA</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tipo de Actividad</label>
                <select name="tipo_actividad" required defaultValue={selectedAsignacion?.tipo_actividad || 'Gestión Interna'} className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold appearance-none">
                  <option value="DUI a Domicilio">🏠 DUI a Domicilio</option>
                  <option value="Ruta Institucional">🛣️ Ruta Institucional</option>
                  <option value="Taller / Mantenimiento">🔧 Taller / Mantenimiento</option>
                  <option value="Gestión Interna">🏢 Gestión Interna</option>
                  <option value="Trámite Interinstitucional">🤝 Trámite Interinstitucional</option>
                  <option value="Novedad de Personal">👤 Novedad de Personal</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Vehículo</label>
                    {/* Toggle para ver todos los vehículos */}
                    {tieneVehiculosHabituales && (
                      <button
                        type="button"
                        onClick={() => setShowAllVehiculos(!showAllVehiculos)}
                        className={`flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full transition-all ${
                          showAllVehiculos 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        <Eye size={10} />
                        {showAllVehiculos ? 'Ver asignados' : 'Ver todos'}
                      </button>
                    )}
                  </div>
                  <select 
                    name="id_vehiculo" 
                    required 
                    defaultValue={selectedAsignacion?.id_vehiculo || ''} 
                    className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold appearance-none"
                  >
                     <option value="">Seleccione vehículo</option>
                     {vehiculosFiltrados.map(v => (
                      <option key={v.id_vehiculo} value={v.id_vehiculo}>
                        {v.placa} - {v.marca} {v.modelo} ({v.estado})
                      </option>
                    ))}
                  </select>
                  {/* Indicador visual del modo de filtrado */}
                  {selectedMotoristaId && tieneVehiculosHabituales && !showAllVehiculos && (
                    <p className="text-[9px] font-bold text-emerald-500 ml-1 flex items-center gap-1">
                      <Car size={10} />
                      Mostrando vehículos asignados a {motoristaSelected?.nombre}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Fecha</label>
                   <input name="fecha" type="date" required defaultValue={selectedAsignacion ? selectedAsignacion.fecha.split('T')[0] : ''} className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Unidad Solicitante</label>
                  <input name="unidad_solicitante" defaultValue={selectedAsignacion?.unidad_solicitante} placeholder="Ej: Dirección de TI" required className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Destino Específico</label>
                  <input name="destino" defaultValue={selectedAsignacion?.destino} placeholder="Ej: San Miguel, Sede Regional" required className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Misión / Actividad</label>
                  <input name="mision" defaultValue={selectedAsignacion?.mision} placeholder="Ej: Entrega de documentos" required className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Hora de Salida</label>
                  <input name="hora_salida" type="time" defaultValue={selectedAsignacion?.hora_salida} required className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2 sm:col-span-2">
                  <label className="flex items-center gap-3 text-sm font-black text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="aplica_vales" 
                      checked={aplicaVales} 
                      onChange={(e) => setAplicaVales(e.target.checked)}
                      className="w-5 h-5 text-[#1a73e8] border-gray-300 rounded focus:ring-[#1a73e8]" 
                    />
                    ¿Se aplicarán vales de combustible en esta misión?
                  </label>
                </div>
                {aplicaVales && (
                  <div className="space-y-2 sm:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Detalle de Vales de Combustible</label>
                    <textarea 
                      name="detalle_vales" 
                      defaultValue={selectedAsignacion?.detalle_vales}
                      placeholder="Ej: Vale #12345 por $20.00 asignado al vehículo..." 
                      className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold min-h-[80px] resize-y" 
                      required={aplicaVales}
                    />
                  </div>
                )}
              </div>

              {selectedAsignacion && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 mt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-blue-400 ml-1">Kilometraje de Retorno</label>
                    <input 
                      name="kilometraje_retorno" 
                      type="number" 
                      defaultValue={selectedAsignacion?.kilometraje_retorno}
                      placeholder={selectedAsignacion?.vehiculo ? `Actual: ${selectedAsignacion.vehiculo.kilometraje_actual}` : "Ingrese KM final"}
                      className="w-full px-5 py-4 bg-white border-transparent focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-black text-[#1a73e8]" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-blue-400 ml-1">No. de Hoja de Transporte RNPN</label>
                    <input 
                      name="hoja_transporte_rnpn" 
                      defaultValue={selectedAsignacion?.hoja_transporte_rnpn}
                      placeholder="Ej: HOJA-2024-001" 
                      className="w-full px-5 py-4 bg-white border-transparent focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-black text-[#1a73e8]" 
                    />
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
                  <span>{selectedAsignacion ? 'Guardar Cambios' : 'Agendar Misión'}</span>
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
