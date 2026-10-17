---
name: scss-bem
description: Crear o refactorizar estilos y clases de plantillas de ToroReps usando SCSS y BEM. Aplicar al modificar la presentación de componentes o estilos compartidos del proyecto.
---

# SCSS y BEM

- Escribe los estilos nuevos o modificados en archivos `.scss`. En los componentes Angular, referencia el archivo mediante `styleUrl`; evita CSS en línea y atributos `style` para estilos estáticos.
- Importa la API de estilos siempre con `@use 'api' as api;`. El namespace para referenciar sus recursos debe ser `api`, por ejemplo `api.$primary` o `api.$class-prefix`. La ruta se resuelve mediante `stylePreprocessorOptions.includePaths` en `angular.json`.
- Nombra las clases propias de componentes con BEM: `.login`, `.login__input`, `.login__notice--warning`. Un modificador se utiliza junto a su clase base.
- Agrupa los elementos con `&__element` dentro del bloque y los modificadores con `&--modifier` dentro de su elemento o bloque. Evita nombres encadenados como `.login__form__input` y anidamientos que aumenten la especificidad sin necesidad.
- Usa clases explícitas en las plantillas para los estilos de componentes en lugar de selectores genéricos como `h1`, `input` o `button`. `:host`, los pseudoestados y los atributos de estado pueden complementar las clases BEM.
- Conserva los nombres de las utilidades globales existentes; no las renombres para que encajen en BEM. Los resets y las reglas base globales pueden utilizar selectores de elementos.
- Al refactorizar, actualiza las clases de la plantilla y el SCSS conjuntamente, conservando bindings, eventos, semántica y atributos de accesibilidad.
- Comprueba que el SCSS compile y que los estados interactivos y la adaptación a pantallas pequeñas sigan funcionando con las herramientas disponibles.
