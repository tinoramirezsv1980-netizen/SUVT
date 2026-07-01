# TODO - Fix log_movimientos_mision (rol AUXILIAR)

- [x] Revisar rutas backend para `/misiones` y agregar middleware `validarJWT` (si faltara).
- [x] Corregir el flujo en `misiones.controller.ts` para que SIEMPRE se inserte en `log_movimientos_mision` cuando el formulario envía eventos de AUXILIAR.
- [x] Validar mapeos: `tipo_evento` -> `TipoEventoMision` y `nivel_combustible` -> `NivelCombustible`.
- [ ] Ejecutar pruebas manuales (crear movimiento) y verificar que se registren: `id_mision, tipo_evento, ubicacion, fecha_hora, kilometraje_registro, nivel_combustible`.
- [ ] (Opcional) Agregar logs/return detallado del error si la inserción falla.
