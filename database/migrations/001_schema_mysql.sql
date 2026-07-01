-- =============================================================
--  RNPN — Sistema de Control de Vehículos
--  Base de datos: MySQL 8.x (XAMPP)
--  Ejecutar en phpMyAdmin o en la consola MySQL
-- =============================================================

CREATE DATABASE IF NOT EXISTS rnpn_vehiculos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rnpn_vehiculos;

-- =============================================================
--  MOTORISTA
-- =============================================================
CREATE TABLE IF NOT EXISTS motorista (
  id_motorista        INT AUTO_INCREMENT PRIMARY KEY,
  nombre              VARCHAR(80)  NOT NULL,
  apellido            VARCHAR(80)  NOT NULL,
  codigo_empleado     VARCHAR(20)  NOT NULL UNIQUE,
  numero_licencia     VARCHAR(20)  DEFAULT NULL,
  categoria_licencia  VARCHAR(10)  DEFAULT NULL,
  dui                 VARCHAR(15)  DEFAULT NULL,
  telefono            VARCHAR(15)  DEFAULT NULL,
  correo              VARCHAR(120) DEFAULT NULL,
  estado              ENUM('activo','inactivo','destaque','baja') NOT NULL DEFAULT 'activo',
  fecha_ingreso       DATE         DEFAULT NULL,
  observaciones       TEXT         DEFAULT NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estado (estado),
  INDEX idx_nombre (nombre, apellido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
--  VEHICULO
-- =============================================================
CREATE TABLE IF NOT EXISTS vehiculo (
  id_vehiculo           INT AUTO_INCREMENT PRIMARY KEY,
  placa                 VARCHAR(20)  NOT NULL UNIQUE,
  marca                 VARCHAR(60)  NOT NULL,
  modelo                VARCHAR(60)  NOT NULL,
  anio                  SMALLINT     DEFAULT NULL,
  tipo                  ENUM('pickup','sedan','microbus','motocicleta','otro') NOT NULL DEFAULT 'pickup',
  color                 VARCHAR(40)  DEFAULT NULL,
  numero_motor          VARCHAR(40)  DEFAULT NULL,
  numero_chasis         VARCHAR(40)  DEFAULT NULL,
  estado                ENUM('disponible','en_uso','mantenimiento','baja') NOT NULL DEFAULT 'disponible',
  kilometraje_actual    INT          DEFAULT 0,
  fecha_asignacion_rnpn DATE         DEFAULT NULL,
  observaciones         TEXT         DEFAULT NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estado_v (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
--  CONDUCTOR_HABITUAL
-- =============================================================
CREATE TABLE IF NOT EXISTS conductor_habitual (
  id_conductor_hab  INT AUTO_INCREMENT PRIMARY KEY,
  id_motorista      INT  NOT NULL,
  id_vehiculo       INT  NOT NULL,
  fecha_inicio      DATE NOT NULL,
  fecha_fin         DATE DEFAULT NULL,
  turno             ENUM('diurno','nocturno','completo') NOT NULL DEFAULT 'diurno',
  activo            TINYINT(1) NOT NULL DEFAULT 1,
  observaciones     TEXT DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_motorista) REFERENCES motorista(id_motorista) ON DELETE RESTRICT,
  FOREIGN KEY (id_vehiculo)  REFERENCES vehiculo(id_vehiculo)   ON DELETE RESTRICT,
  INDEX idx_motorista_ch (id_motorista),
  INDEX idx_vehiculo_ch  (id_vehiculo),
  INDEX idx_activo_ch    (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
--  AREA_DESTINO
-- =============================================================
CREATE TABLE IF NOT EXISTS area_destino (
  id_area       INT AUTO_INCREMENT PRIMARY KEY,
  nombre_area   VARCHAR(120) NOT NULL,
  alias         VARCHAR(60)  DEFAULT NULL,
  tipo          ENUM('interna','institucional','externa','medica','penal','financiera') NOT NULL DEFAULT 'interna',
  departamento  VARCHAR(60)  DEFAULT NULL,
  municipio     VARCHAR(60)  DEFAULT NULL,
  descripcion   TEXT         DEFAULT NULL,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tipo_a  (tipo),
  INDEX idx_activo_a(activo),
  FULLTEXT idx_nombre_ft (nombre_area, alias)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
--  SEMANA
-- =============================================================
CREATE TABLE IF NOT EXISTS semana (
  id_semana        INT AUTO_INCREMENT PRIMARY KEY,
  fecha_inicio     DATE         NOT NULL,
  fecha_fin        DATE         NOT NULL,
  mes              TINYINT      GENERATED ALWAYS AS (MONTH(fecha_inicio)) STORED,
  anio             SMALLINT     GENERATED ALWAYS AS (YEAR(fecha_inicio))  STORED,
  numero_semana    TINYINT      GENERATED ALWAYS AS (WEEK(fecha_inicio, 1)) STORED,
  encargado_turno  VARCHAR(120) DEFAULT NULL,
  observaciones    TEXT         DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_semana_rango (fecha_inicio, fecha_fin),
  CONSTRAINT chk_semana_rango CHECK (fecha_fin >= fecha_inicio),
  INDEX idx_anio_mes (anio, mes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
--  ASIGNACION_DIARIA
-- =============================================================
CREATE TABLE IF NOT EXISTS asignacion_diaria (
  id_asignacion    INT AUTO_INCREMENT PRIMARY KEY,
  id_semana        INT  NOT NULL,
  id_motorista     INT  NOT NULL,
  id_vehiculo      INT  DEFAULT NULL,
  id_area_destino  INT  DEFAULT NULL,
  fecha            DATE NOT NULL,
  dia_semana       ENUM('lunes','martes','miercoles','jueves','viernes','sabado','domingo') NOT NULL,
  tipo_actividad   ENUM(
    'supervision_control','dui_ext','archivo','administrativo','juridico',
    'comunicaciones','financiero','talento_humano','informatica','clinica',
    'ruta','transporte_personal','activo_fijo','auditoria','innovacion',
    'genero','mantenimiento','mision_oficial','otro'
  ) NOT NULL DEFAULT 'administrativo',
  observaciones    TEXT         DEFAULT NULL,
  estado           VARCHAR(20)  NOT NULL DEFAULT 'programado',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_motorista_fecha (id_motorista, fecha),
  FOREIGN KEY (id_semana)       REFERENCES semana(id_semana)           ON DELETE RESTRICT,
  FOREIGN KEY (id_motorista)    REFERENCES motorista(id_motorista)      ON DELETE RESTRICT,
  FOREIGN KEY (id_vehiculo)     REFERENCES vehiculo(id_vehiculo)        ON DELETE SET NULL,
  FOREIGN KEY (id_area_destino) REFERENCES area_destino(id_area)        ON DELETE SET NULL,
  INDEX idx_asig_semana    (id_semana),
  INDEX idx_asig_motorista (id_motorista),
  INDEX idx_asig_vehiculo  (id_vehiculo),
  INDEX idx_asig_fecha     (fecha),
  INDEX idx_asig_tipo      (tipo_actividad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
--  NOVEDAD
-- =============================================================
CREATE TABLE IF NOT EXISTS novedad (
  id_novedad      INT AUTO_INCREMENT PRIMARY KEY,
  id_motorista    INT  NOT NULL,
  id_semana       INT  NOT NULL,
  fecha           DATE NOT NULL,
  tipo_novedad    ENUM(
    'incapacidad','permiso_personal','permiso_sin_goce','compensatorio',
    'asueto','mision_oficial','destaque','vacaciones','llegada_tarde',
    'ausencia_injustificada','renuncia','otro'
  ) NOT NULL,
  descripcion     TEXT       DEFAULT NULL,
  dias_afectados  TINYINT    DEFAULT 1,
  con_goce        TINYINT(1) DEFAULT 1,
  created_at      DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_motorista) REFERENCES motorista(id_motorista) ON DELETE RESTRICT,
  FOREIGN KEY (id_semana)    REFERENCES semana(id_semana)       ON DELETE RESTRICT,
  INDEX idx_nov_motorista (id_motorista),
  INDEX idx_nov_semana    (id_semana),
  INDEX idx_nov_tipo      (tipo_novedad),
  INDEX idx_nov_fecha     (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
--  USUARIO
-- =============================================================
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario     INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL,
  correo         VARCHAR(120) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  rol            ENUM('admin','supervisor','consulta') NOT NULL DEFAULT 'consulta',
  id_motorista   INT          DEFAULT NULL UNIQUE,
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  ultimo_acceso  DATETIME     DEFAULT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_motorista) REFERENCES motorista(id_motorista) ON DELETE SET NULL,
  INDEX idx_usuario_correo (correo),
  INDEX idx_usuario_rol    (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
