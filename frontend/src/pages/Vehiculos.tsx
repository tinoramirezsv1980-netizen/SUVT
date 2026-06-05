import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Car, 
  Pencil, 
  Trash2, 
  Loader2,
  X,
  Check,
  Gauge,
  Fuel,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import type { Vehiculo } from '../types';

export default function Vehiculos() {
  const { user } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/vehiculos');
      setVehiculos(resp.data.vehiculos);
    } catch (error) {
      console.error('Error fetching vehiculos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (vehiculo: Vehiculo | null = null) => {
    setSelectedVehiculo(vehiculo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedVehiculo(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries());
    const newKilometraje = parseInt(rawData.kilometraje_actual as string) || 0;
    
    // Validar: Si el kilometraje cambió, la hoja de transporte es requerida
    if (selectedVehiculo && selectedVehiculo.kilometraje_actual !== newKilometraje) {
      if (!rawData.numero_hoja_transporte) {
        alert('Debe ingresar el Número de Hoja de Transporte del RNPN para actualizar el kilometraje.');
        setIsSubmitting(false);
        return;
      }
    }

    const data = {
      ...rawData,
      kilometraje_actual: newKilometraje,
      anio: parseInt(rawData.anio as string) || new Date().getFullYear()
    };

    try {
      if (selectedVehiculo) {
        await api.patch(`/vehiculos/${selectedVehiculo.id_vehiculo}`, data);
      } else {
        await api.post('/vehiculos', data);
      }
      fetchData();
      handleCloseModal();
    } catch (error) {
      alert('Error al guardar vehículo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este vehículo?')) return;
    try {
      await api.delete(`/vehiculos/${id}`);
      fetchData();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const filtered = vehiculos.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1a73e8]">Gestión de Flota</h1>
          <p className="text-gray-500 font-medium">Control técnico y estatus de los vehículos institucionales</p>
        </div>
        {user?.rol === 'admin' && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-[#1a73e8] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-[#174ea6] transition-all active:scale-95"
          >
            <Plus size={18} className="text-[#34A853]" />
            <span>Registrar Vehículo</span>
          </button>
        )}
      </header>

      {/* Toolbox */}
      <div className="flex bg-white p-4 rounded-3xl border border-gray-100 shadow-sm items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por placa, marca o modelo..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-600 rounded-2xl transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-400 italic">No se encontraron vehículos registrados</div>
          ) : filtered.map((v) => (
            <div key={v.id_vehiculo} className="glass p-8 rounded-[2.5rem] flex flex-col justify-between group hover:shadow-2xl transition-all duration-300">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-blue-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-700/20 group-hover:rotate-6 transition-transform">
                    <Car className="text-emerald-500 w-7 h-7" />
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                    v.estado === 'disponible' ? 'bg-emerald-100 text-emerald-700' : 
                    v.estado === 'en_uso' ? 'bg-blue-700 text-white' : 'bg-red-100 text-red-700'
                  }`}>
                    {v.estado}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-[#1a73e8] leading-none mb-1">{v.marca} {v.modelo}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Placa: {v.placa}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Gauge size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-black text-gray-400 uppercase">Kilometraje</span>
                    </div>
                    <p className="text-sm font-black text-[#174ea6]">{v.kilometraje_actual?.toLocaleString()} KM</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Fuel size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-black text-gray-400 uppercase">Clase / Tipo</span>
                      <Info size={10} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-black text-navy-900">{v.clase || 'Institucional'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                {user?.rol === 'admin' ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenModal(v)}
                      className="p-3 hover:bg-blue-50 hover:text-[#1a73e8] rounded-xl transition-all text-gray-400"
                    >
                      <Pencil size={18} />
                    </button>
                  <button 
                    onClick={() => { setSelectedVehiculo(v); setIsModalOpen(true); }}
                    className="p-2 sm:p-3 hover:bg-blue-50 hover:text-[#1a73e8] rounded-xl transition-all text-gray-400"
                    title="Editar Vehículo"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(v.id_vehiculo)}
                    className="p-2 sm:p-3 hover:bg-red-500 hover:text-white rounded-xl transition-all text-gray-400"
                    title="Eliminar Vehículo"
                  >
                    <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-gray-300 italic">Solo Lectura</span>
                )}
                {v.kilometraje_actual >= 5000 && (
                  <div className="flex items-center gap-1.5 text-xs font-black text-red-500 animate-pulse">
                    <AlertTriangle size={14} />
                    <span>MANTENIMIENTO REQUERIDO</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
              <h2 className="text-2xl font-black text-[#1a73e8]">
                {selectedVehiculo ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
              </h2>
              <button onClick={handleCloseModal} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </header>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Número de Placa</label>
                  <input name="placa" defaultValue={selectedVehiculo?.placa} required placeholder="P123-456" className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Año</label>
                  <input name="anio" type="number" defaultValue={selectedVehiculo?.anio || 2024} required className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Marca</label>
                  <input name="marca" defaultValue={selectedVehiculo?.marca} required placeholder="Toyota, Mitsubishi..." className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Modelo</label>
                  <input name="modelo" defaultValue={selectedVehiculo?.modelo} required placeholder="Hilux, L200..." className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Clase de Vehículo</label>
                  <input name="clase" defaultValue={selectedVehiculo?.clase} placeholder="Liviano, Sedán, etc." className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Estatus Actual</label>
                  <select name="estado" defaultValue={selectedVehiculo?.estado || 'disponible'} className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold appearance-none">
                    <option value="disponible">Disponible</option>
                    <option value="en_uso">En Uso</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Kilometraje Actual</label>
                  <input name="kilometraje_actual" type="number" defaultValue={selectedVehiculo?.kilometraje_actual || 0} required className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">No. Hoja de Transporte RNPN</label>
                  <input name="numero_hoja_transporte" defaultValue={selectedVehiculo?.numero_hoja_transporte} placeholder="H-000..." className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                </div>
              </div>

              <footer className="pt-6 flex gap-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-4 px-6 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 px-6 bg-[#1a73e8] text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-500/20 hover:bg-[#174ea6] transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    <>
                      <Check size={18} className="text-[#34A853]" />
                      <span>{selectedVehiculo ? 'Guardar Cambios' : 'Registrar Vehículo'}</span>
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
