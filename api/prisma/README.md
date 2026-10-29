# Catálogo de ejercicios propios — base de datos v1

Este documento describe el esquema Prisma y su migración PostgreSQL. La API implementada posteriormente se documenta en [EXERCISE-CATALOG.md](../EXERCISE-CATALOG.md). No se han añadido datos iniciales, entrenamientos, ejercicios privados, frontend ni integración remota con Cloudinary.

Se mantienen Prisma 7.10.1, el generador ESM en `api/src/generated/prisma`, UUID generados por PostgreSQL, fechas `timestamptz(3)` y nombres SQL en `snake_case`. La configuración del CLI sigue siendo `api/prisma7.config.ts`.

## Modelos y vocabulario

| Modelo / tabla | Contenido y propósito |
| --- | --- |
| `Exercise` / `exercises` | Nombre, descripción opcional, equipamiento, medida principal, convención de carga y aclaración opcional de esa carga. `archivedAt` permite retirarlo; `createdAt` y `updatedAt` mantienen las fechas. Es exclusivamente el catálogo común, sin propietario. |
| `MuscleGroup` / `muscle_groups` | Nombre y `slug` único de un grupo muscular. Es una tabla porque constituye un vocabulario reutilizable que se podrá ampliar sin cambiar un enum. |
| `ExerciseMuscle` / `exercise_muscles` | Relación muchos a muchos con rol `PRIMARY` o `SECONDARY`. La clave compuesta impide repetir un grupo en el mismo ejercicio. Admite varios músculos principales y secundarios; no obliga a elegir uno solo. |
| `ExerciseMedia` / `exercise_media` | Cero o más referencias a imágenes o vídeos por ejercicio, con posición, texto alternativo opcional y fechas. No almacena archivos. |

Se conservan las distinciones funcionales del diseño técnico v0.1, disponible localmente en `docs/bulls-road-diseno-tecnico-v0.1.md` (el directorio `docs` no se versiona):

- `ExerciseMeasurementMode`: `REPS` o `DURATION`. Son modalidades de definición; no hay repeticiones realizadas ni segundos registrados en el catálogo. Distancia y cardio siguen fuera del alcance.
- `ExerciseLoadMode`: `NONE`, `EXTERNAL_TOTAL`, `PER_HAND`, `ADDED_BODYWEIGHT` o `ASSISTANCE`. No guarda cantidades. `loadNote` aclara, por ejemplo, si una máquina de discos se registra por lado o con la suma total.
- `ExerciseEquipmentType`: `BODYWEIGHT`, `BARBELL`, `DUMBBELL`, `KETTLEBELL`, `CABLE_MACHINE`, `SELECTORIZED_MACHINE`, `PLATE_LOADED_MACHINE`, `ASSISTED_MACHINE`, `RESISTANCE_BAND` u `OTHER`. Se registra el equipamiento principal del ejercicio, independiente de la carga; no hay una tabla por atributo ni un inventario de accesorios. Este vocabulario podrá ampliarse mediante migraciones.

El nombre de un ejercicio no es único: variantes legítimas pueden compartir nombre. La identidad es su UUID. Los grupos musculares se identifican por UUID y su `slug` estable y normalizado, en minúsculas, con palabras separadas por guiones.

## Relaciones, retirada e índices

- Archivar significa asignar `archivedAt`. Las consultas futuras del listado excluirán los archivados; las consultas históricas por identidad deberán poder recuperarlos. No se añade borrado automático ni se asume que una futura FK permitirá eliminar ejercicios referenciados.
- La FK desde `ExerciseMedia` usa `RESTRICT`: no se elimina un ejercicio con referencias multimedia sin tratarlas explícitamente. Archivar no altera su galería.
- La FK desde `ExerciseMuscle` al ejercicio usa `CASCADE` únicamente para sus asociaciones; la FK al grupo muscular usa `RESTRICT` para impedir borrar grupos utilizados. No se eliminan grupos al borrar asociaciones.
- `(archived_at, name, id)` respalda el listado activo con orden estable por nombre y UUID, límite y paginación. La página principal utiliza `GET /exercises/discover`, que selecciona hasta cinco ejercicios activos aleatoriamente; su selección no usa el orden del listado. No se crea una tabla de recomendaciones ni un orden personalizado.
- La clave `(exercise_id, muscle_group_id)` impide duplicados y permite leer los músculos de un ejercicio; el índice inverso `(muscle_group_id, exercise_id)` permite filtrar por grupo y comprobar su FK.
- `(exercise_id, position)` es único en multimedia y sirve para recuperar la galería ordenada. Las posiciones empiezan en cero, pueden tener huecos y se pueden repetir en ejercicios distintos.
- La migración añade `CHECK` para nombres no vacíos, formato de `slug`, posiciones no negativas, versiones positivas y referencias multimedia sin URL ni rutas absolutas habituales. Prisma 7 no expresa estos `CHECK` en su esquema: deben conservarse en las migraciones SQL. No equivalen a validar que un archivo exista en Cloudinary.

No se imponen combinaciones entre equipamiento, carga y medida que el dominio aún no haya restringido. Los servicios posteriores deberán validar los cambios de definición que puedan afectar a referencias históricas y las operaciones de reordenación.

## Referencias a Cloudinary

| Campo de `ExerciseMedia` | Valor persistido |
| --- | --- |
| `cloudinaryCloudName` | `cloud_name` del entorno de producto; es un identificador público, no una credencial. |
| `cloudinaryPublicId` | `public_id` completo de Cloudinary, incluida su ruta lógica si existe. No es el nombre original del archivo, una carpeta local, una URL ni el identificador inmutable `asset_id`. No se le añade la extensión; si el proveedor incluye un punto como parte del identificador, se conserva tal cual. |
| `type` | `IMAGE` o `VIDEO`, correspondientes a `resource_type=image` o `resource_type=video`. |
| `cloudinaryDeliveryType` | `UPLOAD` por defecto, o el tipo real `PRIVATE` / `AUTHENTICATED`. Al resolverlo se traduce al valor del proveedor en minúsculas; estos dos últimos necesitarán la autorización o firma adecuada en la integración futura. |
| `cloudinaryVersion` | `version` opcional del proveedor como entero de 64 bits, para construir URLs con versión y gestionar caché. No identifica una copia histórica garantizada. Los futuros DTO JSON deberán serializar este `BigInt` explícitamente, por ejemplo como texto decimal. |
| `cloudinaryFormat` | Formato opcional de origen, por ejemplo `jpg` o `mp4`, sin punto. Permite conservar la extensión del archivo original; Cloudinary también admite entrega sin extensión. |

Estos campos permiten resolver posteriormente una URL de entrega con la estructura `https://res.cloudinary.com/<cloud_name>/<resource_type>/<delivery_type>/v<version>/<public_id>.<format>`, omitiendo los componentes opcionales cuando corresponda. No se guarda una URL temporal, una firma, una clave API ni un secreto.

Inicialmente los archivos se subirán manualmente al panel. Al implementar los endpoints se enviarán sus identificadores y metadatos desde Postman junto con la asociación al ejercicio. Debe copiarse el `public_id` real del proveedor, no deducirlo de la carpeta visible del panel. Renombrarlo en Cloudinary obliga a actualizar la referencia aquí; sobrescribir un archivo puede requerir actualizar su versión y formato. No se almacena `asset_id` en esta fase.

Un archivo se puede reutilizar en distintos ejercicios; no hay una restricción global de unicidad sobre su referencia. La posición, y no el archivo, es lo que debe ser único dentro de cada galería.

**Eliminar un registro multimedia de PostgreSQL no elimina automáticamente el archivo de Cloudinary.** Tampoco se detecta aquí el borrado manual del archivo remoto. La eliminación remota, detección de referencias compartidas, sincronización y limpieza de archivos huérfanos se abordarán con la integración posterior.

Referencias oficiales consultadas: [identificación de recursos](https://cloudinary.com/documentation/upload_parameters#identification) y [estructura de las URLs de entrega](https://cloudinary.com/documentation/image_transformations#transformation_url_structure).

## Ejercicios personalizados: decisión pendiente

Esta entrega sustituye únicamente las propuestas de propietario y multimedia de v0.1: no se añade `ownerUserId` al catálogo ni se utiliza su antiguo campo único `media_url`. Se respeta la preferencia actual por separar los datos privados, sin implementar todavía su arquitectura.

Antes de crear entrenamientos o plantillas habrá que elegir cómo referenciar ambos tipos:

| Alternativa futura | Consecuencias |
| --- | --- |
| Dos tablas independientes y dos FK opcionales en cada referencia | FK reales a catálogo y ejercicio privado; un `CHECK` exigirá exactamente una. Duplica columnas y parte de las consultas en plantillas, sesiones u otras relaciones. El propietario se comprueba en los servicios. |
| Una identidad común y tablas de detalle separadas | Una FK desde plantillas/sesiones y datos privados con propietario separados. Añade una entidad común, joins y reglas que garanticen exactamente un detalle del tipo adecuado; requerirá migrar las identidades existentes con cuidado. |
| Tabla única con propietario opcional | Simplifica las FK y lecturas unificadas, pero mezcla catálogo y datos privados, exige filtrar siempre por visibilidad y se aparta de la preferencia actual. Se documenta como comparación, no como elección. |

Una pareja libre `(tipo, id)` sin FK no garantiza integridad referencial entre dos tablas y no se adopta implícitamente. Separar tablas también obliga a resolver búsquedas combinadas, paginación, filtros musculares y reutilización de metadatos; no solo dónde guardar el propietario. La estrategia de copias históricas de nombre, medida y convención de carga se concretará al diseñar sesiones, como plantea v0.1.

## Migración y siguiente entrega

La migración `20261022150000_create_exercise_catalog` añade seis enums y cuatro tablas con sus FK, índices y `CHECK`, dentro de una transacción. No modifica usuarios, sesiones ni migraciones anteriores, no resetea la base y no inserta datos.

Comandos desde `api`, utilizando las dependencias instaladas:

```sh
npx --no-install prisma validate --config prisma7.config.ts
npx --no-install prisma migrate status --config prisma7.config.ts
npx --no-install prisma migrate deploy --config prisma7.config.ts
npx --no-install prisma generate --config prisma7.config.ts
npm run build
npm run lint
npm test
npm run test:e2e
```

La revisión de deriva del esquema se puede ejecutar con `npx --no-install prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code --config prisma7.config.ts`; no comprueba los `CHECK` que Prisma no representa, que deben verificarse en PostgreSQL.

Las lecturas paginadas, discover, detalle, escrituras de ejercicios para `ADMIN`, asociación de referencias Cloudinary y archivado están documentados en la API del catálogo. Los grupos se consultan con `GET /exercises/options` y deben cargarse antes de asociarlos. No se ha añadido integración remota con Cloudinary ni configuración de credenciales.
