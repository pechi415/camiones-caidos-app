# CAMIONES CAÍDOS — MANUAL DE USUARIO OFICIAL
## Control de Flota y Cierre de Turno
**Operaciones:** Mina Pribbenow & Mina El Descanso • Drummond Ltd. Colombia  
**Versión del Documento:** 1.0 — Guía de Operación en Campo

---

## 1. ¿QUÉ ES CAMIONES CAÍDOS?
**Camiones Caídos** es una plataforma de software diseñada específicamente para registrar, categorizar y reportar en tiempo real las fallas imprevistas que detienen a los camiones de extracción minera (Flota CAT 793 y equipos de acarreo afines).

Permite:
- Registrar novedades de camiones caídos en menos de 30 segundos asociando al operador oficial.
- Monitorear en tiempo real los equipos fuera de servicio (**DOWN**) y registrar su hora de salida al quedar **OPERATIVOS**.
- Hacer seguimiento estricto a los equipos pendientes en campo arrastrados de turnos anteriores.
- Emitir los informes oficiales de Cierre de Turno en PDF y Excel con un solo toque.

---

## 2. INGRESO A LA APLICACIÓN
1. Abra el enlace en Google Chrome, Microsoft Edge o Safari.
2. Ingrese su número de identificación (cédula) sin puntos ni letras.
3. Ingrese su contraseña personal.
4. Presione **"Iniciar Sesión"**.

> **Primer Ingreso:** Si es su primera vez en el sistema, ingrese con su cédula y la clave temporal `caidos1234`. La aplicación le exigirá crear una contraseña personal de al menos 6 caracteres antes de continuar.

---

## 3. ROLES Y PERMISOS
| Rol | Funciones Permitidas | Restricciones |
| :--- | :--- | :--- |
| **Administrador** | Acceso a ambas minas, gestión completa de reportes, módulo de Operadores, módulo de Usuarios, reseteo de claves y Cierre de Turno. | Sin restricciones. |
| **Encargado** | Operación fija en su mina, registrar y editar reportes, pasar a Operativo, eliminar reportes de su turno y emitir PDF/Excel. | Sin acceso a módulos administrativos ni reseteo de claves. |
| **Digitador** | Operación fija en su mina, registrar camiones caídos y editar datos de su turno. | Sin botón de eliminación ni módulos administrativos. |

---

## 4. DASHBOARD Y KPIS
- **Registros en Turno:** Total de novedades registradas en la fecha y turno seleccionado.
- **Actualmente Down:** Conteo de camiones caídos en el turno actual más los pendientes en campo de turnos anteriores.
- **Recuperados / Operativos:** Camiones reparados y entregados a circuito en el turno.
- **Tasa de Recuperación (%):** Porcentaje de efectividad de recuperación de flota.

---

## 5. REGISTRAR UN CAMIÓN CAÍDO
1. Pulse el botón **"+ Registrar Camión Caído"**.
2. **N° de Camión (Obligatorio):** 4 dígitos iniciando por 2 (ej: 2014, 2305, 2723).
3. **Operador (Obligatorio):** Seleccione el conductor en la lista inteligente.
4. **Sistema Afectado (Obligatorio):** Elija el subsistema (Motor, Frenos, Suspensión, Llantas, etc.).
5. **Ubicación (Obligatorio):** Indique el frente de cargue o bahía de taller.
6. **Descripción de Falla (Obligatorio):** Describa el síntoma o alarma observada.
7. **Hora de Reporte:** Sugiere hora actual en formato 12H (ej: 08:35 AM).
8. Presione **"Guardar Reporte"**.

---

## 6. ACTUALIZAR ESTADO (DOWN A OPERATIVO)
1. En la fila del camión, presione el botón verde **"Operativo"**.
2. Indique la hora de salida de taller o entrega a campo.
3. Presione **"Confirmar Retorno a Operativo"**.
*(Si necesita revertir la acción, pulse "Reabrir" para devolverlo al estado DOWN).*

---

## 7. HISTORIAL GENERAL Y REGLA CRONOLÓGICA
- Filtre por rango de fechas (Desde/Hasta), mina, turno o subsistema.
- **Regla de Orden:**
  1. Fecha más reciente primero (**Fecha DESC**).
  2. Dentro del mismo día, hora más temprana primero (**Hora ASC**).

---

## 8. HISTORIAL POR CAMIÓN
- Haga clic sobre el número del camión para ver su ficha técnica.
- Despliega la línea de tiempo de fallas mecánicas y el **Sistema más recurrente** (detección de fallas crónicas).
- Permite descargar la hoja de vida de la unidad en PDF.

---

## 9. GESTIÓN DE OPERADORES (ADMIN)
- Directorio de 814 conductores de acarreo.
- Crear nuevos operadores con auto-formato en mayúsculas, asignar mina y grupo de turno.
- Editar o eliminar operadores según novedades de personal.

---

## 10. GESTIÓN DE USUARIOS (ADMIN)
- Directorio A-Z de personal autorizado.
- Crear nuevos usuarios con asignación de rol, mina y grupo.
- Botón **"Resetear Contraseña"** para asignar la clave temporal `caidos1234`.
- Protección contra autoeliminación y resguardo del último administrador.

---

## 11. CIERRE DE TURNO Y EXPORTACIONES
- **PDF Oficial:** Pulse **"Cierre de Turno / PDF"** para generar el reporte con logos de Drummond y CAT. En celulares use **"Compartir PDF (1 Clic)"** para enviarlo por WhatsApp o Teams.
- **Excel (XLSX):** Descarga un libro con dos pestañas: *Novedades Turno* y *Pendientes Campo*.

---

## 12. USO EN CELULAR Y PWA OFFLINE
- En Android pulse menú -> "Instalar aplicación". En iPhone pulse compartir -> "Agregar al inicio".
- En tajos mineros sin señal, la aplicación mantiene la consulta de datos en memoria y revalida la sesión automáticamente al recuperar conexión.

---

## 13. CIERRE DE SESIÓN Y SEGURIDAD
- Haga clic en su foto o nombre en la esquina superior derecha y elija **"Cerrar Sesión"**.
- Obligatorio en computadores compartidos de despacho.

---

## 14. PROBLEMAS FRECUENTES
- **Credenciales incorrectas:** Revise que la cédula no tenga puntos. Si olvidó la clave, solicite un reseteo al Administrador.
- **No veo camiones:** Compruebe que la mina y el turno (Diurno/Nocturno) coincidan con la hora actual.
- **No guarda camión:** Verifique 4 dígitos iniciando por 2 y que ubicación/detalle no estén vacíos.

---

## 15. CONTACTO Y SOPORTE
Para soporte, contacte al responsable designado de la aplicación en su operación.
