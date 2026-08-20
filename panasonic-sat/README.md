# Panasonic SAT ServicePro — Cloudflare

Aplicación móvil-first privada para gestionar órdenes Panasonic ServicePro sin Firebase ni AppDeploy.

## Arquitectura

- **Cloudflare Access**: acceso por correo/OTP restringido a `desorden.help@gmail.com`.
- **Cloudflare Worker + Static Assets**: frontend y API en el mismo despliegue.
- **Durable Objects (SQLite)**: persistencia de trabajos, agenda, estados y facturación.
- **Workers AI — Gemma 4 Vision**: extracción OCR/visual de capturas de ServicePro.
- **GitHub Actions**: despliegue automático usando los secretos Cloudflare existentes del repositorio FLOW.

## Privacidad

La captura se redimensiona en el navegador, se envía a Workers AI para extracción y **no se almacena**. Solo se persisten los datos técnicos confirmados por el usuario.

## Rama

`PANASONIC-SAT-CF`

## Deploy

Controlado por `.github/workflows/deploy-panasonic-sat.yml` desde `main`.
