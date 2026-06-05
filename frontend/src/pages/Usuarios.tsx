import { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  Pencil, 
  Trash2, 
  Loader2,
  X,
  Check,
  Shield,
  Key,
  Mail,
  User,
  AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import type { Usuario } from '../types';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  
  // States for password reset
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [respUsers, respMot] = await Promise.all([
        api.get('/usuarios'),
        api.get('/motoristas')
      ]);
      setUsuarios(respUsers.data.usuarios.map((u: any) => ({
        id: u.id_usuario,
        nombre: u.nombre,
        correo: u.correo,
        rol: u.rol,
        activo: u.activo,
        id_motorista: u.id_motorista
      })));
      setMotoristas(respMot.data.motoristas || []);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (usuario: Usuario | null = null) => {
    setSelectedUsuario(usuario);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUsuario(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries());

    // Asegurar queactivo sea booleano
    const data = {
      ...rawData,
      activo: rawData.activo === 'true'
    };

    try {
      if (selectedUsuario) {
        await api.patch(`/usuarios/${selectedUsuario.id}`, data);
      } else {
        await api.post('/usuarios', data);
      }
      fetchData();
      handleCloseModal();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al guardar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;
    try {
      await api.delete(`/usuarios/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsuario) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/usuarios/${selectedUsuario.id}/reset-password`, {
        nuevaPassword: newPassword
      });
      alert('Contraseña actualizada correctamente');
      setIsResetModalOpen(false);
      setNewPassword('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al resetear contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.correo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1a73e8]">Gestión de Accesos</h1>
          <p className="text-gray-500 font-medium">Administre usuarios y niveles de permiso del sistema</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-[#1a73e8] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-[#174ea6] transition-all active:scale-95"
        >
          <UserPlus size={18} className="text-[#34A853]" />
          <span>Nuevo Usuario</span>
        </button>
      </header>

      {/* Toolbox */}
      <div className="flex bg-white p-4 rounded-3xl border border-gray-100 shadow-sm items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o correo..."
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
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuario</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rol / Permiso</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estatus</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-gray-400 italic">No se encontraron usuarios</td>
                </tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center font-black text-xs text-[#1a73e8] group-hover:bg-[#1a73e8] group-hover:text-white transition-all">
                        {u.nombre[0]}
                      </div>
                      <div>
                        <p className="font-black text-[#174ea6]">{u.nombre}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-gray-400 font-bold">{u.correo}</p>
                          {u.id_motorista && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">
                              Vinculado a Motorista
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className={u.rol === 'admin' ? 'text-emerald-500' : u.rol === 'jefatura' ? 'text-blue-500' : u.rol === 'seguridad' ? 'text-amber-500' : 'text-slate-400'} />
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        u.rol === 'admin' ? 'text-emerald-600' : u.rol === 'jefatura' ? 'text-blue-600' : u.rol === 'seguridad' ? 'text-amber-600' : 'text-slate-600'
                      }`}>
                        {u.rol === 'admin' ? 'Administrador' : u.rol === 'jefatura' ? 'Jefatura' : u.rol === 'seguridad' ? 'Seguridad' : 'Auxiliar (Lectura)'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                      u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        title="Editar Usuario"
                        className="p-2 hover:bg-blue-50 hover:text-[#1a73e8] rounded-xl transition-all text-gray-400"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedUsuario(u);
                          setIsResetModalOpen(true);
                        }}
                        title="Resetear Contraseña"
                        className="p-2 hover:bg-emerald-500 hover:text-white rounded-xl transition-all text-gray-400"
                      >
                        <Key size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        title="Eliminar Usuario"
                        className="p-2 hover:bg-red-500 hover:text-white rounded-xl transition-all text-gray-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
              <h2 className="text-2xl font-black text-[#1a73e8]">
                {selectedUsuario ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
              </h2>
              <button onClick={handleCloseModal} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </header>
            
            <form key={selectedUsuario?.id || 'new'} onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input name="nombre" defaultValue={selectedUsuario?.nombre} required placeholder="Ej: Juan Pérez" className="w-full pl-12 pr-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Correo Institucional</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input name="correo" type="email" defaultValue={selectedUsuario?.correo} required disabled={!!selectedUsuario} placeholder="usuario@rnpn.gob.sv" className="w-full pl-12 pr-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold disabled:opacity-50" />
                  </div>
                </div>

                {!selectedUsuario && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Contraseña Inicial</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input name="password" type="password" required placeholder="••••••••" className="w-full pl-12 pr-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Rol de Acceso</label>
                    <select name="rol" defaultValue={selectedUsuario?.rol || 'auxiliar'} className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold appearance-none">
                      <option value="admin">Administrador</option>
                      <option value="jefatura">Jefatura</option>
                      <option value="seguridad">Seguridad</option>
                      <option value="auxiliar">Auxiliar (Solo Lectura)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Estatus</label>
                    <select name="activo" defaultValue={selectedUsuario?.activo?.toString() || 'true'} className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold appearance-none">
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </div>

                {(selectedUsuario?.rol === 'auxiliar' || selectedUsuario?.rol === 'seguridad' || !selectedUsuario) && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Vincular a Motorista (Opcional)</label>
                    <select 
                      name="id_motorista" 
                      defaultValue={selectedUsuario?.id_motorista || ''} 
                      className="w-full px-5 py-4 bg-emerald-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold appearance-none"
                    >
                      <option value="">No vincular (Ninguno)</option>
                      {motoristas.map(m => (
                        <option key={m.id_motorista} value={m.id_motorista}>
                          {m.nombre} {m.apellido} - Cód: {m.codigo_empleado}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1 ml-1 italic">
                      * Necesario para que el usuario pueda ver sus misiones asignadas en su Dashboard.
                    </p>
                  </div>
                )}
              </div>

              {selectedUsuario?.rol === 'admin' && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={20} />
                  <p className="text-[10px] font-medium text-amber-800">
                    Está editando una cuenta administrativa. Asegúrese de mantener al menos un administrador activo en el sistema.
                  </p>
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
                      <span>{selectedUsuario ? 'Guardar Cambios' : 'Registrar Usuario'}</span>
                    </>
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-8 pb-4 flex justify-between items-center border-b border-gray-50">
              <h2 className="text-xl font-black text-navy-900">Resetear Contraseña</h2>
              <button onClick={() => setIsResetModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </header>
            <form onSubmit={handleResetPassword} className="p-8 space-y-6">
              <p className="text-xs font-medium text-gray-500 text-center">
                Asigne una nueva contraseña para <strong>{selectedUsuario?.nombre}</strong>.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nueva Contraseña</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Escriba la nueva contraseña..." 
                    className="w-full pl-12 pr-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-2xl transition-all text-sm font-bold" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting || !newPassword}
                className="w-full py-4 px-6 bg-emerald-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
