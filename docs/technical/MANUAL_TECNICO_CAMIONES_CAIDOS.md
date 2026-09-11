# CAMIONES CAÍDOS — MANUAL TÉCNICO DE ARQUITECTURA, DESPLIEGUE Y RECUPERACIÓN
**Plataforma:** Camiones Caídos — Control de Flotas en Campo  
**Operaciones:** Mina Pribbenow & Mina El Descanso • Drummond Ltd. Colombia  
**Versión Documental:** 1.0  
**Fecha:** 10 de septiembre de 2026  
**Público Objetivo:** Ingenieros de Software, DevOps, Soporte Nivel 3 y Responsable Técnico  

---

## 1. RESUMEN DE ARQUITECTURA
La solución Camiones Caídos implementa una arquitectura desacoplada Single Page Application (SPA) orientada a la máxima resiliencia en terreno minero:

- **Frontend SPA:** Construido con React 19 y empaquetado con Vite 8. Aloja la lógica de presentación, cálculo de KPIs en memoria y renderizado gráfico adaptativo. Se distribuye mediante la CDN de Vercel con integración PWA para trabajo offline en tajos.
- **Backend as a Service (BaaS):** Supabase Cloud proporciona el motor PostgreSQL 15, el subsistema de autenticación GoTrue y la seguridad declarativa en capa de datos mediante Row Level Security (RLS).
- **Capa Serverless Edge:** Tres Edge Functions en Deno TypeScript asumen la ejecución de operaciones privilegiadas de administración de usuarios y claves bajo el principio de menor privilegio.

---

## 2. STACK TECNOLÓGICO Y VERSIONES VERIFICADAS

| Tecnología / Paquete | Versión Verificada | Rol Arquitectónico |
| :--- | :---: | :--- |
| **React / React DOM** | `19.2.8` | Librería base de componentes y renderizado reactivo |
| **Vite** | `8.2.0` | Servidor de desarrollo y bundler de producción (Rollup 4) |
| **@supabase/supabase-js** | `2.109.0` | SDK cliente para conexión a PostgreSQL, Auth y Storage |
| **vite-plugin-pwa / Workbox** | `1.3.0 / v7` | Generación de Service Worker y precaching offline |
| **jspdf / jspdf-autotable** | `4.2.1 / 5.0.8` | Motor cliente para exportación ejecutiva de informes PDF |
| **xlsx** | `0.18.5` | Generación de hojas de cálculo de doble pestaña en navegador |
| **oxlint** | `1.75.0` | Linter estático de alto rendimiento en Rust (0 errores) |
| **Supabase Cloud** | PostgreSQL 15+ | Motor de base de datos relacional y servidor GoTrue |
| **Vercel** | Serverless Edge | Alojamiento del frontend y entrega HTTPS global con rewrites SPA |

---

## 3. ESTRUCTURA DEL PROYECTO
```text
camiones-caidos-app/
├── package.json / vite.config.js / vercel.json
├── supabase_schema.sql         # DDL oficial, RLS, triggers y funciones helper
├── supabase/functions/         # Edge Functions en Deno TypeScript
│   ├── admin-create-user/      # Aprovisionamiento atómico
│   ├── admin-reset-password/   # Reseteo a clave temporal con backoff
│   └── admin-delete-user/      # Purga coordinada con protecciones
└── src/
    ├── main.jsx / App.jsx / index.css
    ├── lib/supabase.js         # Cliente singleton @supabase/supabase-js
    ├── context/
    │   ├── AuthContext.jsx     # GoTrue, derivación técnica y offline fallback
    │   └── ReportContext.jsx   # Estado de reportes, operadores y caché
    ├── components/
    │   ├── Layout/             # Navbar, MobileNav.jsx, LiquidLensCanvas.jsx
    │   ├── Management/         # UserManager.jsx, OperatorManager.jsx
    │   ├── Forms/              # TruckReportModal.jsx (captura y edición)
    │   ├── Reports/            # GlobalHistory.jsx, TruckHistoryModal.jsx
    │   └── Dashboard/          # FleetMetrics, StatusCards, SystemBreakdown
    └── utils/                  # pdfUtils.js, exportUtils.js, dateUtils.js
```

---

## 4. FLUJO DE AUTENTICACIÓN
La autenticación desacopla las credenciales de los datos operacionales de aplicación:

- `auth.users` (GoTrue): Custodia contraseñas mediante hashing seguro y emite tokens JWT firmados.
- `public.app_users`: Almacena perfil, rol, sede, grupo y la bandera `must_change_password`, enlazados mediante `auth_user_id` (UUID).
- **Derivación de Email Técnico:** En el login, el usuario ingresa su cédula. El sistema deriva el email canónico determinista:
  ```javascript
  const nationalIdToTechnicalEmail = (id) => `${cleanNationalId(id)}@camionescaidos.internal`;
  ```
- **Sesión:** Manejada por Supabase SDK con refresco automático de token.
- **Logout:** `supabase.auth.signOut()` purga tokens y limpia caché local.

---

## 5. MODELO DE DATOS RELACIONAL Y ESQUEMA DDL
```sql
-- Perfiles de aplicación enlazados a auth.users
CREATE TABLE public.app_users (
    id TEXT PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Encargado',
    mine TEXT NOT NULL DEFAULT 'Pribbenow',
    group_name TEXT NOT NULL DEFAULT 'Grupo 1',
    must_change_password BOOLEAN DEFAULT TRUE,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    auth_user_id UUID UNIQUE
);

-- Censo centralizado de operadores
CREATE TABLE public.operators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mine TEXT NOT NULL DEFAULT 'Pribbenow',
    group_name TEXT NOT NULL DEFAULT 'Grupo 1',
    status TEXT DEFAULT 'Activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de novedades de camiones
CREATE TABLE public.truck_reports (
    id TEXT PRIMARY KEY,
    truck_id TEXT NOT NULL,
    mine TEXT NOT NULL,
    shift TEXT NOT NULL DEFAULT 'Diurno',
    operator TEXT,                      -- Snapshot textual histórico
    system TEXT,
    detail TEXT,
    location TEXT,
    status TEXT DEFAULT 'DOWN',
    down_time TEXT,
    estimated_return_time TEXT,
    actual_return_time TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    operator_id TEXT                    -- Clave foránea lógica a operators.id
);
```

---

## 6. RELACIONES ENTRE ENTIDADES
- `auth.users.id` (UUID) <---> `public.app_users.auth_user_id` (UUID, UNIQUE).
- `public.operators.id` (TEXT) <---> `public.truck_reports.operator_id` (TEXT).
- Integridad referencial lógica protegida a nivel de aplicación y consultas de análisis.

---

## 7. ARQUITECTURA RELACIONAL DUAL (operator_id + operator)
La tabla `truck_reports` implementa una arquitectura relacional dual intencional:

- `operator_id`: Clave foránea lógica que referencia a `operators.id`. Facilita análisis de recurrencia, cruces estadísticos y normalización.
- `operator`: Snapshot textual que captura la cadena literal del nombre al momento del reporte.
- **Razón de Diseño:** Proteger la inmutabilidad histórica. Si un operador es editado, corregido o dado de baja del censo, los reportes históricos conservan el valor original exacto. Adicionalmente, permite generar informes PDF/Excel en modo offline sin realizar consultas de join.

---

## 8. ROW LEVEL SECURITY (RLS) Y FUNCIONES HELPER
Row Level Security está habilitado en las tres tablas mediante 11 políticas activas y 3 funciones helper `SECURITY DEFINER` con `search_path = 'public'`:

```sql
CREATE FUNCTION public.get_auth_user_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT role FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE FUNCTION public.get_auth_user_mine() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT mine FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_users WHERE auth_user_id = auth.uid() AND role = 'Administrador');
$$;
```

**Trigger de Inmutabilidad:** La función `trg_protect_app_users_columns()` asociada a `BEFORE UPDATE ON public.app_users` prohíbe la alteración de `id`, `national_id`, `auth_user_id` y `created_at` para todos los llamantes, permitiendo bypass administrativo únicamente con el claim `service_role`.

---

## 9. SUPABASE EDGE FUNCTIONS (SERVERLESS DENO)
Ubicadas en `supabase/functions/` bajo Deno runtime:

1. **admin-create-user:**
   - Valida rol Administrador en base de datos.
   - Valida duplicados de cédula y email técnico (HTTP 409).
   - Crea usuario en Auth con clave temporal `caidos1234` e inserta en `app_users` con `must_change_password: true`.
   - **Rollback Compensatorio:** Si la inserción en base de datos falla, purga automáticamente la cuenta creada en Auth.
2. **admin-reset-password:**
   - Restablece la contraseña en Auth a `caidos1234`.
   - Actualiza `must_change_password = true` con hasta 3 reintentos exponenciales.
3. **admin-delete-user:**
   - Bloquea la autoeliminación del administrador conectado (HTTP 400).
   - Valida el conteo total de administradores; prohíbe eliminar al último administrador del sistema (HTTP 400).
   - Elimina la cuenta en Auth y el registro de perfil en `app_users` de manera secuencial.

---

## 10. GESTIÓN DE SESIÓN OFFLINE
`AuthContext` maneja la resiliencia en terreno minero:
- Si falla el transporte de red, recupera el perfil validado de `localStorage['camiones_user_profile']` y mantiene la UI activa en modo lectura/consulta sin forzar `signOut()`.
- Al recuperar conexión activa (`window.addEventListener('online')`), revalida silenciosamente el perfil en Supabase Cloud.

---

## 11. ALMACENAMIENTO LOCAL (LOCALSTORAGE)
Inventario de claves seguras:
- `camiones_user_profile`: Snapshot JSON del perfil autenticado (sin contraseñas).
- `camiones_reports`: Caché local de los 347 reportes para consulta en campo.
- `camiones_operators`: Directorio local del censo de operadores.
- `camiones_mine`: Mina seleccionada actualmente en el filtro.
- `sb-<ref>-auth-token`: Token de sesión y refresh token custodiado por Supabase SDK.

---

## 12. PLATAFORMA PWA
- Configurada en `vite.config.js` mediante `vite-plugin-pwa`.
- Manifiesto: Nombre oficial *"Camiones Caídos - Control de Flotas"*, tema `#0F1115`, modo de visualización `standalone`.
- Iconos vectoriales y rasterizados de 192x192 y 512x512 con soporte maskable.

---

## 13. SERVICE WORKER Y WORKBOX 7
- Archivo generado: `dist/sw.js` en modo `autoUpdate`.
- **Precache Estático Obligatorio:** 26 entradas precacheadas en la instalación (2,314.69 KiB), incluyendo `index.html`, bundles JS, CSS y logotipos institucionales.
- Runtime Caching: Intercepta peticiones de navegación y assets estáticos sirviendo desde caché local en ausencia de red.

---

## 14. CARGA PEREZOSA (LAZY LOADING)
Para optimizar el First Contentful Paint:
- `React.lazy()` en módulos administrativos: `UserManager`, `OperatorManager`, `GlobalHistory`, `TruckHistoryModal`.
- Importaciones dinámicas en librerías de exportación (`jspdf`, `xlsx`).

---

## 15. OPTIMIZACIÓN MANUALCHUNKS (ROLLUP)
Segmentación granular en `vite.config.js`:
- `vendor-export-pdf` (~657 kB): `jspdf`, `jspdf-autotable`, `html2canvas`.
- `vendor-export-xlsx` (~282 kB): `xlsx` y códecs binarios.
- `vendor-supabase` (~203 kB): SDK cliente de Supabase.
- `vendor-react` (~189 kB): Núcleo de React y ReactDOM.

---

## 16. MOTORES DE EXPORTACIÓN (PDF Y EXCEL)
- **Generación PDF (`pdfUtils.js`):** Maquetación vectorial con membretes corporativos Drummond y CAT en base64; renderizado directo en cliente evitando sobrecarga de servidores.
- **Generación XLSX (`exportUtils.js`):** Construcción de libro con dos pestañas de cálculo ('Novedades Turno' y 'Pendientes Campo') compatibles con Excel y PowerBI.

---

## 17. VARIABLES DE ENTORNO (SOLO NOMBRES)
- **Frontend (Vercel / `.env`):**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- **Backend (Supabase Secrets):**
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 18. ENTORNO DE DESARROLLO LOCAL
```bash
# Servidor de desarrollo en puerto 5173
npm run dev

# Compilación de producción
npm run build

# Linter de código
npm run lint

# Previsualización productiva
npm run preview
```

---

## 19. PIPELINE DE COMPILACIÓN (BUILD)
- Comando: `npm run build` (`vite build`).
- Salida: Directorio `dist/` con hash de integridad en nombres de archivos.
- Tiempos de compilación verificados: ~630 ms en Node.js v20.

---

## 20. ANÁLISIS ESTÁTICO (LINTING)
- Comando: `npm run lint` (`oxlint`).
- Resultado verificado: **0 errores**, exactamente **28 warnings baseline** preexistentes aprobadas.

---

## 21. DESPLIEGUE EN VERCEL
- Configuración en `vercel.json`:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- Despliegue mediante integración continua en rama `main` o CLI `vercel --prod`.

---

## 22. INFRAESTRUCTURA SUPABASE CLOUD
- PostgreSQL 15 en infraestructura gestionada.
- Connection pooler activo para optimización de conexiones concurrentes.
- Edge Functions Deno con soporte CORS centralizado.

---

## 23. ESTRATEGIA DE RESPALDOS (BACKUPS)
1. **Código:** Repositorio Git centralizado en GitHub (rama `main` sincronizada).
2. **Configuración y DDL:** `supabase_schema.sql` y código de Edge Functions versionados en el repositorio.
3. **Datos:** Snapshots JSON auditados pre-migración (`truck_reports_pre_operator_id_migration_2026-09-10.json`) y copias de seguridad automáticas diarias gestionadas por la infraestructura Supabase Cloud. No existe cron de respaldo dentro del frontend.

---

## 24. RUNBOOKS DE RECUPERACIÓN ANTE INCIDENTES

| Runbook | Síntoma | Diagnóstico | Acción Correctiva | Verificación |
| :--- | :--- | :--- | :--- | :--- |
| **A. Frontend no carga** | Pantalla blanca con error `ChunkLoadError`. | Service Worker solicita chunks con hashes antiguos ya purgados en Vercel. | Instruir al usuario a presionar `Ctrl + F5` o limpiar datos de navegación del sitio. | Carga exitosa del Dashboard en navegador limpio. |
| **B. Deploy fallido** | Error de build en Vercel CI/CD. | Fallo de empaquetado o variables ausentes. | Ejecutar `npm run build` localmente; validar variables en Vercel. Si persiste, aplicar Instant Rollback en Vercel. | Despliegue con estado READY en Vercel. |
| **C. Supabase caído** | Errores de red en peticiones REST. | Indisponibilidad del backend o límite de conexiones del pooler. | Verificar `status.supabase.com`. La app conmuta a modo offline. Si el pooler está saturado, reiniciar servicio en panel. | Retorno de código 200 en `/rest/v1/truck_reports`. |
| **D. JWT expirado** | HTTP 401 Unauthorized en peticiones. | Token de sesión caducado o revocado en GoTrue. | AuthContext captura 401 y ejecuta `logout()`. El usuario debe reingresar credenciales en `LoginForm`. | Emisión de nuevo token de sesión válido. |
| **E. Problema de RLS** | Consultas vacías o error 403 Forbidden. | Perfil desalineado en `app_users` o función `is_admin()` denegada. | Verificar que `auth_user_id` en `app_users` coincida con `auth.uid()`. | Visualización correcta de datos según rol y mina. |
| **F. Caché corrupta** | Datos antiguos persisten tras actualización. | Conflictos en IndexedDB o Service Worker no reactivado. | Borrar almacenamiento del sitio en navegador y desregistrar Service Worker. | Descarga fresca del censo y reportes activos. |
| **G. Corrupción de datos** | Pérdida de registros en `truck_reports`. | Borrado no autorizado o script anómalo. | **REQUIERE PROCEDIMIENTO ADICIONAL:** Restaurar desde snapshot JSON pre-migración o backup diario de Supabase. | Conciliación de integridad relacional al 100%. |

---

## 25. SEGURIDAD Y DEFENSA EN PROFUNDIDAD
- Principio de Mínimo Privilegio: El frontend solo conoce `VITE_SUPABASE_ANON_KEY`. La llave `SUPABASE_SERVICE_ROLE_KEY` está aislada en Supabase Secrets y solo es accesible por las Edge Functions.
- Inmutabilidad de Identidad: El trigger `trg_protect_app_users_columns()` bloquea la alteración de identificadores a nivel de base de datos.
- Aislamiento Territorial: RLS fuerza el filtrado de mina para todos los roles no administradores.

---

## 26. MÉTRICAS DE RENDIMIENTO CERTIFICADAS
Valores auditados del build actual:
- Bundle Inicial de JavaScript: **125.83 kB** (33.55 kB gzipped).
- Hoja de Estilos CSS Inicial: **15.81 kB** (3.78 kB gzipped).
- Activos Precacheados en PWA: **26 entradas estáticas** (2,314.69 KiB).
- Tiempos de Carga: First Contentful Paint < 0.8 s en redes 4G simuladas.

---

## 27. ESTADO DE DATOS DEL RELEASE BASELINE
Snapshot de integridad matemática verificado al 100%:
- `app_users`: 22 cuentas activas.
- `operators`: 814 conductores (100% en estado 'Activo').
- `truck_reports`: 347 registros totales.
  - `operator_id NOT NULL`: 324 (296 históricos migrados + 28 creados en producción).
  - `operator_id NULL`: 23 (18 con snapshot 'Sin Registro' y 5 con 'Operador Modificado').
  - Justificación: Los 23 registros NULL son excepciones históricas legítimas de eventos previos a la estandarización del censo de operadores.

---

## 28. INVENTARIO DE ARCHIVOS PROTEGIDOS Y SENSIBLES
- `AuthContext.jsx`: Orquestador de autenticación, JWT y modo offline.
- `ReportContext.jsx`: Estado central de reportes y operadores.
- `MobileNav.jsx` y `LiquidLensCanvas.jsx`: Motor visual y táctil de navegación móvil.
- `TruckReportModal.jsx`: Formulario maestro de captura de paradas y horas de flota.
- `pdfUtils.js`: Generador ejecutivo de informes oficiales Drummond / CAT.
- `supabase/functions/`: Edge Functions custodias de la gobernanza de usuarios y contraseñas.

---

## 29. MATRIZ DE TROUBLESHOOTING
- **Llamada 401 en Edge Functions:** Validar cabecera `Authorization: Bearer <token>`.
- **Llamada 403 en Edge Functions:** Validar que el usuario tenga rol `'Administrador'` en `app_users`.
- **Error CORS preflight:** Verificar que `_shared/cors.ts` responda al método `OPTIONS` con código 200/204.
- **Error 42501 en UPDATE:** La transacción intentó modificar un campo inmutable protegido por el trigger `trg_protect_app_users_columns`.

---

## 30. CHECKLIST DE MANTENIMIENTO TÉCNICO
1. **Mantenimiento Semanal:** Revisar logs de Edge Functions en Supabase para descartar errores 500.
2. **Mantenimiento Mensual:** Ejecutar `npm run lint` y `npm audit` para vigilar vulnerabilidades de paquetes.
3. **Procedimiento Pre-Release Obligatorio (9 Pasos):**
   1. Git limpio (`git status` limpio y en rama `main`).
   2. Análisis de lint (`npm run lint` con 0 errores).
   3. Compilación de producción (`npm run build` con exit code 0).
   4. Verificación de variables en Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
   5. Despliegue en Vercel (`vercel --prod`).
   6. Comprobación de Supabase (tablas, RLS y Edge Functions activas).
   7. Smoke test en producción (login, dashboard, 347 reportes).
   8. Verificación de Service Worker en navegador.
   9. Verificación de procedimiento de rollback.
