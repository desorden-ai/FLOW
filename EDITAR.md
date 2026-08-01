# Guía de edición

Todos los cuadrados blancos se generan con el componente `ImagePlaceholder` de `app/page.tsx`. No dependen de archivos de imagen.

## Mapa de marcadores

| Número | Uso actual | Sustitución sugerida |
|---|---|---|
| 00 | Marca pequeña de cabecera | Logotipo o monograma |
| 01 | Imagen principal | Retrato o imagen de presentación |
| 02–13 | Mosaico de proyectos | Logotipos, capturas o miniaturas |
| 14–19 | Tarjetas de medios | Charlas, artículos, vídeos o proyectos |

## Sustituir un marcador

1. Guarda tu archivo dentro de `public/media/`.
2. Busca el número en `app/page.tsx`.
3. Sustituye el componente por una etiqueta de imagen local.
4. Añade siempre un texto alternativo descriptivo.

Ejemplo:

```tsx
<ImagePlaceholder number="01" />
```

se convierte en:

```tsx
<img src="/media/retrato.webp" alt="Descripción del retrato" />
```

Después añade el estilo necesario en `app/globals.css`. Evita cargar imágenes desde dominios externos: los archivos locales son más reproducibles en GitHub y Cloudflare.

## Personalizar textos

En `app/page.tsx` puedes modificar:

- `sections`: nombres del menú.
- `roles`: especialidades de portada.
- `experience`: historial profesional.
- `personalNotes`: información personal.
- `stats`: métricas opcionales.
- `cases`: casos de estudio.
- `mediaItems`: tarjetas de medios.

En `app/layout.tsx` cambia el título y la descripción que aparecen al compartir la página. La plantilla no incluye imagen social para respetar el modo sin imágenes.
