import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Car, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2,
  CheckCircle2,
  Gauge
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import type { Mision } from '../types';

export default function ControlSeguridad() {
  const { user } = useAuth();
  const [misiones, setMisiones] = useState<Mision[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMision, setSelectedMision] = useState<Mision | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<'salida_base' | 'entrada_base'>('salida_base');

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await api.get('misiones');
      // Filtrar misiones que están aprobadas (para salida) o en curso (para entrada)
      setMisiones(resp.data.misiones.filter((m: Mision) => 
        m.estado_mision === 'aprobada' || m.estado_mision === 'en_curso'
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

  const handleOpenModal = (mision: Mision, tipo: 'salida_base' | 'entrada_base') => {
    setSelectedMision(mision);
    setTipoMovimiento(tipo);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMision) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const data = {
      id_mision: selectedMision.id_mision,
      id_usuario_seguridad: user?.id,
      tipo_movimiento: tipoMovimiento,
      observaciones: formData.get('observaciones')
    };

    try {
      await api.post('misiones/access', data);
      fetchData();
      setIsModalOpen(false);
      setSelectedMision(null);
    } catch (error) {
      console.error('Error registering access:', error);
      alert('Error al registrar el movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-3xl font-black text-[#1a73e8]">Control de Accesos</h1>
        <p className="text-gray-500 font-medium">Registro de entradas y salidas de vehículos (Seguridad)</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Columna Salidas */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-100 rounded-[2rem]">
            <ArrowUpRight className="text-amber-500" />
            <h2 className="text-lg font-black text-amber-900 uppercase tracking-tight">Pendientes de Salida</h2>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-gray-300 mx-auto" />
            ) : misiones.filter(m => m.estado_mision === 'aprobada').length === 0 ? (
              <p className="text-center py-10 text-gray-400 font-medium bg-gray-50 rounded-[2rem] border border-dashed">Sin salidas programadas</p>
            ) : misiones.filter(m => m.estado_mision === 'aprobada').map(m => (
              <div key={m.id_mision} className="glass p-6 rounded-[2rem] border border-white/40 shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 font-black">
                    <Car size={24} />
                  </div>
                  <div>
                    <p className="font-black text-[#174ea6]">{m.vehiculo?.placa || 'SIN PLACA'}</p>
                    <p className="text-xs text-gray-500 font-bold uppercase">{m.motorista?.nombre} {m.motorista?.apellido}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenModal(m, 'salida_base')}
                  className="px-6 py-3 bg-amber-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95"
                >
                  REGISTRAR SALIDA
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Entradas */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 border border-emerald-100 rounded-[2rem]">
            <ArrowDownLeft className="text-emerald-500" />
            <h2 className="text-lg font-black text-emerald-900 uppercase tracking-tight">Misiones en Curso (Entrada)</h2>
          </div>

          <div className="space-y-4">
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-gray-300 mx-auto" />
            ) : misiones.filter(m => m.estado_mision === 'en_curso' && !m.controles_acceso?.some(c => c.tipo_movimiento === 'entrada_base')).length === 0 ? (
              <p className="text-center py-10 text-gray-400 font-medium bg-gray-50 rounded-[2rem] border border-dashed">No hay misiones activas fuera de base</p>
            ) : misiones.filter(m => m.estado_mision === 'en_curso' && !m.controles_acceso?.some(c => c.tipo_movimiento === 'entrada_base')).map(m => (
              <div key={m.id_mision} className="glass p-6 rounded-[2rem] border border-white/40 shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-black">
                    <Car size={24} />
                  </div>
                  <div>
                    <p className="font-black text-[#174ea6]">{m.vehiculo?.placa || 'SIN PLACA'}</p>
                    <p className="text-xs text-gray-500 font-bold uppercase">{m.motorista?.nombre} {m.motorista?.apellido}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenModal(m, 'entrada_base')}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
                >
                  REGISTRAR ENTRADA
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && selectedMision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <header className={`p-8 pb-4 flex justify-between items-center border-b border-gray-50 ${tipoMovimiento === 'salida_base' ? 'bg-amber-50/50' : 'bg-emerald-50/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tipoMovimiento === 'salida_base' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-tight">
                    {tipoMovimiento === 'salida_base' ? 'Registro de Salida' : 'Registro de Entrada'}
                  </h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Misión #M-{selectedMision.id_mision}</p>
                </div>
              </div>
            </header>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Car size={20} className="text-[#1a73e8]" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#174ea6] uppercase">{selectedMision.vehiculo?.placa}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{selectedMision.vehiculo?.marca} {selectedMision.vehiculo?.modelo}</p>
                </div>
              </div>

              <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 space-y-3">
                <p className="text-sm font-bold text-blue-900 text-center">
                  ¿Confirma el paso del vehículo por seguridad?
                </p>
                <p className="text-[10px] text-blue-600 font-medium text-center uppercase tracking-widest">
                  Se registrará la fecha y hora actual automáticamente
                </p>
              </div>



              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Observaciones</label>
                <textarea 
                  name="observaciones" 
                  placeholder="Detalles sobre el estado del vehículo, personas a bordo, etc..."
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#1a73e8] rounded-2xl transition-all text-sm font-medium min-h-[100px] resize-none"
                />
              </div>

              <footer className="pt-6 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 px-6 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`flex-[2] py-4 px-6 text-white rounded-2xl text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2 ${
                    tipoMovimiento === 'salida_base' 
                      ? 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600' 
                      : 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600'
                  }`}
                >
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Confirmar Registro</span>
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
