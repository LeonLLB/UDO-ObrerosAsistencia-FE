# UDO Obreros Asistencia (Frontend)

Aplicación web de gestión de personal, asistencia, permisos y nómina de la
Universidad de Oriente, Núcleo Monagas. Está construida con SvelteKit, Svelte 5
y TypeScript. Las operaciones de negocio de la API se ejecutan en el backend;
este proyecto aporta la interfaz, las cargas de datos de SvelteKit y algunas
consultas directas de lectura a MariaDB.

## Requisitos y ejecución

- Node.js compatible con las versiones instaladas en el proyecto.
- pnpm.
- Acceso a la API del backend y, para las páginas que consultan datos desde el
  servidor, acceso a MariaDB.

```sh
pnpm install
pnpm dev
```

Comandos disponibles:

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Inicia Vite en modo desarrollo. |
| `pnpm check` | Sincroniza SvelteKit y ejecuta `svelte-check` con el `tsconfig.json` del proyecto. |
| `pnpm build` | Genera la compilación de producción. |
| `pnpm preview` | Sirve localmente la compilación generada. |

## Configuración

Las variables se validan en `src/env.ts`. Configura un archivo `.env` local (no
lo subas al repositorio) con:

| Variable | Uso |
| --- | --- |
| `VITE_API_URL` | URL absoluta HTTP(S) de la API usada por el navegador. |
| `PUBLIC_API_URL_SERVER` | URL absoluta HTTP(S) que usa el servidor para revalidar sesiones. |
| `HOST_BD` | Host de MariaDB. |
| `PUERTO_BD` | Puerto TCP de MariaDB. |
| `USUARIO_BD` | Usuario de la conexión de MariaDB. |
| `CLAVE_BD` | Contraseña de la conexión de MariaDB. |
| `NOMBRE_BD` | Base de datos de MariaDB. |

Las cinco variables de base de datos se utilizan en las cargas que consultan
MariaDB desde el servidor SvelteKit. `VITE_API_URL` y
`PUBLIC_API_URL_SERVER` deben apuntar a la API correspondiente en el entorno
local o desplegado; la configuración de Vite también define un proxy de
desarrollo `/api` hacia `127.0.0.1:8090`.

## Estructura de `src/lib`

Se describen los módulos de `src/lib` excepto `components/`, como se solicita.

### Utilidades y comunicación

- `utils.ts`: reexporta `cn` para combinar clases CSS y declara tipos auxiliares
  para quitar las propiedades `child`/`children` o añadir una referencia a un
  elemento HTML.
- `adapters/Axios.adapter.ts`: expone `axiosA`, una instancia ligera que
  antepone `VITE_API_URL` a las rutas de la API. Sus métodos `get`, `post`,
  `postWithHeaders`, `put` y `delete` envían credenciales; `get` y `post`
  también permiten solicitar una respuesta binaria (`Blob`).
- `helpers/client/getApiErrorMessage.ts`: convierte errores de Axios en un
  mensaje útil: utiliza `message` de la respuesta cuando es texto o una lista
  de textos, informa el código HTTP si existe respuesta y distingue los
  errores de conexión. Para otros errores utiliza el mensaje de `Error` o uno
  genérico.
- `helpers/client/downloadReport.ts`: solicita un archivo como `Blob`, rechaza
  una respuesta vacía o inválida, intenta recuperar un mensaje JSON cuando la
  API devuelve un error binario y descarga el archivo mediante un enlace
  temporal. Finalmente elimina el enlace y revoca la URL temporal.
- `hooks/is-mobile.svelte.ts`: clase reactiva `IsMobile` basada en `MediaQuery`;
  por omisión considera móvil un ancho inferior a 768 px y permite indicar otro
  breakpoint.
- `assets/logo_udo.png`: imagen institucional utilizada en la pantalla de
  inicio de sesión.

### Servidor y persistencia

- `server/UsersMiddlewares.ts`: `UsersMiddlewares.checkIfUserLoggedIn(token)`
  consulta al backend `auth/revalidate/{token}`. Un token ausente o una
  respuesta 401/403 equivale a sesión no válida; otros errores HTTP se
  propagan. Valida la forma de la respuesta antes de devolver los datos de
  usuario y el token renovado.
- `server/database.ts`: configura TypeORM para MariaDB con las variables de
  entorno y las entidades/vistas del proyecto. Valida el puerto, desactiva
  `synchronize` y comparte tanto el `DataSource` inicializado como la promesa
  de inicialización para evitar conexiones concurrentes duplicadas. Si falla
  la inicialización, limpia el estado para permitir un nuevo intento.
- `server/users/tipo-usuario.ts`: códigos de usuario `A` (administrador) y `C`
  (consulta).
- `server/users/user.entity.ts`: entidad `usuarios`, con cédula, nombres,
  apellidos, tipo y estado; el hash de clave se excluye por defecto de las
  consultas.
- `server/personal/entities/personal.entity.ts`: entidad `personal`, ligada a
  un área y a sus movimientos; incluye identidad, datos de cuenta bancaria,
  tipo, estado y fecha de ingreso.
- `server/areas/entities/area.entity.ts`: entidad `areas`, con nombre único y
  relación con el personal asignado.
- `server/a2d/entities/movement.entity.ts`: entidad `movimientos_a2d`, con
  usuario, fecha/hora, código de movimiento y relación opcional con personal.
  Declara una clave única para usuario, fecha/hora y código menor.
- `server/attendance/entities/holiday.entity.ts`: entidad `feriados`, con
  descripción y rango de fechas.
- `server/attendance/entities/permission.entity.ts`: entidad
  `permisos_personal`, con descripción, patología, fechas, estado y relación
  obligatoria con personal.
- `server/personal/entities/onapre.entity.ts`: entidad `onapre`, con tipo de
  personal, rango, clase de funcionario y salario base.
- `server/personal/entities/daily-attendance-interval.view.ts`: vista de
  intervalos diarios. Ordena los movimientos válidos de código menor 38 por
  persona, fecha, hora e identificador; empareja cada entrada impar con el
  movimiento siguiente y conserva pares con salida posterior a la entrada.
  Calcula la duración de cada intervalo en segundos.
- `server/personal/entities/daily-attendance-summary.view.ts`: agrupa los
  intervalos anteriores por persona y fecha, suma sus segundos y deriva el
  total de horas trabajadas.

## Rutas de la aplicación

Las rutas siguen el enrutamiento por archivos de SvelteKit. Los archivos
`+page.server.ts` cargan datos en el servidor; los `+page.svelte` muestran la
pantalla y ejecutan las interacciones con la API. Cuando se indica que una
operación se envía a la API, el cálculo de negocio correspondiente ocurre en el
backend y no en este frontend.

### Acceso y mantenimiento

| Ruta | Función y lógica |
| --- | --- |
| `/login` | Si ya hay sesión válida, el `load` redirige a `/`; sin token o con sesión inválida deja mostrar el formulario. La pantalla consulta primero el estado de la cédula (7 u 8 caracteres). Con estado 0 permite registrar y confirmar la nueva clave (mínimo 5 caracteres y ambas claves iguales), y luego inicia sesión; con estado 1 inicia sesión directamente. Las solicitudes se bloquean mientras están pendientes y sus errores se muestran mediante notificaciones. |
| `/` | Página principal protegida por el layout de servidor. No implementa un script propio ni una consulta de datos; sirve como destino inicial y de retorno. |
| `/backup` | El `load` requiere sesión válida y tipo de usuario administrador. Exportar solicita el backup como `Blob`, obtiene el nombre de `Content-Disposition` y descarga un `.sql`. Restaurar verifica que exista un archivo, que termine en `.sql` y que no exceda 2 GB; pide confirmación, lo envía como `FormData` y limpia el formulario cuando termina correctamente. |
| `/holidays` | El servidor carga los feriados ordenados por fecha de inicio y limita el acceso a administradores. El formulario transforma el rango del calendario en fechas ISO, valida que ambas existan y que inicio no supere fin, y crea o actualiza el feriado; al guardar ordena la lista local. La eliminación solicita confirmación y quita de la lista el registro eliminado. |
| `/users` | El servidor valida la sesión y carga usuarios sin incluir sus claves. La interfaz prepara un formulario nuevo o precargado para edición, y crea o actualiza por API. También permite eliminar un usuario y reiniciar su clave; este último flujo actualiza localmente el estado a 0 para indicar que debe establecer una nueva clave. |

### Configuración

| Ruta | Función y lógica |
| --- | --- |
| `/config/onapre` | Carga la tabla ONAPRE, solo para administradores. La pantalla filtra por personal administrativo u obrero y ordena por rango y clase. Construye los rangos (I–VII para administrativos y 1–10 para obreros) y las clases válidas para cada tipo/rango; valida la combinación, el salario no negativo con hasta dos decimales y que no se repita rango/clase antes de crear o editar. Elimina registros mediante una acción confirmada. |
| `/config/conceptos` | Carga el catálogo de conceptos, solo para administradores, ordenado por tipo y código. Distingue conceptos dinámicos (`D`), fijos del sistema (`F`) y variables (`V`); los variables no se configuran desde aquí y los códigos requeridos por nómina no se pueden eliminar. Editar valida que un concepto dinámico tenga fórmula y envía la configuración de fórmula, autoasignación y si es asignación o deducción. Eliminar actualiza el catálogo local al completarse. |

### Personal y asistencia

| Ruta | Función y lógica |
| --- | --- |
| `/personal` | El servidor carga trabajadores con su dependencia y carga las dependencias disponibles. La pantalla permite crear, editar, eliminar y cambiar el estado del trabajador. Para la cuenta bancaria divide los 20 dígitos en cinco campos: filtra caracteres no numéricos, limita cada grupo a cuatro dígitos, avanza al completar un grupo, permite pegar una cuenta repartida entre campos y navegar entre ellos con el teclado. Antes de guardar valida los cinco grupos y la dependencia; convierte fecha y dependencia al formato enviado por la API. |
| `/personal/[cedula]` | El servidor busca al trabajador o devuelve 404, consulta sus grados académicos junto con el registro de currículo/usuario y carga familiares ordenados por apellido y nombre. El cliente puede cambiar entre pestañas, agregar estudios (tipo, año, universidad y descripción) o familiares (tipo, datos personales, sexo, nacimiento y estudios), y eliminar un familiar. Valida campos obligatorios, normaliza espacios y números, y actualiza las listas locales después de cada operación. |
| `/personal/dependencies` | Carga las dependencias alfabéticamente y exige administrador. Crear/editar envía el nombre y actualiza la lista local; eliminar quita la dependencia de la lista tras la respuesta exitosa. |
| `/personal/attendance` | El servidor carga dependencias para los filtros. La pantalla consulta asistencia mensual al cambiar mes, año, dependencia o tipo de personal; solo ofrece meses 1–11, limita la consulta a los tres años más recientes y evita meses futuros. Usa un identificador de solicitud para descartar respuestas obsoletas y cancela lógicamente solicitudes al cambiar filtros o salir de la página. Formatea totales y rangos de semana y descarga el PDF con los mismos filtros. |
| `/personal/attendance/[cedula]/[mes]/[anio]` | El servidor comprueba la sesión y entrega los parámetros de ruta. El cliente valida el período con las mismas reglas de asistencia mensual y consulta el detalle de la persona. Convierte cada semana recibida en columnas de lunes a viernes usando el día UTC; los fines de semana no se muestran. Traduce estados `A` (asistencia), `I` (inasistencia), `P` (permiso), `F` (feriado) y `null` (sin registro), y descarta respuestas de solicitudes anteriores. |
| `/personal/permissions` | El servidor exige administrador y prepara, para cada trabajador, el permiso activo o programado que termina hoy o después, considerando la fecha de Caracas. Ordena empleados alfabéticamente y prioriza permisos ya iniciados. En la interfaz, un permiso es gestionable si su estado está activo y no ha vencido; se etiqueta como activo, programado o culminado. Crear/editar valida que inicio no sea posterior al fin y reemplaza el permiso visible del trabajador; eliminar lo limpia de la lista. |
| `/personal/permissions/[cedula]` | El servidor exige administrador, busca al trabajador (404 si no existe), carga todos sus permisos y calcula la fecha actual de Caracas. La página muestra el historial y clasifica cada permiso como activo, culminado o pendiente comparando su rango con la fecha actual. |

### Nómina

| Ruta | Función y lógica |
| --- | --- |
| `/personal/nomina` | El servidor carga dependencias y rangos ONAPRE. El cliente consulta el resumen al cambiar período, tipo o dependencia y descarta respuestas viejas. Permite asignar al trabajador solo un ONAPRE de su mismo tipo. La precarga valida el monto de cestaticket, genera la nómina y luego aplica ese monto; si el segundo paso falla, intenta actualizar el resumen e informa qué operación sí se completó. Limpiar nómina también refresca el resumen. Solo permite precargar, limpiar y exportar TXT para el mes/año actual; las exportaciones PDF incluyen resumen, expediente y personal, mientras el TXT incorpora la quincena seleccionada. |
| `/personal/nomina/[cedula]/[anio]/[mes]` | El servidor valida año/mes, busca al trabajador y obtiene dependencia, ONAPRE, cantidad de hijos menores, hijos menores que estudian y mayor nivel académico; también carga conceptos dinámicos configurables. El cliente consulta los conceptos del período, los ordena por código y deriva subtotales de asignaciones, deducciones y neto. Permite actualizar la aplicación a una o ambas quincenas (no deja desmarcar las dos), agregar un concepto dinámico existente o crear uno y aplicarlo —código en mayúsculas, números o guion bajo, hasta 40 caracteres—, eliminar conceptos del período y descargar el PDF individual. La consulta permanece disponible para otros períodos, pero la edición solo está habilitada para el período actual. |

## Diseño y detalles de implementación

- `src/routes/+layout.server.ts` valida el token de sesión `x-token` con el
  backend en cada carga: sin sesión redirige a `/login`, y una sesión válida no
  puede permanecer en esa ruta. El layout cliente muestra la navegación común,
  agrega opciones de usuarios y mantenimiento para el tipo `A`, y realiza el
  cierre de sesión en el backend antes de navegar a `/login`.
- El layout de servidor no sustituye las comprobaciones específicas de cada
  página. Las rutas administrativas comprueban además el tipo de usuario donde
  está implementado.
- `src/routes/layout.css` configura Tailwind, tema claro/oscuro, colores y
  variables visuales globales.
- `vite.config.ts` configura SvelteKit, Tailwind, SSR para `bits-ui`, el
  adaptador automático y el proxy local de desarrollo.
- La carpeta `src/lib/components/` contiene componentes reutilizables de
  interfaz y navegación; queda fuera del desglose solicitado.

## Notas

- No se deben incluir credenciales ni el archivo `.env` en commits.
- Los datos y las reglas definitivas de autenticación, asistencia, permisos y
  nómina dependen del backend; los flujos descritos aquí indican qué valida y
  presenta este frontend y qué solicitudes realiza.
