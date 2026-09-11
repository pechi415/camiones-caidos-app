# CAMIONES CAÍDOS — MANUAL ADMINISTRATIVO
## Control de Flota y Cierre de Turno
**Operaciones:** Mina Pribbenow & Mina El Descanso • Drummond Ltd. Colombia  
**Versión del Documento:** 1.0 — Guía Oficial de Administración y Supervisión  
**Fecha:** 10 de septiembre de 2026  
**Público:** Administrador y Encargado  

---

## 1. INTRODUCCIÓN ADMINISTRATIVA
El presente Manual Administrativo establece los estándares y procedimientos para la administración y supervisión técnica y funcional de la plataforma **Camiones Caídos** en las operaciones mineras de acarreo de carbón a cielo abierto de **Mina Pribbenow** y **Mina El Descanso**.

A través de este documento, el Administrador y el Encargado de Despacho/Mantenimiento comprenderán exactamente cómo gestionar cuentas de usuario, mantener depurado el censo de operadores, gobernar la segregación territorial de datos entre minas y coordinar el ciclo de vida de los reportes de camiones caídos.

---

## 2. ROLES ADMINISTRATIVOS Y MATRIZ DE PERMISOS
El sistema implementa tres niveles de rol, de los cuales dos tienen responsabilidades administrativas y de supervisión:

| Rol | Mina de Operación | Atribuciones Principales | Restricciones de Seguridad |
| :--- | :--- | :--- | :--- |
| **Administrador** | Global (Pribbenow y El Descanso) | Crear, editar y eliminar usuarios; resetear claves; gestionar catálogo de operadores; ver ambas minas; eliminar cualquier reporte; emitir reportes ejecutivos. | Protección contra autoeliminación; no puede eliminar al último administrador del sistema. |
| **Encargado** | Sede Asignada (Pribbenow o El Descanso) | Capturar y editar camiones caídos; marcar OPERATIVO / DOWN; reabrir reportes; eliminar reportes de su mina; emitir PDF y Excel de su turno. | Sin acceso a Gestión de Usuarios ni Operadores; no puede resetear contraseñas; RLS bloquea consulta de la otra mina. |
| **Digitador** | Sede Asignada (Pribbenow o El Descanso) | Captura de reportes de campo y actualización de observaciones durante el turno activo. | Sin permisos de eliminación; sin módulos de administración ni reseteo de claves. |

---

## 3. ADMINISTRACIÓN DE USUARIOS
El módulo de Gestión de Usuarios es de acceso exclusivo para el rol Administrador y se encuentra disponible en la barra superior o menú de navegación.

### 3.1 Directorio, Búsqueda Reactiva y Orden A-Z
El directorio lista los 22 usuarios registrados en el sistema. Cuenta con una barra de búsqueda reactiva que filtra en tiempo real por nombre, número de cédula o grupo operativo. El listado se mantiene automáticamente clasificado en orden alfabético A-Z de acuerdo con el nombre del colaborador.

### 3.2 Registro de un Nuevo Usuario (Paso a Paso)
1. En la pestaña Usuarios, pulse el botón rojo **"+ Crear Nuevo Usuario"**.
2. **Nombre Completo (Obligatorio):** Ingrese nombre y apellido (mínimo 3 caracteres). El sistema aplicará automáticamente mayúsculas iniciales estándar.
3. **Número de Cédula (Obligatorio):** Digite la identificación oficial sin puntos ni comas (mínimo 5 dígitos numéricos). Constituye el usuario de login.
4. **Rol:** Seleccione entre Administrador, Encargado o Digitador según las funciones operacionales del trabajador.
5. **Mina:** Asigne El Descanso o Pribbenow. Si el rol es Administrador, tendrá alcance a ambas sedes independientemente de la sede base.
6. **Grupo:** Asigne el grupo de turno correspondiente (Grupo 1, Grupo 2, Grupo 3 o Grupo 4).
7. **Fotografía / Avatar (Opcional):** Permite cargar una foto que se comprime automáticamente en el navegador para no saturar la red.
8. **Guardar:** Presione "Guardar Usuario". La cuenta se sincroniza atómicamente con Supabase Auth y la base de datos.

### 3.3 Edición de Cuentas Existentes
En la fila o tarjeta del usuario, pulse el botón **"Editar"** (icono de lápiz). Podrá modificar el nombre, rol, sede, grupo y fotografía. La cédula permanece inmutable para resguardar la trazabilidad histórica de auditoría.

### 3.4 Restablecimiento Administrativo de Contraseña
Si un usuario olvida su contraseña o es bloqueado por intentos erróneos, el Administrador puede presionar el botón **"Resetear Clave"** (icono de llave). Al confirmar, el sistema restablece la clave a la contraseña temporal oficial `caidos1234` y activa obligatoriamente la bandera `must_change_password`.

### 3.5 Eliminación de Cuentas
El botón **"Eliminar"** purga coordinadamente al usuario tanto en el módulo de autenticación (Auth) como en la tabla de perfiles de la base de datos.

---

## 4. PROTECCIONES ADMINISTRATIVAS VERIFICADAS
El sistema incorpora tres barreras de seguridad inviolables en el backend (Edge Functions):

1. **Detección de Cédula Duplicada:** Si se intenta crear un usuario con una cédula que ya existe en `app_users` o en Auth, el servidor rechaza la transacción con HTTP 409 Conflict y el mensaje: *"El número de identificación ya se encuentra registrado."*
2. **Bloqueo de Autoeliminación:** Un administrador conectado no puede eliminarse a sí mismo. Si lo intenta, el servidor retorna HTTP 400 Bad Request: *"No es posible eliminarse a sí mismo como administrador."*
3. **Protección del Último Administrador:** El sistema realiza un conteo previo en la base de datos. Si solo resta un único administrador, se prohíbe su eliminación o degradación de rol para evitar dejar la plataforma en estado de orfandad.

> [!WARNING]
> **SEGURIDAD CRÍTICA:** Estas protecciones están implementadas en el servidor mediante Supabase Edge Functions con llaves criptográficas de servicio. No pueden ser evadidas manipulando la interfaz web.

---

## 5. POLÍTICA Y GESTIÓN DE CONTRASEÑAS
A partir de la auditoría de código en `admin-create-user` y `admin-reset-password`, se confirma que la plataforma utiliza una política homogénea y segura:

- **Valor Oficial de Clave Temporal:** `caidos1234` (verificada idéntica tanto en creación como en reseteo).
- **Comportamiento:** Todo usuario nuevo o reseteado queda registrado con `must_change_password: true`.
- **Pantalla Bloqueante:** Al ingresar con `caidos1234`, la aplicación intercepta la sesión y despliega de inmediato un modal bloqueante que exige definir una contraseña personal.
- **Reglas de Seguridad:** Mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un símbolo especial; confirmación coincidente obligatoria; no se admite volver a usar la clave temporal.

---

## 6. ADMINISTRACIÓN DEL CENSO DE OPERADORES
El módulo Gestión de Operadores administra el censo oficial de 814 conductores de camiones de extracción:

- **Búsqueda y Filtros:** Búsqueda reactiva por nombre, filtro por Mina (Todas, Pribbenow, El Descanso) y filtro por Grupo de Turno (Todos, Grupo 1 a 4).
- **Orden A-Z:** Clasificación alfabética continua según apellidos y nombres.
- **Registro de Operador:** Botón "+ Registrar Nuevo Operador", id generado `OP-xxx-xxxx`, mayúsculas automáticas y estado 'Activo'.
- **Reglas de Eliminación:** La eliminación física está reservada exclusivamente para el Administrador vía RLS (`operators_delete_admin`). En la base de datos se conserva el snapshot textual en todos los reportes históricos previos.

---

## 7. ADMINISTRACIÓN DE REPORTES DE CAMIONES
El control de flota en campo se realiza desde el Dashboard principal:

- **Creación:** Botón "+ Registrar Camión Caído". Se selecciona el número de camión (serie 2xxx de 4 dígitos), se autocompleta el operador desde el censo oficial (814), se selecciona subsistema mecánico/eléctrico, componente, síntoma, bahía/tajo y hora de caída.
- **Transición DOWN / OPERATIVO:** Los camiones caídos inician en estado DOWN. Al repararse, el Encargado presiona 'Operativo', registra la hora real de retorno y confirma la salida a circuito.
- **Reapertura:** Si una unidad entregada vuelve a fallar o requiere ajuste de diagnóstico, el Encargado puede pulsar 'Reabrir' para reintegrarlo a la lista de caídos.
- **Eliminación según Rol:** El Administrador puede eliminar cualquier reporte erróneo. El Encargado puede eliminar reportes únicamente si pertenecen a su propia mina. El Digitador tiene la eliminación bloqueada.

---

## 8. CONTROL Y AISLAMIENTO POR MINA
La plataforma opera bajo el principio de estricta segregación minera:

- Mina Pribbenow y Mina El Descanso cuentan con tajos, flotas y despachos independientes.
- Los Encargados y Digitadores tienen restringida su vista mediante Row Level Security (`mine = get_auth_user_mine()`). Un encargado de El Descanso no puede ver ni modificar datos de Pribbenow.
- El Administrador dispone de un selector global en el encabezado para alternar entre minas o supervisar la operación consolidada.

---

## 9. HISTORIAL GENERAL Y POR CAMIÓN
La bitácora de eventos ofrece trazabilidad completa de paradas:

- **Regla Cronológica Oficial:**
  1. Fecha en orden DESCENDENTE (días más recientes arriba).
  2. Dentro del mismo día, hora en orden ASCENDENTE (del inicio del turno al final).
- **Historial por Camión:** Al pulsar sobre el número de una unidad se abre su ficha técnica, mostrando la línea de tiempo de paradas y alertando sobre el subsistema más recurrente (detección de fallas crónicas).

---

## 10. EXPORTACIONES EN PDF Y EXCEL
La plataforma permite emitir documentos oficiales con un solo clic:

- **PDF Oficial:** Informe gerencial con membretes corporativos Drummond y CAT en alta resolución, resumen de disponibilidad, horas de parada y detalle con snapshot de operador.
- **Compartir Móvil:** En celulares y tabletas, incluye el botón 'Compartir PDF (1 Clic)' mediante la Web Share API para envío instantáneo a grupos de WhatsApp o Teams de despacho.
- **Excel (XLSX):** Genera un libro estructurado en dos hojas: 'Novedades Turno' y 'Pendientes Campo', listo para análisis estadístico y conciliación en hojas de cálculo.

---

## 11. PWA Y OPERACIÓN SIN CONEXIÓN
- **Instalación en Móviles:** Aplicación Web Progresiva instalable directamente desde Chrome (Android) o Safari (iOS) sin pasar por tiendas de aplicaciones.
- **Consulta en Tajo Sin Señal:** Los reportes del turno y el censo de operadores se mantienen en la memoria segura del dispositivo (`localStorage`).
- **Persistencia de Sesión:** La aplicación no expulsa al usuario ni solicita login si se pierde la conectividad en botaderos o tajos profundos; restaura el perfil validado de `camiones_user_profile`.
- **Sincronización al Retorno:** Al detectar señal de red o Wi-Fi minero, la aplicación revalida silenciosamente los datos con el servidor central.

---

## 12. BUENAS PRÁCTICAS ADMINISTRATIVAS
1. **Entrega Segura de Claves Temporales:** Comunique la contraseña `caidos1234` de manera directa y personal al colaborador. Recuérdele que el sistema le obligará a crear una clave propia.
2. **Conciliación en Relevo de Turno:** Antes de cerrar el turno diurno (18:00) o nocturno (06:00), el Encargado debe verificar que todas las unidades en taller estén marcadas como DOWN o tengan registrada su hora de salida a circuito.
3. **Depuración del Censo:** Modifique los operadores únicamente ante traslados de grupo o desvinculaciones formales.
4. **Cierre de Sesión en Terminales de Despacho:** En computadores compartidos de oficina, cierre siempre la sesión desde el menú de perfil para proteger la auditoría de registros.

---

## 13. PROBLEMAS FRECUENTES Y SOLUCIONES

| Síntoma Observado | Causa Probable | Acción Administrativa Inmediata |
| :--- | :--- | :--- |
| **Error 409 al crear usuario** | La cédula ya está registrada en el sistema. | Verifique el número de cédula en el directorio de usuarios. Si el colaborador ya existe, edite su perfil en lugar de crearlo de nuevo. |
| **Usuario no puede entrar tras reset** | Ingresó cédula con puntos o escribió mal la clave temporal. | Indique al usuario que escriba la cédula sin símbolos y la clave en minúsculas: `caidos1234`. Si persiste, ejecute un nuevo reset. |
| **Encargado no ve camiones de otra mina** | Comportamiento normal por política de aislamiento RLS. | Los encargados solo tienen visión sobre su mina asignada. Si requiere supervisión global, un Administrador debe elevar su rol a Administrador. |
| **No permite eliminar a un usuario** | Intento de autoeliminación o de borrar al único administrador. | El sistema protege la cuenta del usuario en sesión y salvaguarda al último administrador para evitar pérdida de gobernanza. |
| **Reportes no sincronizan en campo** | Pérdida de cobertura de datos móviles en el tajo. | La aplicación continuará en modo consulta offline. Al retornar a zona con señal de red, el sistema sincronizará automáticamente. |

---

## 14. PROCEDIMIENTO DE SOPORTE BÁSICO
Cuando una novedad operativa no pueda resolverse desde las funciones del panel administrativo:
1. **Registrar datos del incidente:** Cédula del colaborador afectado, mina, hora aproximada y captura de pantalla del mensaje de error.
2. **Verificar conectividad:** Valide si otros servicios web cargan con normalidad en la terminal de despacho.
3. **Escalamiento a Nivel 3:** Envíe el reporte al responsable técnico de la aplicación indicando el código de respuesta HTTP observado (400, 403, 404 o 500).
