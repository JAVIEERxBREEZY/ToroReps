# API del catálogo de ejercicios

El módulo `src/modules/exercises` consume el esquema y la migración existentes. No añade tablas ni modifica la autenticación. Las rutas se sirven directamente en la raíz de la API, normalmente `http://localhost:3000`, sin prefijo `/api` en el servidor.

## Sesión y permisos

Todas las rutas del catálogo requieren la cookie `tororeps_session`, validada por el `SessionAuthGuard` global. Las escrituras añaden `AdminGuard`, que comprueba el rol del usuario cargado por esa sesión: `USER` recibe 403 y una petición sin sesión válida recibe 401. No se admiten roles ni propietarios proporcionados en el cuerpo.

En Postman:

1. Ejecuta `POST {{baseUrl}}/auth/login` con `Content-Type: application/json` y el cuerpo `{"email":"tu-cuenta@example.com","password":"tu-contraseña"}`.
2. Mantén habilitado el cookie jar. Postman conservará el `Set-Cookie` de la respuesta y reutilizará la sesión en las siguientes peticiones al mismo host. No hace falta copiar el token a un Bearer header. No mezcles `localhost` y `127.0.0.1`.
3. Comprueba la sesión y el rol mediante `GET {{baseUrl}}/auth/me`. Para las escrituras utiliza una cuenta cuyo rol ya sea `ADMIN`.
4. Si ya tienes una sesión válida en Postman, reutiliza sus cookies. Una sesión del navegador no se comparte automáticamente con Postman; inicia sesión desde Postman o introduce de forma privada la cookie vigente en su cookie jar.

No se añade una API para elevar permisos. Si todavía no existe un administrador, un responsable de la base de datos puede asignar `ADMIN` a una cuenta existente de forma explícita usando su UUID real. No se ha modificado ninguna cuenta durante esta entrega.

Se conserva la protección CSRF configurada en `main.ts`. Postman sin cabeceras de navegador funciona sin token CSRF adicional. No envíes un `Origin` ajeno ni `Sec-Fetch-Site: cross-site`; el servidor los rechaza. En producción la cookie existente es `Secure` y necesita HTTPS.

## Endpoints

| Método y ruta | Permiso | Respuesta |
| --- | --- | --- |
| `GET /exercises` | Sesión | 200, `{ items, page, limit, total }`. |
| `GET /exercises/discover` | Sesión | 200, array de cero a cinco elementos, sin metadatos ni total. |
| `GET /exercises/options` | Sesión | 200, grupos musculares existentes y enums de los campos del catálogo. |
| `GET /exercises/:id` | Sesión | 200, un elemento; 404 si no existe o está archivado. |
| `POST /exercises` | ADMIN | 201, ejercicio creado con relaciones y galería. |
| `PATCH /exercises/:id` | ADMIN | 200, ejercicio actualizado; 404 si no existe o está archivado. |
| `POST /exercises/:id/archive` | ADMIN | 200, ejercicio archivado con sus relaciones; 404 si no existe. Es idempotente y conserva la primera fecha de archivado. |

Todas las respuestas del catálogo llevan `Cache-Control: no-store`. Las rutas estáticas se registran antes de `:id`. Los UUID de ruta y de las relaciones se validan.

### Listado y discover

`GET /exercises?page=1&limit=20&search=press&muscleGroupId={{muscleGroupId}}&equipmentType=BARBELL`

- `page` es un entero desde 1; valor predeterminado 1. `limit` va de 1 a 100; valor predeterminado 20. Se rechaza un desplazamiento que supere el rango entero admitido por la consulta.
- `search` busca una subcadena del nombre sin distinguir mayúsculas/minúsculas; `%`, `_` y `\` se tratan literalmente. No hace búsqueda sin acentos. Los filtros se combinan mediante AND.
- `muscleGroupId` filtra por cualquiera de sus músculos, principal o secundario. Un UUID válido sin grupo asociado devuelve cero resultados. `equipmentType` usa el enum exacto.
- Se excluyen archivados, se ordena por `name ASC, id ASC` y se pagina en PostgreSQL. Una página fuera del resultado devuelve `items: []` con el total. Recuento y página se leen en la misma instantánea transaccional.
- Listado, detalle y discover reutilizan `ExerciseResponseDto`, con músculos, datos de cada grupo y galería ordenada por `position`. Las fechas se envían como texto ISO y `cloudinaryVersion` como texto decimal o `null`.

`GET /exercises/discover` sustituye el antiguo uso de `limit=5` para la página principal. No admite parámetros de consulta: paginación, filtros o parámetros desconocidos producen 400. Selecciona de nuevo por petición, sin personalización ni caché; dos respuestas pueden coincidir completamente. Si hay menos de cinco activos devuelve todos y con catálogo vacío devuelve `[]`, siempre con 200.

La selección usa SQL etiquetado y parametrizado de Prisma: `SELECT id FROM exercises WHERE archived_at IS NULL ORDER BY random() LIMIT $1`, con límite fijo 5. Se eligen identidades sin joins y después se cargan las relaciones en la misma instantánea; no se trae todo el catálogo a Nest ni se consulta el total. Esta solución recorre los ejercicios activos y calcula un valor aleatorio por fila; es adecuada para el catálogo inicial, pero deberá revisarse con un catálogo grande y tráfico alto. No se añade un índice o un sistema de recomendaciones para esta fase.

### Opciones y datos auxiliares

`GET /exercises/options` devuelve:

```json
{
  "muscleGroups": [{ "id": "UUID real", "name": "Pectorales", "slug": "pectorales" }],
  "equipmentTypes": ["BODYWEIGHT", "BARBELL", "DUMBBELL", "KETTLEBELL", "CABLE_MACHINE", "SELECTORIZED_MACHINE", "PLATE_LOADED_MACHINE", "ASSISTED_MACHINE", "RESISTANCE_BAND", "OTHER"],
  "measurementModes": ["REPS", "DURATION"],
  "loadModes": ["NONE", "EXTERNAL_TOTAL", "PER_HAND", "ADDED_BODYWEIGHT", "ASSISTANCE"],
  "muscleRoles": ["PRIMARY", "SECONDARY"],
  "mediaTypes": ["IMAGE", "VIDEO"],
  "cloudinaryDeliveryTypes": ["UPLOAD", "PRIVATE", "AUTHENTICATED"]
}
```

Los enums ya existen y no requieren cargar filas. Los grupos musculares deben cargarse antes de utilizarlos: se necesitan su nombre y `slug` único en minúsculas y con guiones. No hay CRUD de grupos ni se inserta el catálogo definitivo en esta entrega. Un responsable puede cargarlos mediante SQL y obtener sus UUID con `RETURNING id, name, slug`; después se consultan desde Postman mediante `options`. Los ejercicios pueden crearse sin músculos o medios porque el esquema permite esas relaciones vacías.

## Crear un ejercicio con imagen y vídeo

`POST {{baseUrl}}/exercises`, con una sesión ADMIN y `Content-Type: application/json`:

```json
{
  "name": "Press de banca con barra",
  "description": "Ejemplo para adaptar a los recursos que hayas subido.",
  "equipmentType": "BARBELL",
  "measurementMode": "REPS",
  "loadMode": "EXTERNAL_TOTAL",
  "loadNote": "Carga total, incluida la barra.",
  "muscles": [
    { "muscleGroupId": "{{muscleGroupId}}", "role": "PRIMARY" },
    { "muscleGroupId": "{{secondaryMuscleGroupId}}", "role": "SECONDARY" }
  ],
  "media": [
    {
      "type": "IMAGE",
      "cloudinaryCloudName": "{{cloudName}}",
      "cloudinaryPublicId": "{{imagePublicId}}",
      "cloudinaryDeliveryType": "UPLOAD",
      "cloudinaryVersion": null,
      "cloudinaryFormat": "jpg",
      "position": 0,
      "altText": "Posición inicial del press de banca"
    },
    {
      "type": "VIDEO",
      "cloudinaryCloudName": "{{cloudName}}",
      "cloudinaryPublicId": "{{videoPublicId}}",
      "cloudinaryDeliveryType": "UPLOAD",
      "cloudinaryVersion": null,
      "cloudinaryFormat": "mp4",
      "position": 1,
      "altText": "Demostración del movimiento completo"
    }
  ]
}
```

Sustituye los grupos por UUID devueltos por `options` y los datos de Cloudinary por los reales del panel. `name`, `equipmentType`, `measurementMode` y `loadMode` son obligatorios. `description`, `loadNote`, `muscles` y `media` son opcionales. No se admiten `id` multimedia en creación.

## Actualizar y archivar desde Postman

`PATCH {{baseUrl}}/exercises/{{exerciseId}}`:

```json
{ "name": "Nombre corregido", "loadNote": null }
```

Omitir `muscles` o `media` conserva esa relación. Enviar un array reemplaza la relación completa; `[]` la vacía. Los campos escalares omitidos se conservan; `null` solo se admite para los campos realmente opcionales del esquema, como descripción, aclaración o metadatos multimedia opcionales.

Para conservar y reordenar dos medios existentes, envía sus campos completos y sus UUID obtenidos del detalle:

```json
{
  "media": [
    {
      "id": "{{videoMediaId}}",
      "type": "VIDEO",
      "cloudinaryCloudName": "{{cloudName}}",
      "cloudinaryPublicId": "{{videoPublicId}}",
      "cloudinaryFormat": "mp4",
      "position": 0
    },
    {
      "id": "{{imageMediaId}}",
      "type": "IMAGE",
      "cloudinaryCloudName": "{{cloudName}}",
      "cloudinaryPublicId": "{{imagePublicId}}",
      "cloudinaryFormat": "jpg",
      "position": 1
    }
  ]
}
```

Se conservan `id` y `createdAt` de los medios retenidos. En una composición de galería enviada se omiten los registros que deban eliminarse y se añaden entradas sin `id` para los nuevos. Omitir campos opcionales de un medio enviado los restablece a `null` o al valor predeterminado `UPLOAD`: cada entrada representa sus metadatos completos. El orden lo determina `position`, no la posición del objeto en el array. Las posiciones son enteros no negativos hasta 2147483647, únicos por ejercicio, y pueden tener huecos.

Un UUID ajeno o inexistente produce 400 sin modificarlo; los UUID repetidos, posiciones repetidas y grupos repetidos también se rechazan. Las actualizaciones bloquean la fila del ejercicio para serializar los cambios de galería y archivado; el cambio de posiciones utiliza valores temporales libres para respetar las restricciones SQL. Las escrituras de escalares, músculos y galería son atómicas.

Para vaciar la galería: `PATCH {{baseUrl}}/exercises/{{exerciseId}}` con `{"media":[]}`. Para archivar: `POST {{baseUrl}}/exercises/{{exerciseId}}/archive`, sin cuerpo. No hay borrado físico de ejercicios. Borrar asociaciones no llama a Cloudinary ni elimina archivos remotos.

## Entrega multimedia y configuración

No se necesita configuración de credenciales de Cloudinary. El `cloudinaryCloudName` se recibe y persiste en cada referencia, como define el esquema, por lo que tampoco se añade una variable global `CLOUDINARY_CLOUD_NAME`. No se solicita API key ni API secret.

La resolución centralizada en `CloudinaryUrlService` construye URLs HTTPS públicas para `UPLOAD` utilizando el tipo de recurso, cloud name, `public_id`, versión y formato almacenados. Conserva las barras de las rutas lógicas y codifica sus segmentos. Si no hay versión usa `v1` como separador frente a rutas que podrían parecer transformaciones; esto no significa que se conserve una versión histórica. `cloudinaryVersion`, cuando se envía, debe ser texto decimal positivo dentro del rango `BIGINT` de PostgreSQL.

Para `PRIVATE` y `AUTHENTICATED` se devuelve `url: null`: la firma y la entrega autorizada quedan fuera de esta fase. No se fabrica una URL pública que parezca utilizable para esos recursos. Se consultó la [estructura oficial de las URL](https://cloudinary.com/documentation/image_transformations#transformation_url_structure) y la [identificación y tipos de entrega](https://cloudinary.com/documentation/upload_parameters).

**Registrar una referencia no garantiza que el archivo exista en Cloudinary.** No hay SDK nuevo, llamadas de red durante la consulta, comprobaciones de existencia, subidas, borrados remotos ni sincronización. Renombrar o borrar manualmente el archivo puede dejar referencias inválidas y deberá gestionarse en la integración posterior.

## Errores y pruebas

Los cuerpos usan los DTO y el `ValidationPipe` global existentes: transformación, whitelist y rechazo de propiedades desconocidas. Se rechazan UUID inválidos, enums no reconocidos, posiciones inválidas, referencias con URL/ruta local y versiones fuera de rango.

- 400: validación, referencia inválida, restricciones de datos.
- 401: sesión ausente, inválida o caducada.
- 403: rol insuficiente o protección CSRF.
- 404: ejercicio ausente o archivado en las operaciones normales.
- 409: unicidad o conflicto concurrente; el cliente puede reintentar el conflicto concurrente.
- 503: inicialización de la base o agotamiento del pool de conexiones.

Los errores de Prisma esperables se traducen sin exponer SQL ni metadatos internos. Los errores inesperados mantienen la respuesta genérica 500 de Nest.

Comprobaciones habituales desde `api`: `npm run build`, `npm run lint`, `npm test` y `npm run test:e2e`. Las pruebas de URL y traducción de errores no necesitan red ni PostgreSQL.

Las pruebas de catálogo e2e solo se activan con `CATALOG_TEST_DATABASE_URL` apuntando a una base **local, aislada y desechable**, cuyo nombre empiece por `tororeps_catalog_test_`. Antes de ejecutarlas aplica allí las migraciones existentes con `DATABASE_URL` apuntando a esa misma base y `npx --no-install prisma migrate deploy --config prisma7.config.ts`. Luego ejecuta `npm run test:e2e` con `CATALOG_TEST_DATABASE_URL`. El runner nunca toma la base de desarrollo desde `.env` como destino de limpieza; rechaza expresamente nombres y hosts ajenos. Sin esa variable, la suite de catálogo aparece como omitida. Sus fixtures son sintéticos y la base desechable puede eliminarse al terminar.

La colección importable `postman/exercise-catalog.postman_collection.json` contiene login, consultas, discover, creación con imagen/vídeo, actualización conservando medios, reordenación, vaciado y archivado. Configura sus variables y usa una cuenta apropiada; no incluye contraseñas ni tokens reales.
