-- =============================================================
--  rnpn_vehiculos_final — DDL aditivo (multi-destino + emergencia)
--  Ejecutar sobre rnpn_vehiculos_final tras importar esquema + maestros.
--  No backfill de misiones (tablas transaccionales vacías).
-- =============================================================

USE rnpn_vehiculos_final;

ALTER TABLE mision
  ADD COLUMN es_emergencia TINYINT(1) NOT NULL DEFAULT 0
    AFTER observaciones_mision;

CREATE TABLE destino_mision (
  id_destino_mision INT NOT NULL AUTO_INCREMENT,
  id_mision         INT NOT NULL,
  id_area_destino   INT NULL,
  nombre_destino    VARCHAR(255) NOT NULL,
  orden_visita      INT NOT NULL,
  PRIMARY KEY (id_destino_mision),
  UNIQUE KEY uq_destino_mision_orden (id_mision, orden_visita),
  KEY idx_destino_mision_area (id_area_destino),
  CONSTRAINT destino_mision_id_mision_fkey
    FOREIGN KEY (id_mision) REFERENCES mision(id_mision)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT destino_mision_id_area_fkey
    FOREIGN KEY (id_area_destino) REFERENCES area_destino(id_area)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE log_movimientos_mision
  ADD COLUMN id_destino_mision INT NULL AFTER id_mision,
  ADD KEY log_movimientos_id_destino_mision_fkey (id_destino_mision),
  ADD CONSTRAINT log_movimientos_id_destino_mision_fkey
    FOREIGN KEY (id_destino_mision) REFERENCES destino_mision(id_destino_mision)
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO unidad_organizativa (nombre_unidad)
SELECT 'Base/Parqueo de Vehículos'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM unidad_organizativa
  WHERE nombre_unidad = 'Base/Parqueo de Vehículos'
);

INSERT INTO area_destino (nombre_area, alias, tipo, activo) VALUES
('Anexo No. 9 CCOPEFA', 'Anexo 9', 'institucional', 1),
('Duicentro Santa Tecla', NULL, 'externa', 1),
('Duicentro Soyapango centro', NULL, 'externa', 1),
('Duicentro Salvador del Mundo', NULL, 'externa', 1),
('Duicentro Galerias', NULL, 'externa', 1),
('Duicentro Plaza Centro', NULL, 'externa', 1),
('Oficinas MB', NULL, 'institucional', 1);
