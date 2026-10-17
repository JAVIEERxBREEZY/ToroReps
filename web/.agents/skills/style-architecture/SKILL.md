---
name: style-architecture
description: Aplicar la arquitectura de estilos de ToroReps al crear o modificar estilos o plantillas. Reutilizar los tokens y recursos de src/styles/api y las clases compartidas de src/styles/css para evitar código repetido.
---

# Arquitectura de estilos

Las rutas siguientes son relativas a la raíz del proyecto.

- Antes de escribir estilos, revisa `src/styles/api/_index.scss`, sus módulos exportados y los recursos existentes en `src/styles/css`. Comprueba también `src/styles.scss` para saber qué clases y estilos globales se están cargando.
- Importa la API pública siempre con `@use 'api' as api;`, utilizando `api` como namespace. `angular.json` incluye `src/styles` en `stylePreprocessorOptions.includePaths` para resolver la ruta desde cualquier SCSS.
- Usa las variables semánticas exportadas, como `api.$background-app`, `api.$text-primary` y `api.$primary`, en lugar de colores literales, accesos directos a `$colors` o tonos primitivos de `$palette` cuando exista un token adecuado.
- Reutiliza los mixins, funciones y demás tokens exportados que resuelvan la necesidad antes de crear equivalentes locales. Si falta un recurso compartido y su reutilización está justificada, añádelo a la capa correspondiente y expórtalo mediante sus archivos `_index.scss`.
- Si existe una clase global de utilidad o composición apropiada, aplícala en la plantilla y evita repetir sus declaraciones en el SCSS del componente. Verifica que se cargue desde la entrada global; no inventes nombres de utilidades ni importes módulos que emiten CSS global dentro de cada componente.
- Mantén `api` para recursos Sass que no emiten CSS por sí solos y `css` para reglas globales, bases y utilidades. Los componentes consumen la API; la entrada global carga las reglas compartidas una sola vez.
- Si no hay una utilidad adecuada, conserva el estilo específico en el componente. Extrae código compartido cuando haya repetición real; no crees un sistema de utilidades para resolver un único caso.
- Revisa estados de foco, hover, activo, error y deshabilitado con los tokens disponibles y evita duplicar el reset global en componentes.
