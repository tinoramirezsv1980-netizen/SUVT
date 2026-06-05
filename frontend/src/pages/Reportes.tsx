import { BarChart, FileText, Download, Printer } from 'lucide-react';

export default function Reportes() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-3xl font-black text-[#1a73e8]">Módulo de Reportes</h1>
        <p className="text-gray-500 font-medium">Generación de informes de trazabilidad y consumo</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Bitácora Mensual', desc: 'Resumen completo de misiones por mes', icon: FileText },
          { title: 'Consumo de Kilometraje', desc: 'Eficiencia y uso de flota por unidad', icon: BarChart },
          { title: 'Asistencias de Motoristas', desc: 'Puntualidad y cumplimiento de ruta', icon: Download },
        ].map((rep) => (
          <div key={rep.title} className="glass p-8 rounded-[2.5rem] group hover:bg-[#1a73e8] hover:text-white transition-all duration-300 shadow-sm hover:shadow-2xl">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#34A853] transition-colors">
              <rep.icon className="text-[#1a73e8] group-hover:text-white" size={20} />
            </div>
            <h3 className="text-xl font-black mb-2">{rep.title}</h3>
            <p className="text-sm font-medium text-gray-500 group-hover:text-gray-200 mb-8">{rep.desc}</p>
            
            <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1a73e8] group-hover:text-white">
              <Printer size={14} />
              Generar Documento
            </button>
          </div>
        ))}
      </div>

      <div className="glass p-20 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
         <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <BarChart className="text-gray-200" size={40} />
         </div>
         <h3 className="text-2xl font-black text-[#1a73e8] mb-2">Visualización Avanzada</h3>
         <p className="text-gray-400 max-w-sm mx-auto font-medium">Filtre los datos por fecha o departamento para visualizar tendencias en tiempo real.</p>
      </div>
    </div>
  );
}
