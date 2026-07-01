import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Función para parsear fechas de forma segura evitando problemas de zona horaria
 */
const formatDate = (dateStr: any, format: 'long' | 'short' = 'short', isOnlyDate: boolean = false) => {
  if (!dateStr) return '__________';
  
  const date = new Date(dateStr);
  
  if (isOnlyDate && typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const localDate = new Date(year, month, day);
      
      if (format === 'long') {
        return localDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return `${day}/${month + 1}/${year}`;
    }
  }

  if (format === 'long') {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return date.toLocaleDateString('es-ES');
};

const formatTime = (dateStr: any): string => {
  if (!dateStr) return '__________';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export const generateMisionPDF = async (mision: any) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'letter'
  });

  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  
  // Extraer datos de tablas relacionadas
  const movimientos = mision.movimientos || [];
  const controles = mision.controles_acceso || [];

  const llegadaMov = [...movimientos].reverse().find(
    (m: any) => m.tipo_evento === 'finalizacion' && m.ubicacion === 'Base (Cierre de misión)'
  );
  const hora_llegada = llegadaMov ? formatTime(llegadaMov.fecha_hora) : '__________';

  const entradaMov = [...movimientos].reverse().find(
    (m: any) => m.tipo_evento === 'finalizacion'
  );
  const hora_entrada = entradaMov ? formatTime(entradaMov.fecha_hora) : '__________';

  const controlEntrada = [...controles].reverse().find(
    (c: any) => c.tipo_movimiento === 'entrada_base'
  );
  const observaciones = controlEntrada?.observaciones || '';
  
  // --- ENCABEZADO ---
  // Logo RNPN (Texto estilizado)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(20, 40, 100);
  doc.text('RNPN', margin, 20);
  
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Registro Nacional de las', margin, 24);
  doc.text('Personas Naturales', margin, 27);

  // Logo Gobierno de El Salvador (Imagen proporcionada, más pequeña y a la derecha del texto)
  try {
    doc.addImage('/LOGO_ES.jpg', 'JPEG', 60, 11, 22, 16);
  } catch (e) {
    console.error('No se pudo cargar el logo LOGO_ES.jpg');
  }

  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('DEPARTAMENTO DE SEGURIDAD Y', pageWidth - margin, 18, { align: 'right' });
  doc.text('TRANSPORTE', pageWidth - margin, 22, { align: 'right' });

  // --- TÍTULO PRINCIPAL ---
  doc.setFontSize(16);
  doc.text('MISIÓN OFICIAL', pageWidth / 2, 36, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(margin, 38, pageWidth - margin, 38);

  // --- SECCIÓN 1: DATOS DE LA MISIÓN ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // San Salvador, [fecha_solicitud]
  const fechaSol = formatDate(mision.fecha_solicitud, 'long');
  doc.text(`San Salvador, ${fechaSol}`, margin, 45);
  doc.line(margin + 25, 46, margin + 110, 46);

  // Fecha de Misión y Horas (Alineados en una sola línea)
  const fechaMis = formatDate(mision.fecha_mision, 'short', true);
  doc.text(`Fecha de Misión: ${fechaMis}`, margin, 52);
  doc.line(margin + 28, 53, margin + 75, 53);
  
  doc.text(`Hora de salida: ${mision.hora_mision || '__________'}`, margin + 80, 52);
  doc.line(margin + 105, 53, margin + 130, 53);
  
  doc.text('Hora de llegada: __________', margin + 135, 52);
  doc.text(hora_llegada, margin + 165, 52);
  doc.line(margin + 163, 53, pageWidth - margin, 53);

  // Lugar de Visita
  doc.text('Lugar de Visita:', margin, 60);
  doc.line(margin + 25, 61, pageWidth - margin, 61);
  doc.setFontSize(9);
  doc.text(mision.destino || '', margin + 27, 60);
  doc.line(margin, 67, pageWidth - margin, 67);
  doc.line(margin, 73, pageWidth - margin, 73);

  // Propósito de Visita
  doc.setFontSize(10);
  doc.text('Propósito de Visita:', margin, 81);
  doc.line(margin + 32, 82, pageWidth - margin, 82);
  doc.setFontSize(9);
  doc.text(mision.objetivo_mision || '', margin + 35, 81);
  doc.line(margin, 88, pageWidth - margin, 88);
  doc.line(margin, 94, pageWidth - margin, 94);

  // Personas que Realizan Misión
  doc.setFontSize(10);
  doc.text('Personas que Realizan Misión:', margin, 102);
  doc.line(margin + 50, 103, pageWidth - margin, 103);
  doc.setFontSize(9);
  doc.text(mision.persona_mision || '', margin + 53, 102);
  doc.line(margin, 109, pageWidth - margin, 109);
  doc.line(margin, 115, pageWidth - margin, 115);

  // --- SECCIÓN 2: UNIDAD SOLICITANTE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  // Título fijo con nombre de unidad centrado
  doc.setFontSize(10);
  doc.text(`DIRECCION / UNIDAD QUE SOLICITA LA MISION: ${mision.unidad?.nombre_unidad || ''}`, pageWidth / 2, 125, { align: 'center' });
  
  doc.rect(margin, 128, pageWidth - (margin * 2), 25);
  doc.setFontSize(10);
  doc.text('Firma Autorización', margin + 5, 138);
  doc.rect(margin + 40, 131, 40, 14);
  
  doc.text('Sello', margin + 95, 138);
  doc.rect(margin + 110, 131, 50, 14);
  
  // Nombre del solicitante desde tabla usuario (viene en mision.solicitante)
  doc.text(`Nombre de Solicitante : ${mision.solicitante?.nombre || ''}`, margin + 5, 150);

  // --- SECCIÓN 3: SOLICITUD DE TRANSPORTE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SOLICITUD DE TRANSPORTE', pageWidth / 2, 158, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Hora:', margin, 166);
  doc.rect(margin + 25, 162, 40, 6);
  doc.text(mision.hora_mision || '', margin + 27, 166);
  
  doc.text('Placa:', margin + 100, 166);
  doc.rect(margin + 115, 162, 40, 6);
  doc.text(mision.vehiculo?.placa || '', margin + 117, 166);

  doc.text('Fecha:', margin, 175);
  doc.rect(margin + 25, 171, 40, 6);
  doc.text(fechaMis, margin + 27, 175);
  
  doc.text('Marca:', margin + 100, 175);
  doc.rect(margin + 115, 171, 40, 6);
  doc.text(mision.vehiculo?.marca || '', margin + 117, 175);

  doc.text('Motorista:', margin, 184);
  doc.rect(margin + 25, 180, 130, 6);
  doc.text(mision.motorista ? `${mision.motorista.nombre} ${mision.motorista.apellido}` : '', margin + 27, 184);

  doc.text('Kilometraje Inicial:', margin, 193);
  doc.rect(margin + 38, 189, 60, 6);
  doc.text(mision.kilometraje_inicial?.toString() || '', margin + 40, 193);
  
  doc.text('Kilometraje Final:', margin, 202);
  doc.rect(margin + 38, 198, 60, 6);
  doc.text(mision.kilometraje_final?.toString() || '', margin + 40, 202);

  doc.setFontSize(9);
  doc.text('Firma Autorización Jefe', margin, 213);
  doc.text('de Seguridad y', margin, 217);
  doc.text('Transporte', margin, 221);
  doc.rect(margin + 38, 208, 40, 20);
  
  doc.text('Sello de', margin + 85, 213);
  doc.text('Seguridad y', margin + 85, 217);
  doc.text('Transporte', margin + 85, 221);
  doc.rect(margin + 105, 208, 40, 20);

  // --- SECCIÓN 4: RESERVADO SEGURIDAD ---
  doc.setFillColor(230, 230, 240);
  doc.rect(margin, 236, pageWidth - (margin * 2), 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Reservado para Seguridad RNPN', pageWidth / 2, 240.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Hora de Salida: __________', margin, 249);
  doc.text(mision.hora_mision || '', margin + 26, 249);
  doc.text('Hora de Entrada: __________', margin + 70, 249);
  doc.text(hora_entrada, margin + 96, 249);
  
  doc.text('Observaciones: __________________________________________________________________________', margin, 256);
  doc.text(observaciones, margin + 23, 256);
  doc.text('Nombre de Seguridad: _____________________________________________', margin, 262);
  doc.text('Firma: __________', pageWidth - margin - 30, 262);

  // --- GENERACIÓN ---
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl, '_blank');
  
  if (!printWindow) {
    doc.save(`Mision_Oficial_${mision.id_mision}.pdf`);
  }
};
