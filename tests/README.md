# Pruebas locales de permisos, guardado y notificaciones

Requieren Node.js 24 o posterior. Ejecutar desde la raíz del proyecto:

```sh
node --test tests/*.test.cjs
npm run lint
npm run build
```

Las pruebas usan `node:test`, `node:vm` y la eliminación de tipos TypeScript incluida en Node. No requieren paquetes adicionales, credenciales ni acceso a red.

`notification-authorization.test.cjs` ejecuta el handler real de la función Edge con Auth y base de datos simulados. `report-persistence.test.cjs` ejecuta los manejadores de persistencia y de interfaz extraídos del código, con dependencias en memoria.

Verifican los casos de autorización, datos inconsistentes, confirmación de guardado, errores y clics repetidos. No montan React ni ejecutan PostgreSQL/RLS, Deno, cron o push reales. Las verificaciones de integración y dispositivos requieren un entorno y destinatarios de prueba acordados; no se debe usar producción como entorno de pruebas implícito.

`notification-counter.test.cjs` ejecuta el proveedor de notificaciones con hooks simulados y actualizaciones de estado diferidas. Cubre duplicados, carga inicial concurrente con Realtime, lectura individual/todas, restauración ante fallo y cierre de sesión. No reemplaza una prueba en navegador con React real.

`push-subscription.test.cjs` prueba estado verificado por cuenta, activación, renovación explícita, limpieza parcial, reintentos y esperas acotadas con navegador y base de datos simulados. `push-profile.test.cjs` prueba los manejadores del perfil y el consumo del evento de renovación, incluidos resultados tardíos de otra cuenta y cierre de sesión tras fallos de limpieza. No envían push reales ni abren diálogos de permisos.

`push-targets.test.cjs` ejecuta el emisor real con autenticación, suscripciones y transporte push simulados. Comprueba el rechazo de destinos ausentes, vacíos o malformados sin consultar destinatarios ni enviar; también verifica los tres filtros admitidos, su intersección, la suscripción directa, la normalización de listas y los destinos sin coincidencias. No ejecuta el runtime Deno ni comprueba entrega real.
