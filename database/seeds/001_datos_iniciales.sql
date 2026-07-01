-- =============================================================
--  RNPN — Seeds iniciales para MySQL/XAMPP
--  Ejecutar DESPUÉS de 001_schema_mysql.sql
-- =============================================================

USE rnpn_vehiculos;

-- Motoristas
INSERT INTO motorista (nombre, apellido, codigo_empleado, numero_licencia, estado, fecha_ingreso) VALUES
  ('Alcides',   'Guerra',    'N8450',  'N8450',  'activo',   '2018-01-01'),
  ('Carlos',    'Saravia',   'N8367',  'N8367',  'inactivo', '2017-06-01'),
  ('Edwin',     'Olivares',  'N4657',  'N4657',  'activo',   '2015-03-01'),
  ('Carlos',    'Alfaro',    'CA001',  NULL,     'activo',   '2016-09-01'),
  ('Jerónimo',  'Rodríguez', 'N15989', 'N15989', 'activo',   '2020-02-01'),
  ('José',      'Evelio',    'N4656',  'N4656',  'activo',   '2015-03-01'),
  ('Everardo',  'Trujillo',  'EVT001', NULL,     'activo',   '2019-05-01'),
  ('Raúl',      'López',     'RAL001', NULL,     'activo',   '2018-11-01'),
  ('Yovani',    'Ascencio',  'YOV001', NULL,     'activo',   '2021-01-01'),
  ('José',      'Ramírez',   'JOS001', NULL,     'activo',   '2022-03-01');

-- Vehículos
INSERT INTO vehiculo (placa, marca, modelo, anio, tipo, color, estado, fecha_asignacion_rnpn) VALUES
  ('RNPN-01',   'Kia',        'Sportage',    2022, 'pickup',  'Blanco',   'disponible', '2022-01-10'),
  ('COUNTY-01', 'Kia',        'County',      2021, 'microbus','Blanco',   'disponible', '2021-06-15'),
  ('RNPN-02',   'Toyota',     'Hilux',       2023, 'pickup',  'Blanco',   'disponible', '2023-03-01'),
  ('RNPN-03',   'Mitsubishi', 'L200',        2020, 'pickup',  'Plateado', 'disponible', '2020-08-20'),
  ('RNPN-04',   'Toyota',     'Land Cruiser',2019, 'pickup',  'Blanco',   'disponible', '2019-11-05');

-- Conductores habituales
INSERT INTO conductor_habitual (id_motorista, id_vehiculo, fecha_inicio, turno, activo) VALUES
  (1, 1, '2024-01-01', 'diurno', 1),
  (3, 2, '2024-01-01', 'diurno', 1),
  (5, 3, '2024-01-01', 'diurno', 1),
  (6, 4, '2024-01-01', 'diurno', 1),
  (4, 5, '2024-01-01', 'diurno', 1);

-- Áreas / Destinos
INSERT INTO area_destino (nombre_area, alias, tipo, departamento, municipio) VALUES
  ('Archivo RNPN',                      'Archivo',       'interna',       'San Salvador', 'San Salvador'),
  ('Depósito 9 RNPN',                   'Depo 9',        'interna',       'San Salvador', 'San Salvador'),
  ('Administración RNPN',               'Admon',         'interna',       'San Salvador', 'San Salvador'),
  ('Jurídico RNPN',                     'Jurídico',      'interna',       'San Salvador', 'San Salvador'),
  ('Informática RNPN',                  'Informática',   'interna',       'San Salvador', 'San Salvador'),
  ('Comunicaciones RNPN',               'Comunicaciones','interna',       'San Salvador', 'San Salvador'),
  ('Financiero RNPN',                   'Financiero',    'interna',       'San Salvador', 'San Salvador'),
  ('Talento Humano RNPN',               'RRHH',          'interna',       'San Salvador', 'San Salvador'),
  ('Supervisión y Control RNPN',        'Sup y Control', 'interna',       'San Salvador', 'San Salvador'),
  ('Dirección Ejecutiva RNPN',          'Dir. Ejecutiva','interna',       'San Salvador', 'San Salvador'),
  ('DUIcentro Soyapango',               'Soyapango',     'interna',       'San Salvador', 'Soyapango'),
  ('DUIcentro Santa Tecla',             'Sta. Tecla',    'interna',       'La Libertad',  'Santa Tecla'),
  ('DUIcentro Mejicanos',               'Mejicanos',     'interna',       'San Salvador', 'Mejicanos'),
  ('DUIcentro Apopa',                   'Apopa',         'interna',       'San Salvador', 'Apopa'),
  ('DUIcentro Chalatenango',            'Chalatenango',  'interna',       'Chalatenango', 'Chalatenango'),
  ('DUIcentro San Miguel',              'San Miguel',    'interna',       'San Miguel',   'San Miguel'),
  ('DUIcentro Usulután',                'Usulután',      'interna',       'Usulután',     'Usulután'),
  ('DUIcentro Santa Ana',               'Sta. Ana',      'interna',       'Santa Ana',    'Santa Ana'),
  ('DUIcentro Ahuachapán',              'Ahuachapán',    'interna',       'Ahuachapán',   'Ahuachapán'),
  ('Kiosco Cancillería',                'Cancillería',   'interna',       'San Salvador', 'San Salvador'),
  ('Ministerio de Hacienda',            'Hacienda',      'institucional', 'San Salvador', 'San Salvador'),
  ('Corte Suprema de Justicia',         'CSJ',           'institucional', 'San Salvador', 'San Salvador'),
  ('Fiscalía General de la República',  'FGR',           'institucional', 'San Salvador', 'San Salvador'),
  ('Procuraduría General',              'PGR',           'institucional', 'San Salvador', 'San Salvador'),
  ('TSE',                               'TSE',           'institucional', 'San Salvador', 'San Salvador'),
  ('ISSS Santa Anita',                  'ISSS Sta. Anita','medica',       'San Salvador', 'San Salvador'),
  ('COOPEFA',                           'Coopefa',       'externa',       'San Salvador', 'San Salvador'),
  ('Gamaliel',                          'Gamaliel',      'externa',       'San Salvador', 'San Salvador'),
  ('GAMY',                              'GAMY',          'externa',       'San Salvador', 'San Salvador'),
  ('Taller España',                     'Taller España', 'externa',       'San Salvador', 'San Salvador'),
  ('Granja Penitenciaria de Ilobasco',  'Granja Ilobasco','penal',        'Cabañas',      'Ilobasco'),
  ('Ruta Santo Tomás',                  'Sto. Tomás',    'externa',       'San Salvador', 'Santo Tomás');

-- Usuario administrador inicial (contraseña: cambiar al primer acceso)
INSERT INTO usuario (nombre, correo, password_hash, rol) VALUES
  ('Administrador RNPN', 'admin@rnpn.gob.sv',
   '$2b$12$placeholder_cambiar_antes_produccion', 'admin');
