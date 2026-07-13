import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  //Clock, 
  User, 
  Car, 
  Search, 
  Loader2,
  //Calendar,
  //Filter,
  Printer,
  Upload,
  FileCheck
} from 'lucide-react';
import api from '../api/axios';
import type { Mision, Motorista, Vehiculo } from '../types';
import { generateMisionPDF } from '../utils/pdfGenerator';

export default function GestionMisiones() {
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMision, setSelectedMision] = useState<Mision | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'solicitadas' | 'en_curso'>('todas');
  const [searchParams] = useSearchParams();
  
  // States for vehicle auto-assignment
  const [selectedMotoristaId, setSelectedMotoristaId] = useState<number | ''>('');
  const [useHabitualVehicle, setUseHabitualVehicle] = useState<boolean>(true);

  const misionesFiltradas = misiones.filter(m => {
    if (filtro === 'solicitadas') return m.estado_mision === 'solicitada';
    if (filtro === 'en_curso') return m.estado_mision === 'aprobada' || m.estado_mision === 'en_curso';
    return true;
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [respMis, respMot, respVeh] = await Promise.all([
        api.get('/misiones'),
        api.get('/motoristas'),
        api.get('/vehiculos')
      ]);
      setMisiones(respMis.data.misiones);
      setMotoristas(respMot.data.motoristas);
      setVehiculos(respVeh.data.vehiculos);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const misionId = searchParams.get('mision');
    if (misionId && misiones.length > 0) {
      const mision = misiones.find(m => m.id_mision === parseInt(misionId));
      if (mision && mision.estado_mision === 'solicitada') {
        setSelectedMision(mision);
        setSelectedMotoristaId(mision.id_motorista || '');
        setUseHabitualVehicle(true);
        setIsModalOpen(true);
      }
    }
  }, [searchParams, misiones]);

  const handleAssign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMision) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    let finalVehiculoId = formData.get('id_vehiculo') as string;
    
    // Auto-asignar vehículo habitual si está habilitado
    const motoristaData = motoristas.find(m => m.id_motorista === selectedMotoristaId);
    const habitual = motoristaData?.conductores_habituales?.[0]?.vehiculo;
    if (habitual && useHabitualVehicle) {
      finalVehiculoId = habitual.id_vehiculo.toString();
    }
    
    if (!finalVehiculoId) {
      alert('Por favor seleccione un vehículo.');
      setIsSubmitting(false);
      return;
    }
    
    const data = {
      id_motorista: parseInt(formData.get('id_motorista') as string),
      id_vehiculo: parseInt(finalVehiculoId),
      estado_mision: 'aprobada',
      justificacion_cambio_vehiculo: formData.get('justificacion_cambio_vehiculo') as string || undefined
    };

    try {
      await api.patch(`/misiones/${selectedMision.id_mision}/assign`, data);
      fetchData();
      setIsModalOpen(false);
      setSelectedMision(null);
      setSelectedMotoristaId('');
      setUseHabitualVehicle(true);
    } catch (error) {
      console.error('Error assigning mission:', error);
      alert('Error al asignar recursos');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, id_mision: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('documento', file);

    try {
      setIsUploading(id_mision);
      await api.patch(`/misiones/${id_mision}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
      alert('Documento subido correctamente');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir el documento');
    } finally {
      setIsUploading(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('¿Seguro que desea rechazar esta misión?')) return;
    try {
      await api.patch(`/misiones/${id}/assign`, { estado_mision: 'rechazada' });
      fetchData();
    } catch (error) {
      console.error('Error rejecting mission:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-3xl font-black text-[#1a73e8]">Gestión de Misiones</h1>
        <p className="text-gray-500 font-medium">Validación y asignación de recursos para misiones solicitadas</p>
      </header>

      <div className="glass rounded-[2rem] overflow-hidden border border-white/40 shadow-2xl">
        <div className="p-6 border-b border-gray-100 bg-white/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <span 
              onClick={() => setFiltro('todas')}
              className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${filtro === 'todas' ? 'bg-[#1a73e8] text-white' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-[#1a73e8]'}`}
            >
              TODAS
            </span>
            <span 
              onClick={() => setFiltro('solicitadas')}
              className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${filtro === 'solicitadas' ? 'bg-[#1a73e8] text-white' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-[#1a73e8]'}`}
            >
              SOLICITADAS
            </span>
            <span 
              onClick={() => setFiltro('en_curso')}
              className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${filtro === 'en_curso' ? 'bg-[#1a73e8] text-white' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-[#1a73e8]'}`}
            >
              EN CURSO
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Solicitante / Unidad</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Misión</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asignación</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#1a73e8]" /></td></tr>
              ) : misionesFiltradas.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-gray-400">No hay misiones registradas</td></tr>
              ) : misionesFiltradas.map(m => (
                <tr key={m.id_mision} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-navy-900">{m.solicitante?.nombre}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{m.unidad?.nombre_unidad}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <p className="text-sm text-gray-600 font-medium line-clamp-1">{m.descripcion_mision}</p>
                    <span className="text-[10px] text-[#1a73e8] font-black">{new Date(m.fecha_solicitud).toLocaleString()}</span>
                  </td>
                  <td className="p-6">
                    {m.motorista ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                          <User size={12} className="text-blue-400" /> {m.motorista.nombre}
                        </span>
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                          <Car size={12} className="text-emerald-400" /> {m.vehiculo?.placa}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-amber-500 uppercase italic">Pendiente de asignar</span>
                    )}
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                      m.estado_mision === 'solicitada' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      m.estado_mision === 'aprobada' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                      {m.estado_mision}
                    </span>
                  </td>
                  <td className="p-6 text-right space-x-2">
                    {m.estado_mision === 'solicitada' && (
                      <>
                        <button 
                          onClick={() => { 
                            setSelectedMision(m); 
                            setIsModalOpen(true); 
                            setSelectedMotoristaId('');
                            setUseHabitualVehicle(true);
                          }}
                          className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                          title="Aprobar y Asignar"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(m.id_mision)}
                          className="p-2 sm:p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="Rechazar"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      {m.documento_respaldo && (
                        <a 
                          href={`${(api.defaults.baseURL || '').split('/api')[0]}/${m.documento_respaldo.replace(/\\/g, '/')}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
                          title="VER DOCUMENTO ADJUNTO DE MISION FINALIZADA"
                        >
                          <FileCheck size={18} />
                        </a>
                      )}
                      <button 
                        onClick={() => generateMisionPDF(m)}
                        className="p-2 sm:p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                        title="IMPRIMIR O GUARDAR SOLICITUD"
                      >
                          <Printer size={18} />
                      </button>
                      <label className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm cursor-pointer flex items-center justify-center m-0" title="SUBIR DOCUMENTO CON MISION FINALIZADA">
                        {isUploading === m.id_mision ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Upload size={18} />
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, m.id_mision)}
                          disabled={isUploading !== null}
                        />
                      </label>
                      <button 
                        onClick={() => {
                          const kmIni = m.kilometraje_inicial || 0;
                          const kmFin = m.kilometraje_final || 0;
                          const dist = kmFin > 0 ? kmFin - kmIni : 0;
                          
                          const obsSeguridad = m.controles_acceso?.map(c => 
                            `- ${c.tipo_movimiento === 'salida_base' ? 'SALIDA' : 'REGRESO'}: ${c.observaciones || 'Sin novedad'}`
                          ).join('\n') || 'No hay registros de seguridad';

                          alert(
                            `Detalles de Misión #M-${m.id_mision}\n` +
                            `----------------------------------\n` +
                            `Objetivo: ${m.objetivo_mision || 'N/A'}\n` +
                            `Descripción: ${m.persona_mision || m.descripcion_mision || 'N/A'}\n` +
                            `Destino: ${m.destino || 'N/A'}\n` +
                            `Fecha: ${m.fecha_mision ? new Date(m.fecha_mision).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : 'N/A'}\n\n` +
                            `INFORMACIÓN TÉCNICA:\n` +
                            `KM Inicial: ${kmIni} KM\n` +
                            `KM Final: ${kmFin || 'Pendiente'} KM\n` +
                            `Recorrido Total: ${dist > 0 ? dist + ' KM' : 'Calculando...'}\n\n` +
                            `OBSERVACIONES DE SEGURIDAD:\n${obsSeguridad}`
                          );
                        }}
                        className="p-2 sm:p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-white hover:text-[#1a73e8] transition-all shadow-sm border border-transparent hover:border-gray-100"
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

      {isModalOpen && selectedMision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-8 pb-4 flex justify-between items-center border-b border-gray-50 bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle size={20} />
                </div>
                <h2 className="text-2xl font-black text-gray-900">Asignar Recursos</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400">
                <XCircle size={20} />
              </button>
            </header>
            
            <form onSubmit={handleAssign} className="p-8 space-y-6">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Misión Solicitada</p>
                <p className="text-sm font-medium text-gray-700 italic">"{selectedMision.descripcion_mision}"</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Motorista</label>
                <select 
                  name="id_motorista" 
                  required 
                  value={selectedMotoristaId}
                  onChange={(e) => setSelectedMotoristaId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-bold appearance-none"
                >
                  <option value="">Seleccione un conductor</option>
                  {motoristas.map(m => (
                    <option key={m.id_motorista} value={m.id_motorista}>{m.nombre} {m.apellido}</option>
                  ))}
                </select>
              </div>

              {selectedMotoristaId !== '' && motoristas.find(m => m.id_motorista === selectedMotoristaId)?.conductores_habituales?.[0]?.vehiculo && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-[#1a73e8]">¿El motorista irá en su vehículo asignado?</p>
                    <div className="flex bg-white rounded-lg p-1 border border-blue-100 shadow-sm">
                      <button 
                        type="button"
                        onClick={() => setUseHabitualVehicle(true)}
                        className={`px-4 py-1 text-[10px] font-black rounded-md transition-all ${useHabitualVehicle ? 'bg-[#1a73e8] text-white shadow-sm' : 'text-gray-400 hover:text-[#1a73e8]'}`}
                      >
                        SÍ
                      </button>
                      <button 
                        type="button"
                        onClick={() => setUseHabitualVehicle(false)}
                        className={`px-4 py-1 text-[10px] font-black rounded-md transition-all ${!useHabitualVehicle ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400 hover:text-amber-500'}`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                  
                  {useHabitualVehicle && (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-blue-50">
                      <Car size={16} className="text-blue-500" />
                      <div>
                        <p className="text-xs font-bold text-navy-900">
                          {motoristas.find(m => m.id_motorista === selectedMotoristaId)?.conductores_habituales?.[0]?.vehiculo.marca} {motoristas.find(m => m.id_motorista === selectedMotoristaId)?.conductores_habituales?.[0]?.vehiculo.modelo}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                          Placa: {motoristas.find(m => m.id_motorista === selectedMotoristaId)?.conductores_habituales?.[0]?.vehiculo.placa}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(!motoristas.find(m => m.id_motorista === selectedMotoristaId)?.conductores_habituales?.[0]?.vehiculo || !useHabitualVehicle) && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Vehículo a Asignar</label>
                    <select name="id_vehiculo" required className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-amber-500 rounded-2xl transition-all text-sm font-bold appearance-none">
                      <option value="">Seleccione otro vehículo</option>
                      {vehiculos.filter(v => v.estado === 'disponible').map(v => (
                        <option key={v.id_vehiculo} value={v.id_vehiculo}>{v.placa} - {v.marca} {v.modelo}</option>
                      ))}
                    </select>
                  </div>
                  {motoristas.find(m => m.id_motorista === selectedMotoristaId)?.conductores_habituales?.[0]?.vehiculo && !useHabitualVehicle && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                      <label className="text-[10px] font-black uppercase text-amber-500 ml-1">Justificación del Cambio</label>
                      <textarea
                        name="justificacion_cambio_vehiculo"
                        required
                        placeholder="Especifique el motivo por el cual no se utilizará el vehículo habitual..."
                        className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-amber-500 rounded-2xl transition-all text-sm font-medium resize-none"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              )}

              <footer className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 px-6 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 px-6 bg-[#1a73e8] text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-500/20 hover:bg-[#174ea6] transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    <>
                      <CheckCircle size={18} />
                      <span>Aprobar y Programar</span>
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
