# Plantilla de portfolio editable

Portfolio monocromo, inmersivo y responsive preparado para editar, publicar en GitHub y desplegar en Cloudflare Workers. La navegación funciona como una secuencia de escenas a pantalla completa con transiciones de profundidad, mediante rueda, gesto vertical, flechas y controles visibles.

La plantilla no contiene nombres reales, logotipos, fotografías, evidencias, métricas verificables ni enlaces externos. Cada espacio visual se muestra como un cuadrado blanco numerado del `00` al `19`.

## Inicio rápido

Requisitos:

- Node.js 22.13 o superior.
- npm 10 o superior.

```bash
npm ci
npm run dev
```

La dirección local aparecerá en la terminal.

## Comandos

```bash
npm run dev          # Desarrollo local
npm run build        # Compilación de producción
npm run preview      # Vista previa de la compilación
npm run test         # Comprobaciones del contenido
npm run deploy:dry   # Validación de despliegue sin publicar
npm run deploy       # Compilar y desplegar en Cloudflare
```

## Editar contenido

- Textos, secciones y datos: `app/page.tsx`.
- Diseño y responsive: `app/globals.css`.
- Título y descripción: `app/layout.tsx`.
- Guía de marcadores visuales: `EDITAR.md`.

La lista `scenes` define el orden de las 15 escenas. La lista `navigation` agrupa esas escenas en las 10 secciones mostradas en el pie de página. Los marcadores de imagen se mantienen separados de las animaciones para poder sustituirlos sin alterar la navegación.

## Controles

- Rueda del ratón o deslizamiento vertical para avanzar y retroceder.
- Flechas arriba/abajo, `Page Up`, `Page Down`, `Inicio` y `Fin`.
- Barra de progreso derecha para saltar directamente a una escena.
- Menú inferior para ir a cada sección principal.

## GitHub

1. Crea un repositorio vacío.
2. Copia estos archivos a la raíz del repositorio.
3. Confirma los cambios y súbelos a la rama `main`.
4. Añade en GitHub Actions los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.

El flujo `.github/workflows/cloudflare-deploy.yml` instala dependencias, compila y despliega cada cambio enviado a `main`. También puede ejecutarse manualmente.

## Cloudflare

El proyecto utiliza Vinext, el plugin oficial de Cloudflare para Vite y Wrangler 4.

- Archivo de configuración: `wrangler.jsonc`.
- Entrada del Worker: `worker/index.ts`.
- Comando de compilación: `npm run build`.
- Comando de despliegue: `npm run deploy`.
- No requiere D1, R2, Images ni secretos de aplicación.

Al compilar, el plugin de Vite genera la configuración de despliegue y los recursos estáticos necesarios para Cloudflare Workers.

## Estructura

```text
.github/workflows/       Despliegue automático desde GitHub
.openai/hosting.json     Configuración compatible con Sites
app/                     Página, metadatos y estilos
build/                   Integración del entorno Sites
public/assets/           Solo tipografías locales
tests/                   Comprobaciones de la plantilla
worker/                  Entrada de Cloudflare Worker
EDITAR.md                Mapa de marcadores numerados
wrangler.jsonc           Configuración de Cloudflare
```

No se incluyen `node_modules`, compilaciones, credenciales ni archivos temporales.
