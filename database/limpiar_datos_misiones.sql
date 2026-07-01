-- Script para limpiar inconsistencias y reiniciar datos de misiones
-- Base de datos: rnpn_vehiculos_nueva

USE rnpn_vehiculos_nueva;

-- 1. Desactivar chequeo de llaves foráneas para permitir truncado limpio
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Limpiar tablas de movimientos y registros relacionados
TRUNCATE TABLE log_movimientos_mision;
TRUNCATE TABLE control_acceso_seguridad;
TRUNCATE TABLE registro_combustible;

-- 3. Limpiar tabla principal de misiones
TRUNCATE TABLE mision;

-- 4. Asegurar que todos los vehículos vuelvan a estado 'disponible'
UPDATE vehiculo SET estado = 'disponible';

-- 5. Reactivar chequeo de llaves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- 6. Intentar limpiar rastro de base de datos huérfana en el diccionario InnoDB
DROP DATABASE IF EXISTS test_import_verify_db;

SELECT 'Limpieza completada exitosamente. Todas las misiones han sido borradas y los vehiculos estan disponibles.' AS Resultado;
