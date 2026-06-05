import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Car, Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import type { AuthResponse } from '../types';

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const resp = await api.post<AuthResponse>('auth/login', {
        correo: data.correo,
        password: data.password
      });
      
      if (resp.data.ok) {
        login(resp.data.data.token, resp.data.data.usuario);
        navigate('/dashboard');
      } else {
        setErrorMsg(resp.data.error || 'Credenciales inválidas');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-sans">
      {/* Elementos decorativos animados */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="hidden md:block absolute -top-20 -right-20 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="hidden md:block absolute -top-20 -right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="hidden md:block absolute top-40 -left-20 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-4 md:p-1">
        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(15,23,42,0.15)] border border-white p-6 sm:p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-[#1a73e8] rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 transform -rotate-6">
              <Car className="text-[#34A853] w-12 h-12" />
            </div>
            <div className="mt-6 text-center">
              <h1 className="text-3xl font-black text-[#1a73e8] tracking-tight">Trazabilidad RNPN</h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="h-px w-8 bg-gray-200"></span>
                <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-bold">Control de Vehículos</p>
                <span className="h-px w-8 bg-gray-200"></span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl text-xs font-bold animate-shake">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-[#1a73e8] uppercase ml-1 opacity-70">Correo Institucional</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
                  <Mail className="h-5 w-5 text-gray-300 group-focus-within:text-emerald-500" />
                </div>
                <input
                  type="email"
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 border-transparent focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 rounded-2xl transition-all duration-300 placeholder:text-gray-300 placeholder:font-medium"
                  placeholder="usuario@rnpn.gob.sv"
                  {...register("correo", { required: true })}
                />
              </div>
              {errors.correo && <span className="text-[10px] text-red-500 font-bold ml-1">Campo requerido *</span>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-[#1a73e8] uppercase ml-1 opacity-70">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-300 group-focus-within:text-emerald-500" />
                </div>
                <input
                  type="password"
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50/50 border-2 border-transparent focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 rounded-2xl transition-all duration-300 placeholder:text-gray-300"
                  placeholder="••••••••"
                  {...register("password", { required: true })}
                />
              </div>
              {errors.password && <span className="text-[10px] text-red-500 font-bold ml-1">Campo requerido *</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-5 px-4 rounded-3xl shadow-xl shadow-blue-500/10 text-sm font-black text-white bg-[#1a73e8] hover:bg-[#174ea6] focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:grayscale"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>Autenticar Sistema</span>
                </div>
              )}
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} RNPN — Dirección de Tecnología
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
}
