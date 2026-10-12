-- 004_documentos_respaldo_text.sql
-- Amplia la columna de documentos a TEXT.
-- No destructivo: TEXT admite todo lo que cabia en VARCHAR(255).
-- Solo se aplica a rnpn_vehiculos_final. rnpn_vehiculos_nueva queda intacta.
USE rnpn_vehiculos_final;

ALTER TABLE mision
  MODIFY COLUMN documento_respaldo TEXT NULL;
