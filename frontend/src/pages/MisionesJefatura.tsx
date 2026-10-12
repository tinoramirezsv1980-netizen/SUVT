import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  FileText, 
  XCircle, 
  Loader2,
  Send,
  Printer,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import type { Mision, UnidadOrganizativa, AreaDestino } from '../types';
import { generateMisionPDF } from '../utils/pdfGenerator';

interface DestinoForm {
  nombre_destino: string;
  id_area_destino: number | null;
}

const DESTINO_VACIO: DestinoForm = { nombre_destino: '', id_area_destino: null };

export default function MisionesJefatura() {
  const { user } = useAuth();
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [unidades, setUnidades] = useState<UnidadOrganizativa[]>([]);
  const [areas, setAreas] = useState<AreaDestino[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [destinos, setDestinos] = useState<DestinoForm[]>([{ ...DESTINO_VACIO }]);
  const [esEmergencia, setEsEmergencia] = useState(false);
  const [searchParams] = useSearchParams();
  const misionRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [respMis, respUni, respAreas] = await Promise.all([
        api.get('misiones'),
        api.get('unidades'),
        api.get('areas')
      ]);
      
      if (respMis.data.ok) {
        const userMisiones = respMis.data.misiones.filter((m: Mision) => Number(m.id_usuario_solicitante) === Number(user.id));
        setMisiones(userMisiones);
      }
      
      if (respUni.data.ok) {
        setUnidades(respUni.data.unidades);
      }

      if (respAreas.data.ok) {
        setAreas(respAreas.data.areas);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  useEffect(() => {
    const misionId = searchParams.get('mision');
    if (misionId && misiones.length > 0) {
      const id = parseInt(misionId);
      const el = misionRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-[#1a73e8]', 'bg-blue-50');
      }
    }
  }, [searchParams, misiones]);

  const resetForm = () => {
    setDestinos([{ ...DESTINO_VACIO }]);
    setEsEmergencia(false);
  };

  const handleDestinoChange = (index: number, valor: string) => {
    const area = areas.find(a => a.nombre_area.toLowerCase() === valor.trim().toLowerCase());
    setDestinos(prev => prev.map((d, i) => i === index
      ? { nombre_destino: valor, id_area_destino: area?.id_area ?? null }
      : d
    ));
  };

  const addDestino = () => setDestinos(prev => [...prev, { ...DESTINO_VACIO }]);

  const removeDestino = (index: number) => setDestinos(prev =>
    prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Error: No se ha detectado el usuario. Por favor, inicie sesión de nuevo.');
      return;
    }

    const destinosLimpios = destinos
      .map(d => ({ ...d, nombre_destino: d.nombre_destino.trim() }))
      .filter(d => d.nombre_destino.length > 0);

    if (destinosLimpios.length === 0) {
      alert('Debe indicar al menos un destino');
      return;
    }

    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const data = {
      id_usuario_solicitante: user?.id,
      id_unidad: parseInt(formData.get('id_unidad') as string),
      objetivo_mision: formData.get('objetivo_mision'),
      persona_mision: formData.get('persona_mision'),
      destino: destinosLimpios[0].nombre_destino,
      destinos: destinosLimpios.map((d, i) => ({
        nombre_destino: d.nombre_destino,
        id_area_destino: d.id_area_destino,
        orden_visita: i + 1
      })),
      es_emergencia: esEmergencia,
      fecha_mision: formData.get('fecha_mision') ? new Date(formData.get('fecha_mision') as string).toISOString() : null,
      hora_mision: formData.get('hora_mision'),
      descripcion_mision: formData.get('descripcion_mision') || ''
    };

    console.log('Enviando misión:', data);
    try {
      await api.post('misiones', data);
      fetchData();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating mission:', error);
      alert('Error al crear la solicitud de misión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const listarDestinos = (m: Mision) => {
    const nombres = (m.destinos ?? [])
      .slice()
      .sort((a, b) => a.orden_visita - b.orden_visita)
      .map(d => d.nombre_destino)
      .filter(Boolean);
    return nombres.length > 0 ? nombres : (m.destino ? [m.destino] : []);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      solicitada: 'bg-amber-100 text-amber-700 border-amber-200',
      aprobada: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rechazada: 'bg-red-100 text-red-700 border-red-200',
      en_curso: 'bg-blue-100 text-blue-700 border-blue-200',
      finalizada: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${styles[status] || styles.solicitada}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1a73e8]">Mis Solicitudes</h1>
          <p className="text-gray-500 font-medium">Gestión de misiones solicitadas por su jefatura</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#1a73e8] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-[#174ea6] transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>Nueva Solicitud</span>
        </button>
      </header>

      <div className="glass rounded-[2rem] overflow-hidden border border-white/40 shadow-2xl">
        <div className="p-6 border-b border-gray-100 bg-white/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar misiones..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID / Fecha</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidad / Destinos</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Objetivo</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1a73e8] mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Cargando misiones...</p>
                  </td>
                </tr>
              ) : misiones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="text-gray-200" size={32} />
                    </div>
                    <p className="text-gray-400 font-medium">No se encontraron solicitudes</p>
                  </td>
                </tr>
              ) : misiones.map((m) => (
                <tr key={m.id_mision} ref={(el) => { misionRefs.current[m.id_mision] = el; }} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="font-black text-[#1a73e8]">#M-{m.id_mision}</span>
                      <span className="text-[10px] text-[#34A853] font-bold">Prog: {m.fecha_mision ? new Date(m.fecha_mision).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : 'N/A'} {m.hora_mision}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-700">{m.unidad?.nombre_unidad || 'N/A'}</span>
                      <span className="text-[10px] text-gray-400 font-bold italic">
                        {listarDestinos(m).length > 0 ? listarDestinos(m).join(' → ') : 'Sin destino'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-black uppercase mt-1">
                        {listarDestinos(m).length} {listarDestinos(m).length === 1 ? 'destino' : 'destinos'}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <p className="text-sm text-gray-700 font-black line-clamp-1">{m.objetivo_mision || 'Sin asignar'}</p>
                    <p className="text-[10px] text-gray-500 font-medium line-clamp-2 mt-1">{m.persona_mision || m.descripcion_mision}</p>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-2 items-start">
                      {getStatusBadge(m.estado_mision)}
                      {m.es_emergencia && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
                          <AlertTriangle size={12} /> Emergencia
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => generateMisionPDF(m)}
                        className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-all border border-transparent hover:border-amber-100"
                        title="Imprimir Solicitud (PDF)"
                      >
                        <Printer size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          const kmIni = m.kilometraje_inicial || 0;
                          const kmFin = m.kilometraje_final || 0;
                          const dist = kmFin > 0 ? kmFin - kmIni : 0;
                          const obsSeguridad = m.controles_acceso?.map(c => 
                            `- ${c.tipo_movimiento === 'salida_base' ? 'SALIDA' : 'REGRESO'}: ${c.observaciones || 'Sin novedad'}`
                          ).join('\n') || 'No hay registros de seguridad';
                          const ruta = listarDestinos(m).map((d, i) => `  ${i + 1}. ${d}`).join('\n') || 'N/A';

                          alert(
                            `Detalles de Misión #M-${m.id_mision}\n` +
                            `----------------------------------\n` +
                            `Objetivo: ${m.objetivo_mision || 'N/A'}\n` +
                            `Descripción: ${m.persona_mision || m.descripcion_mision || 'N/A'}\n` +
                            `Destinos:\n${ruta}\n` +
                            `Emergencia: ${m.es_emergencia ? 'SÍ' : 'No'}\n` +
                            `Fecha: ${m.fecha_mision ? new Date(m.fecha_mision).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : 'N/A'}\n\n` +
                            `INFORMACIÓN TÉCNICA:\n` +
                            `KM Inicial: ${kmIni} KM\n` +
                            `KM Final: ${kmFin || 'Pendiente'} KM\n` +
                            `Recorrido Total: ${dist > 0 ? dist + ' KM' : 'En curso...'}\n\n` +
                            `OBSERVACIONES DE SEGURIDAD:\n${obsSeguridad}`
                          );
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-gray-100 text-gray-400 hover:text-[#1a73e8]" 
                        title="Ver Detalles"
                      >
                        <Search size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <header className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1a73e8]/10 flex items-center justify-center">
                  <Plus size={20} className="text-[#1a73e8]" />
                </div>
                <h2 className="text-2xl font-black text-[#1a73e8]">Nueva Solicitud</h2>
              </div>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400">
                <XCircle size={20} />
              </button>
            </header>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Unidad Organizativa</label>
                <select 
                  name="id_unidad" 
                  required 
                  defaultValue={unidades.find(u => Number(u.id_jefe_usuario) === Number(user?.id))?.id_unitat || ""}
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold appearance-none"
                >
                  <option value="">Seleccione su unidad</option>
                  {unidades.map(u => (
                    <option key={u.id_unitat} value={u.id_unitat}>{u.nombre_unidad}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Objetivo de la Misión</label>
                <input 
                  type="text"
                  name="objetivo_mision" 
                  required 
                  placeholder="Ej: Entrega de suministros, Visita institucional"
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Persona(s) que Realiza(n) la Misión</label>
                <textarea 
                  name="persona_mision" 
                  required 
                  placeholder="Nombres completos de los colaboradores que realizarán la misión..."
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-medium min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Destinos (en orden de visita)</label>
                  <button
                    type="button"
                    onClick={addDestino}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-[#1a73e8] bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={14} /> Agregar destino
                  </button>
                </div>
                <datalist id="areas-destino">
                  {areas.map(a => (
                    <option key={a.id_area} value={a.nombre_area} />
                  ))}
                </datalist>
                <div className="space-y-2">
                  {destinos.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-7 h-7 shrink-0 rounded-xl bg-[#1a73e8]/10 text-[#1a73e8] text-[11px] font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        list="areas-destino"
                        required
                        value={d.nombre_destino}
                        onChange={e => handleDestinoChange(i, e.target.value)}
                        placeholder="Ej: Oficina Regional de Santa Ana"
                        className="flex-1 px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => removeDestino(i)}
                        disabled={destinos.length <= 1}
                        className="p-2 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Quitar destino"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 font-medium ml-1">
                  Puede elegir un área del catálogo o escribir un destino libre. El orden es el de la visita.
                </p>
              </div>

              <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${esEmergencia ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-transparent'}`}>
                <input
                  type="checkbox"
                  checked={esEmergencia}
                  onChange={e => setEsEmergencia(e.target.checked)}
                  className="w-5 h-5 accent-red-500"
                />
                <span className="flex items-center gap-2 text-sm font-black text-red-600">
                  <AlertTriangle size={16} /> Marcar como emergencia
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Fecha Estimada</label>
                  <input 
                    type="date"
                    name="fecha_mision" 
                    required 
                    className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Hora Estimada</label>
                  <input 
                    type="time"
                    name="hora_mision" 
                    required 
                    className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Observaciones / Descripción (Opcional)</label>
                <textarea 
                  name="descripcion_mision" 
                  placeholder="Detalles adicionales sobre la ruta o necesidades especiales..."
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-medium min-h-[80px] resize-none"
                />
              </div>

              <footer className="pt-6 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 py-4 px-6 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-[2] py-4 px-6 bg-[#1a73e8] text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-500/20 hover:bg-[#174ea6] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    <>
                      <Send size={18} className="text-[#34A853]" />
                      <span>Enviar Solicitud</span>
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
