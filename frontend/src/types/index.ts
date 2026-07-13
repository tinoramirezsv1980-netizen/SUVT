export type RolUsuario = 'admin' | 'auxiliar' | 'seguridad' | 'jefatura';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  id_motorista?: number | null;
  activo: boolean;
}

export interface Vehiculo {
  id_vehiculo: number;
  placa: string;
  marca: string;
  modelo: string;
  anio?: number;
  clase?: string;
  tipo: 'pickup' | 'sedan' | 'microbus' | 'motocicleta' | 'otro';
  estado: 'disponible' | 'en_uso' | 'mantenimiento' | 'baja';
  kilometraje_actual: number;
  numero_hoja_transporte?: string;
}

export interface ConductorHabitual {
  id_conductor_hab: number;
  id_motorista: number;
  id_vehiculo: number;
  fecha_inicio: string;
  activo: boolean;
  vehiculo: Vehiculo;
}

export interface Motorista {
  id_motorista: number;
  nombre: string;
  apellido: string;
  codigo_empleado: string;
  numero_licencia?: string;
  estado: 'activo' | 'inactivo' | 'destaque' | 'baja' | 'compensatorio' | 'incapacitado';
  conductores_habituales?: ConductorHabitual[];
}

export interface UnidadOrganizativa {
  id_unitat: number;
  nombre_unidad: string;
  id_jefe_usuario?: number;
  jefe?: Usuario;
}

export type EstadoMision = 'solicitada' | 'aprobada' | 'rechazada' | 'en_curso' | 'finalizada';

export interface Mision {
  id_mision: number;
  id_usuario_solicitante: number;
  id_unidad: number;
  id_vehiculo?: number | null;
  id_motorista?: number | null;
  objetivo_mision?: string;
  persona_mision?: string;
  destino?: string;
  fecha_mision: string;
  hora_mision: string;
  descripcion_mision: string;
  estado_mision: EstadoMision;
  fecha_solicitud: string;
  documento_respaldo?: string;
  justificacion_cambio_vehiculo?: string;
  kilometraje_inicial?: number;
  kilometraje_final?: number;
  observaciones_mision?: string;
  solicitante?: Usuario;
  unidad?: UnidadOrganizativa;
  vehiculo?: Vehiculo;
  motorista?: Motorista;
  movimientos?: LogMovimientoMision[];
  controles_acceso?: ControlAccesoSeguridad[];
}

export interface LogMovimientoMision {
  id_log: number;
  id_mision: number;
  tipo_evento: 'salida_base' | 'llegada_destino' | 'salida_destino' | 'parada_tecnica' | 'incidente' | 'retorno_base' | 'finalizacion';
  ubicacion: string;
  fecha_hora: string;
  kilometraje_registro?: number;
  nivel_combustible?: 'E' | '1/4' | '1/2' | '3/4' | 'F';
}

export interface ControlAccesoSeguridad {
  id_control: number;
  id_mision: number;
  id_usuario_seguridad: number;
  tipo_movimiento: 'salida_base' | 'entrada_base';
  fecha_hora: string;
  observaciones?: string;
  seguridad?: { nombre: string };
}

export interface AuthResponse {
  ok: boolean;
  data: {
    token: string;
    usuario: Usuario;
  };
  error?: string;
}

/** @deprecated Modelo temporal durante migracion a Mision */
export interface Asignacion {
  id_asignacion: number;
  id_motorista?: number;
  id_vehiculo?: number;
  fecha: string;
  dia_semana: string;
  tipo_actividad: string;
  mision?: string;
  objetivo_mision?: string;
  hora_salida?: string | null;
  estado: EstadoMision;
  unidad_solicitante?: string;
  destino?: string;
  area_destino?: { nombre_area: string };
  kilometraje_retorno?: number;
  hoja_transporte_rnpn?: string;
  aplica_vales?: boolean;
  detalle_vales?: string;
  id_semana?: number;
  motorista: Motorista;
  vehiculo?: Vehiculo;
}
