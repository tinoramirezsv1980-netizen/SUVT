-- =============================================================
--  RNPN — Migración: Motorista con múltiples vehículos
--  Permite que un motorista tenga más de una misión por día
-- =============================================================

USE rnpn_vehiculos;

-- Quitar la restricción UNIQUE que impide múltiples misiones por día
ALTER TABLE asignacion_diaria DROP INDEX uq_motorista_fecha;
