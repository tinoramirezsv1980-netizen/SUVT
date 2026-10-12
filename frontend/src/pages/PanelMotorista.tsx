import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  LogOut,
  Car,
  XCircle,
  Send,
  AlertTriangle
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import type { Mision, DestinoMision } from '../types';

export default function PanelMotorista() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [misionesActivas, setMisionesActivas] = useState<Mision[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [selectedMisionForStart, setSelectedMisionForStart] = useState<Mision | null>(null);
  const [selectedMisionForFinalize, setSelectedMisionForFinalize] = useState<Mision | null>(null);
  const [movementModal, setMovementModal] = useState<{
    isOpen: boolean;
    mision: Mision | null;
    id_destino_mision?: number | null;
    tipo_evento: string;
    titulo: string;
    ubicacionDefault: string;
    showKm: boolean;
    showFuel: boolean;
    showUbicacion: boolean;
    kmDefault?: number;
    fuelDefault?: string;
  }>({
    isOpen: false,
    mision: null,
    id_destino_mision: null,
    tipo_evento: '',
    titulo: '',
    ubicacionDefault: '',
    showKm: false,
    showFuel: false,
    showUbicacion: false
  });

  const destinosOrdenados = (m: Mision): DestinoMision[] =>
    (m.destinos ?? []).slice().sort((a, b) => a.orden_visita - b.orden_visita);

  const tieneEvento = (m: Mision, tipo: string, idDestino?: number | null) =>
    !!m.movimientos?.some(mov =>
      mov.tipo_evento === tipo &&
      (idDestino === undefined ? true : (mov.id_destino_mision ?? null) === (idDestino ?? null))
    );

  const handleMovementSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!movementModal.mision) return;
    
    const formData = new FormData(e.currentTarget);
    const loc = movementModal.showUbicacion ? (formData.get('ubicacion') as string) : movementModal.ubicacionDefault;
    const kmStr = formData.get('km') as string;
    const km = kmStr ? parseInt(kmStr) : undefined;
    const fuel = movementModal.showFuel ? (formData.get('fuel') as string) : undefined;
    
    await handleRegisterEvent(
      movementModal.mision.id_mision, 
      movementModal.tipo_evento, 
      loc || 'No especificada', 
      km, 
      fuel,
      movementModal.id_destino_mision ?? null
    );
    setMovementModal(prev => ({ ...prev, isOpen: false }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await api.get('misiones');
      // Aprobadas/en curso para operar + solicitadas para ver emergencias pendientes
      setMisionesActivas(resp.data.misiones.filter((m: Mision) => 
        m.id_motorista === user?.id_motorista && 
        (m.estado_mision === 'aprobada' || m.estado_mision === 'en_curso' || m.estado_mision === 'solicitada')
      ));
    } catch (error) {
      console.error('Error fetching misiones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const misionId = searchParams.get('mision');
    if (misionId && misionesActivas.length > 0) {
      const id = parseInt(misionId);
      const el = document.getElementById(`mision-card-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-emerald-400');
      }
    }
  }, [searchParams, misionesActivas]);

  const handleRegisterEvent = async (id_mision: number, tipo_evento: string, ubicacion: string, km?: number, fuel?: string, idDestinoMision?: number | null) => {
    setIsSubmitting(true);
    try {
      await api.post('misiones/movement', {
        id_mision,
        id_destino_mision: idDestinoMision ?? null,
        tipo_evento,
        ubicacion,
        kilometraje_registro: km,
        nivel_combustible: fuel
      });
      await fetchData();
      if (tipo_evento === 'salida_base') setIsChecklistOpen(false);
    } catch (error) {
      console.error('Error registering event:', error);
      alert('Error al registrar el evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartMission = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMisionForStart) return;
    const formData = new FormData(e.currentTarget);
    const km = parseInt(formData.get('km') as string);
    const fuel = formData.get('fuel') as string;
    await handleRegisterEvent(selectedMisionForStart.id_mision, 'salida_base', 'Base RNPN', km, fuel, null);
  };

  const handleFinalizeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMisionForFinalize) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      kilometraje_final: parseInt(formData.get('km_final') as string),
      nivel_combustible: formData.get('fuel_final') as string
    };

    setIsSubmitting(true);
    try {
      await api.patch(`misiones/${selectedMisionForFinalize.id_mision}/finalize`, data);
      await fetchData();
      setIsFinalizeOpen(false);
      alert('Misión finalizada y cerrada correctamente');
    } catch (error: any) {
      console.error('Error finalizing mission:', error);
      alert(error.response?.data?.error || 'Error al finalizar la misión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmergencySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const ahora = new Date();
    const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    const data = {
      id_usuario_solicitante: user.id,
      objetivo_mision: formData.get('objetivo_mision'),
      persona_mision: formData.get('persona_mision'),
      destino: formData.get('destino'),
      destinos: [{ nombre_destino: formData.get('destino'), orden_visita: 1 }],
      es_emergencia: true,
      fecha_mision: ahora.toISOString(),
      hora_mision: hora,
      descripcion_mision: formData.get('descripcion_mision') || 'Solicitud de emergencia'
    };

    try {
      await api.post('misiones', data);
      await fetchData();
      setIsEmergencyOpen(false);
      alert('Emergencia enviada. Queda pendiente de aprobación.');
    } catch (error: any) {
      console.error('Error creating emergency:', error);
      alert(error.response?.data?.error || 'Error al solicitar la emergencia');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1a73e8]" />
        <p className="text-gray-400 font-medium">Cargando panel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <header className="text-center space-y-2">
        <div className="w-20 h-20 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-xl shadow-blue-500/10">
          <Navigation className="text-[#1a73e8]" size={32} />
        </div>
        <h1 className="text-3xl font-black text-[#1a73e8]">Panel de Misión</h1>
        <p className="text-gray-500 font-medium italic">"Seguridad en cada kilómetro"</p>
        <button
          onClick={() => setIsEmergencyOpen(true)}
          className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
        >
          <AlertTriangle size={18} />
          <span>Solicitar Emergencia</span>
        </button>
      </header>

      {misionesActivas.length === 0 ? (
        <div className="glass p-12 rounded-[3rem] text-center space-y-6 border border-white/40 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-emerald-500" size={40} />
          </div>
          <div>
            <h2 className="text-xl font-black text-navy-900">Sin misiones activas</h2>
            <p className="text-gray-400 text-sm mt-2">No tienes misiones asignadas para este momento.</p>
          </div>
        </div>
      ) : (
        misionesActivas.map(m => {
          const destinos = destinosOrdenados(m);
          const ultimoDestino = destinos[destinos.length - 1];
          const tieneSalidaBase = tieneEvento(m, 'salida_base');
          const pendienteAprobacion = m.estado_mision === 'solicitada';
          const puedeCerrar = !!ultimoDestino && tieneEvento(m, 'salida_destino', ultimoDestino.id_destino_mision);

          return (
          <div key={m.id_mision} id={`mision-card-${m.id_mision}`} className="glass rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/40 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
            <div className={`p-4 sm:p-6 md:p-8 text-white space-y-4 ${m.es_emergencia ? 'bg-red-600' : 'bg-[#1a73e8]'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Misión Activa</p>
                  <h2 className="text-2xl font-black">#M-{m.id_mision}</h2>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase border border-white/20 backdrop-blur-md">
                    {m.estado_mision}
                  </div>
                  {m.es_emergencia && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-white text-red-600 rounded-full text-[10px] font-black uppercase">
                      <AlertTriangle size={12} /> Emergencia
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 py-4 border-t border-white/10">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Car size={20} />
                </div>
                <div>
                  <p className="text-sm font-black">{m.vehiculo?.placa || 'Sin vehículo'}</p>
                  <p className="text-[10px] font-bold opacity-60 uppercase">{m.vehiculo?.marca} {m.vehiculo?.modelo}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] font-black opacity-60 uppercase">Destinos</p>
                  <p className="text-xs font-bold">{destinos.length || 1}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
              {pendienteAprobacion && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={18} />
                  <p className="text-xs font-bold text-amber-700">Pendiente de aprobación por administración. Aún no puede iniciar la misión.</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-[#1a73e8] shrink-0">
                    <FileText size={16} />
                  </div>
                  <p className="text-sm font-medium text-gray-600 italic">"{m.descripcion_mision}"</p>
                </div>
              </div>

              {/* Ruta ordenada de destinos */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ruta de visita</p>
                <div className="space-y-3">
                  {destinos.length === 0 ? (
                    <div className="p-4 bg-gray-50 rounded-2xl text-xs font-bold text-gray-400">
                      {m.destino || 'Sin destinos registrados'}
                    </div>
                  ) : destinos.map((d, i) => {
                    const llegada = tieneEvento(m, 'llegada_destino', d.id_destino_mision);
                    const salida = tieneEvento(m, 'salida_destino', d.id_destino_mision);
                    const previoSalida = i === 0 ? tieneSalidaBase : tieneEvento(m, 'salida_destino', destinos[i - 1].id_destino_mision);
                    const canLlegada = !pendienteAprobacion && previoSalida && !llegada;
                    const canSalida = !pendienteAprobacion && llegada && !salida;

                    return (
                      <div key={d.id_destino_mision} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 shrink-0 rounded-xl text-[11px] font-black flex items-center justify-center ${salida ? 'bg-emerald-100 text-emerald-600' : llegada ? 'bg-blue-100 text-[#1a73e8]' : 'bg-gray-200 text-gray-500'}`}>
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-gray-700 truncate">{d.nombre_destino}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">
                              {salida ? 'Completado' : llegada ? 'En destino' : previoSalida ? 'Pendiente' : 'Bloqueado'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setMovementModal({
                                isOpen: true,
                                mision: m,
                                id_destino_mision: d.id_destino_mision,
                                tipo_evento: 'llegada_destino',
                                titulo: `Llegada: ${d.nombre_destino}`,
                                ubicacionDefault: d.nombre_destino,
                                showKm: true,
                                showFuel: true,
                                showUbicacion: false
                              });
                            }}
                            disabled={isSubmitting || !canLlegada}
                            className={`py-3 rounded-2xl border transition-all group flex items-center justify-center gap-2 text-[10px] font-black uppercase ${canLlegada ? 'bg-blue-50 hover:bg-blue-100 border-blue-100 text-[#1a73e8]' : 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed'}`}
                          >
                            <MapPin size={16} /> Llegada
                          </button>
                          <button
                            onClick={() => {
                              const movLlegada = m.movimientos?.find(mov => mov.tipo_evento === 'llegada_destino' && mov.id_destino_mision === d.id_destino_mision);
                              setMovementModal({
                                isOpen: true,
                                mision: m,
                                id_destino_mision: d.id_destino_mision,
                                tipo_evento: 'salida_destino',
                                titulo: `Salida: ${d.nombre_destino}`,
                                ubicacionDefault: d.nombre_destino,
                                showKm: true,
                                showFuel: true,
                                showUbicacion: false,
                                kmDefault: movLlegada?.kilometraje_registro,
                                fuelDefault: movLlegada?.nivel_combustible
                              });
                            }}
                            disabled={isSubmitting || !canSalida}
                            className={`py-3 rounded-2xl border transition-all group flex items-center justify-center gap-2 text-[10px] font-black uppercase ${canSalida ? 'bg-amber-50 hover:bg-amber-100 border-amber-100 text-amber-600' : 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed'}`}
                          >
                            <LogOut size={16} className="rotate-180" /> Salida
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    setSelectedMisionForStart(m);
                    setIsChecklistOpen(true);
                  }}
                  disabled={isSubmitting || pendienteAprobacion || tieneSalidaBase}
                  className={`p-6 bg-emerald-50 hover:bg-emerald-100 rounded-[2rem] border border-emerald-100 transition-all group flex flex-col items-center gap-3 active:scale-95 ${(pendienteAprobacion || tieneSalidaBase) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                >
                  <Navigation className="text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center">Salida Base (Inicio)</span>
                </button>

                <button 
                  onClick={() => {
                    setMovementModal({
                      isOpen: true,
                      mision: m,
                      id_destino_mision: null,
                      tipo_evento: 'parada_tecnica',
                      titulo: 'Parada Técnica',
                      ubicacionDefault: '',
                      showKm: true,
                      showFuel: true,
                      showUbicacion: true
                    });
                  }}
                  disabled={isSubmitting || !tieneSalidaBase}
                  className={`p-6 bg-purple-50 hover:bg-purple-100 rounded-[2rem] border border-purple-100 transition-all group flex flex-col items-center gap-3 active:scale-95 ${!tieneSalidaBase ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                >
                  <Clock className="text-purple-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest text-center">Parada Técnica</span>
                </button>

                <button 
                  onClick={() => {
                    setMovementModal({
                      isOpen: true,
                      mision: m,
                      id_destino_mision: null,
                      tipo_evento: 'incidente',
                      titulo: 'Registrar Incidente',
                      ubicacionDefault: '',
                      showKm: false,
                      showFuel: false,
                      showUbicacion: true
                    });
                  }}
                  disabled={isSubmitting || !tieneSalidaBase}
                  className={`p-6 bg-red-50 hover:bg-red-100 rounded-[2rem] border border-red-100 transition-all group flex flex-col items-center gap-3 active:scale-95 col-span-1 sm:col-span-2 ${!tieneSalidaBase ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                >
                  <AlertCircle className="text-red-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest text-center">Registrar Incidente</span>
                </button>
              </div>

              <div className="pt-8 border-t border-gray-100">
                <button 
                  onClick={() => {
                    setSelectedMisionForFinalize(m);
                    setIsFinalizeOpen(true);
                  }}
                  disabled={isSubmitting || !puedeCerrar}
                  className={`w-full py-5 rounded-[2rem] font-black text-sm shadow-xl transition-all flex items-center justify-center gap-3 ${!puedeCerrar ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95'}`}
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : (
                    <>
                      <CheckCircle2 size={20} />
                      <span>CERRAR MISIÓN (FINALIZAR)</span>
                    </>
                  )}
                </button>
                {!puedeCerrar && destinos.length > 0 && (
                  <p className="text-[10px] font-bold text-gray-400 text-center mt-3 uppercase">
                    Falta la salida del último destino: {ultimoDestino?.nombre_destino}
                  </p>
                )}
              </div>
            </div>
          </div>
          );
        })
      )}
      {/* Modal Checklist Inicio */}
      {isChecklistOpen && selectedMisionForStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <header className="p-8 pb-4 flex justify-between items-center bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Car size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">Inicio de Misión</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chequeo de Salida</p>
                </div>
              </div>
            </header>

            <form onSubmit={handleStartMission} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Kilometraje Inicial</label>
                <div className="relative">
                  <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    name="km" 
                    type="number" 
                    required 
                    defaultValue={selectedMisionForStart.vehiculo?.kilometraje_actual}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nivel de Combustible</label>
                <select 
                  name="fuel" 
                  required 
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold appearance-none"
                >
                  <option value="F">Full (F)</option>
                  <option value="tres_cuartos">3/4</option>
                  <option value="un_medio">1/2</option>
                  <option value="un_cuarto">1/4</option>
                  <option value="E">Reserva (E)</option>
                </select>
              </div>

              <footer className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsChecklistOpen(false)} className="flex-1 py-4 text-sm font-bold text-gray-400">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Confirmar e Iniciar'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal Genérico de Movimientos */}
      {movementModal.isOpen && movementModal.mision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <header className="p-8 pb-4 flex justify-between items-center bg-[#1a73e8] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Navigation size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black">{movementModal.titulo}</h2>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Misión #M-{movementModal.mision.id_mision}</p>
                </div>
              </div>
            </header>

            <form onSubmit={handleMovementSubmit} className="p-8 space-y-6">
              {movementModal.showUbicacion && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Ubicación / Descripción</label>
                  <input 
                    name="ubicacion" 
                    type="text" 
                    required 
                    placeholder="Ej. Gasolinera UNO / Falla mecánica"
                    className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-black"
                  />
                </div>
              )}

              {movementModal.showKm && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Kilometraje Actual</label>
                  <div className="relative">
                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      name="km" 
                      type="number" 
                      required 
                      defaultValue={movementModal.kmDefault || ''}
                      placeholder="Kilometraje"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-black"
                    />
                  </div>
                </div>
              )}

              {movementModal.showFuel && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nivel de Combustible</label>
                  <select 
                    name="fuel" 
                    required 
                    defaultValue={movementModal.fuelDefault || 'F'}
                    className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold appearance-none"
                  >
                    <option value="F">Full (F)</option>
                    <option value="tres_cuartos">3/4</option>
                    <option value="un_medio">1/2</option>
                    <option value="un_cuarto">1/4</option>
                    <option value="E">Reserva (E)</option>
                  </select>
                </div>
              )}

              <footer className="pt-4 flex gap-4">
                <button type="button" onClick={() => setMovementModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-4 text-sm font-bold text-gray-400">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-[#1a73e8] text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 hover:bg-[#174ea6] transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Guardar Evento'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
      {/* Modal Cierre Misión */}
      {isFinalizeOpen && selectedMisionForFinalize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <header className="p-8 pb-4 flex justify-between items-center bg-[#1a73e8] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black">Cerrar Misión</h2>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Misión #M-{selectedMisionForFinalize.id_mision}</p>
                </div>
              </div>
            </header>

            <form onSubmit={handleFinalizeSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Kilometraje Final</label>
                <div className="relative">
                  <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    name="km_final" 
                    type="number" 
                    required 
                    placeholder="Ingrese kilometraje al retornar"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nivel de Combustible al Retorno</label>
                <select 
                  name="fuel_final" 
                  required 
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold appearance-none"
                >
                  <option value="F">Full (F)</option>
                  <option value="tres_cuartos">3/4</option>
                  <option value="un_medio">1/2</option>
                  <option value="un_cuarto">1/4</option>
                  <option value="E">Reserva (E)</option>
                </select>
              </div>

              <div className="p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 text-center uppercase">
                  Asegúrese de haber retornado a la base para cerrar la misión
                </p>
              </div>

              <footer className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsFinalizeOpen(false)} className="flex-1 py-4 text-sm font-bold text-gray-400">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-[#1a73e8] text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 hover:bg-[#174ea6] transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Finalizar Misión'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal Emergencia */}
      {isEmergencyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <header className="p-8 pb-4 flex justify-between items-center bg-red-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black">Solicitar Emergencia</h2>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Requiere aprobación</p>
                </div>
              </div>
              <button onClick={() => setIsEmergencyOpen(false)} className="p-2 hover:bg-white/20 rounded-2xl transition-colors">
                <XCircle size={20} />
              </button>
            </header>

            <form onSubmit={handleEmergencySubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Objetivo de la Emergencia</label>
                <input
                  name="objetivo_mision"
                  type="text"
                  required
                  placeholder="Ej: Traslado urgente de paciente"
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-red-500 rounded-2xl transition-all text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Destino</label>
                <input
                  name="destino"
                  type="text"
                  required
                  placeholder="Ej: Hospital Nacional"
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-red-500 rounded-2xl transition-all text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Persona(s)</label>
                <input
                  name="persona_mision"
                  type="text"
                  required
                  placeholder="Nombres del personal"
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-red-500 rounded-2xl transition-all text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Detalle (Opcional)</label>
                <textarea
                  name="descripcion_mision"
                  placeholder="Descripción breve de la emergencia..."
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-red-500 rounded-2xl transition-all text-sm font-medium min-h-[80px] resize-none"
                />
              </div>

              <footer className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsEmergencyOpen(false)} className="flex-1 py-4 text-sm font-bold text-gray-400">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-red-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    <>
                      <Send size={18} />
                      <span>Enviar Emergencia</span>
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

function FileText({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
