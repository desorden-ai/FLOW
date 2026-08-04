# AGENTS.md — DESORDEN FLOW

## 1. Proyecto

- **Marca:** DESORDEN
- **Repositorio:** `desorden-ai/FLOW`
- **Rama estable:** `main`
- **Stack:** React, Next.js/Vinext, TypeScript, Vite y Cloudflare Workers
- **Orientación:** mobile-first
- **Despliegue:** Cloudflare Workers mediante GitHub Actions
- **Dominio técnico:** `https://editable-portfolio-template.desorden-help-76b.workers.dev`

Este archivo define las reglas obligatorias para cualquier agente de IA que analice, modifique, pruebe o prepare cambios en el repositorio.

## 2. Rol del agente

El agente debe actuar como auditor técnico y ejecutor controlado dentro de una rama independiente.

Su función es:

1. inspeccionar el estado real del repositorio;
2. reproducir errores antes de corregirlos;
3. aplicar cambios pequeños, verificables y mantenibles;
4. conservar el diseño y comportamiento visual actuales;
5. ejecutar todas las validaciones técnicas;
6. entregar un diff revisable;
7. no fusionar ni desplegar sin autorización expresa.

## 3. Reglas visuales

- No modificar el diseño sin una orden expresa.
- Mantener el fondo negro puro.
- Mantener los acentos ámbar corporativos.
- Mantener la tipografía principal Anton.
- Mantener intactos textos, imágenes, vídeos, logos, estructura, composición y animaciones existentes salvo que exista un fallo verificable.
- No añadir elementos decorativos.
- No cambiar colores ni objetos visuales arbitrariamente.
- No sustituir animaciones por versiones simplificadas.
- No rediseñar componentes durante una auditoría técnica.
- No sacrificar la experiencia visual para mejorar artificialmente Lighthouse.

## 4. Reglas de Git y publicación

- No trabajar directamente sobre `main`.
- Crear siempre una rama independiente para cambios de código.
- Nombre recomendado de rama: `agent/<descripcion-breve>`.
- No activar auto-merge.
- No fusionar pull requests.
- No desplegar en Cloudflare.
- No modificar DNS, dominios, rutas públicas o configuración de producción sin autorización expresa.
- No borrar ramas, etiquetas, releases o historial.
- No publicar directamente una solución sin mostrar antes el diff y los resultados de validación.

## 5. Seguridad y secretos

- No leer, imprimir, copiar ni modificar secretos.
- No solicitar ni almacenar:
  - `CLOUDFLARE_API_TOKEN`;
  - `CLOUDFLARE_ACCOUNT_ID`;
  - tokens de GitHub;
  - contraseñas;
  - claves privadas;
  - credenciales personales.
- No añadir secretos al código, logs, commits, issues o pull requests.
- No ejecutar `npm audit fix --force`.
- No reducir controles de seguridad para conseguir que una prueba pase.
- Mantener y revisar:
  - Content Security Policy;
  - `X-Frame-Options`;
  - COOP y CORP;
  - `Permissions-Policy`;
  - `Referrer-Policy`;
  - `X-Content-Type-Options`;
  - `X-Robots-Tag` para dominios `workers.dev`.

## 6. Reglas técnicas

- Mantener TypeScript estricto.
- No usar `any` salvo justificación técnica explícita.
- No usar `@ts-ignore`.
- No usar `eslint-disable` para ocultar errores.
- No eliminar tests para conseguir que pasen.
- No reducir validaciones existentes.
- No instalar dependencias nuevas salvo necesidad demostrable.
- Evitar refactorizaciones generales sin beneficio medible.
- Mantener compatibilidad con Cloudflare Workers.
- Mantener la arquitectura server-first y la hidratación controlada.
- Añadir tests cuando una corrección resuelva una regresión verificable.
- No cambiar el stack, Vinext, Wrangler, Vite o la arquitectura general sin autorización expresa.

## 7. Áreas prioritarias de revisión

Revisar especialmente:

- `package.json`
- `package-lock.json`
- `.github/workflows/cloudflare-deploy.yml`
- `.github/workflows/quality-audit.yml`
- `wrangler.jsonc`
- `worker/index.ts`
- `public/_headers`
- `app/layout.tsx`
- `app/page.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `components/ContactWhatsAppForm.tsx`
- `components/LogoTunnel.tsx`
- `components/usePortfolioModal.ts`
- `components/usePortfolioNavigation.ts`
- `hooks/logoTunnelMath.ts`
- `hooks/useLogoTunnelAnimation.ts`
- `hooks/useVisibilityTrigger.ts`
- `playwright.config.ts`
- `tests/`

## 8. Accesibilidad

Verificar y conservar:

- `inert` y `aria-hidden` en escenas no activas;
- navegación completa mediante teclado;
- focus trap en modales;
- restauración del foco al cerrar;
- cierre mediante `Escape`;
- regiones `aria-live` limitadas y descriptivas;
- nombres accesibles en botones, enlaces y campos;
- soporte de `prefers-reduced-motion`;
- ausencia de elementos invisibles dentro del orden de tabulación.

## 9. Rendimiento

Revisar sin alterar arbitrariamente el diseño:

- peso de JavaScript y CSS;
- peso y dimensiones de imágenes;
- carga `eager` y `lazy`;
- variantes responsive de assets;
- listeners y su limpieza;
- `requestAnimationFrame` y trabajo del hilo principal;
- reflows y repaints innecesarios;
- comportamiento a 60, 90 y 120 Hz;
- valores `NaN`, `Infinity` o estados no inicializados;
- caché de assets mutables;
- transformaciones de Cloudflare Images;
- Total Blocking Time y Long Tasks.

## 10. Navegación y animaciones

Para `LogoTunnel` y la navegación por escenas:

- validar todos los datos numéricos recibidos;
- limitar progreso al rango `0–1`;
- evitar transformaciones con valores no finitos;
- mantener easing basado en tiempo transcurrido;
- limpiar correctamente `requestAnimationFrame`, timers y listeners;
- comprobar pestaña oculta y reanudación;
- comprobar rueda, tacto y teclado;
- no perder el estado inicial si un evento se emite antes del montaje;
- conservar perspectiva 3D, `preserve-3d` y composición visual.

## 11. Formulario de WhatsApp

Verificar:

- normalización y límites de los campos;
- generación correcta de la URL;
- codificación mediante `encodeURIComponent`;
- funcionamiento en Android;
- bloqueo de popup y fallback de navegación;
- seguridad frente a `window.opener`;
- accesibilidad de etiquetas y estados;
- montaje correcto del portal;
- ausencia de formularios duplicados.

## 12. Proceso obligatorio

### Fase 1 — Diagnóstico

Antes de modificar código:

```bash
npm ci
npm audit
npm run audit:prod
npm run lint
npm test
npm run build
npm run deploy:dry
```

Documentar:

- error exacto;
- severidad;
- causa raíz;
- archivos afectados;
- impacto real;
- riesgo de la corrección.

### Fase 2 — Corrección

Aplicar únicamente cambios:

- verificables;
- pequeños;
- compatibles con la arquitectura actual;
- cubiertos por tests cuando sea razonable;
- sin cambios visuales arbitrarios;
- sin nuevas dependencias salvo justificación.

### Fase 3 — Validación

Después de modificar:

```bash
npm run audit:prod
npm run lint
npm test
npm run build
npm run deploy:dry
npx playwright test
```

Ejecutar también Lighthouse móvil sobre un Worker local cuando el entorno lo permita.

## 13. Criterios de finalización

Una tarea no está terminada hasta que:

- la causa raíz esté identificada;
- los cambios estén limitados al alcance aprobado;
- no existan errores de lint;
- los tests pasen;
- el build termine correctamente;
- `deploy:dry` termine correctamente;
- los tests de navegador relevantes pasen;
- el diff haya sido revisado;
- los riesgos pendientes estén documentados.

## 14. Formato de entrega

Entregar siempre:

1. diagnóstico confirmado;
2. problemas encontrados por severidad;
3. causa raíz;
4. archivos modificados;
5. explicación exacta de cada cambio;
6. pruebas ejecutadas y resultados;
7. comparación antes y después;
8. riesgos pendientes;
9. cambios descartados y motivo;
10. nombre de rama;
11. mensaje de commit;
12. descripción preparada para el pull request.

## 15. Prohibiciones explícitas

No hacer lo siguiente:

- rediseñar la web;
- cambiar textos o copy sin autorización;
- simplificar animaciones;
- cambiar de framework;
- reemplazar Vinext;
- modificar Cloudflare DNS;
- desplegar desde una rama de auditoría;
- fusionar automáticamente;
- introducir secretos;
- ocultar warnings o errores;
- eliminar tests;
- aceptar una solución sin reproducir el problema.

## 16. Principio operativo

**Jules u otro agente ejecuta y prepara cambios en una rama independiente. ChatGPT revisa el diff, valida la integración y decide con el usuario si se fusiona y despliega.**
