---
name: Premium Logistics System (VitalFix Elite Enhanced)
description: Especialización en desarrollo de sistemas de transporte de alta gama, integrada con el Skill Maestro Universal de VitalFix. UX Premium, optimización de recursos y protocolos de integridad absoluta.
---

# 🌀 Skill: Premium Logistics System (El Casal-TRANSPORTE)

Este documento combina el **Skill Maestro Universal de VitalFix (v14.0)** con los requisitos específicos del proyecto El Casal. Es la memoria técnica y constitución operativa del proyecto.

## 🏛️ 1. Estándares Globales (VitalFix Universal)

- **Aesthetics First**: Mezcla de Glassmorphism (`backdrop-filter: blur()`), gradientes profundos y sombras suaves.
- **Código y Comunicación**: Código en **Inglés**. Documentación, commits y diálogos en **Español (Argentina)**.
- **Pureza Técnica**: Prioridad a Vanilla JS/CSS (Native-First). Evitar librerías pesadas (Anti-Bloatware).
- **Memoria Local**: El asistente debe leer este archivo, el `TASKS.md` y el plan maestro al iniciar cada sesión (Protocolo Sesión Fresca).
- **Protección contra Alucinaciones**: Prohibido suponer rutas, IPs o credenciales. Verificar siempre con `list_dir` y `view_file`.

## 🎨 2. Estándares de Diseño Específicos (El Casal)

- **Paleta de Identidad**: Gradientes oscuros (`#0a0a14`) con acentos en **dorado/ámbar** (`--accent-color`).
- **Responsividad Extrema**: Diseño fluido optimizado para móviles (choferes) y pantallas grandes/TV (monitoreo).
- **Protocolo Anti-Overflow**: Prohibido usar `min-width` superiores a **280px** en contenedores de grid sin media queries compensatorias. Siempre verificar que no exista scroll horizontal en dispositivos de 320px de ancho.
- **Cero Estilos Inline**: Todo debe residir en `globals.css` o módulos CSS.

## 🛠️ 3. Protocolos de Desarrollo e Integridad

- **Zero Breaks**: Antes de finalizar, realizar análisis de efectos colaterales y validación de sintaxis línea por línea.
- **Tipado Estricto**: Prohibido el uso de `any` en TypeScript.
- **Seguridad Supabase**: Implementación obligatoria de Row Level Security (RLS) en cada tabla.
- **Desacoplamiento (Config-First)**: Prohibido el hardcoding de IPs, URLs o credenciales. Usar `.env` o archivos de configuración.
- **Circuit Breaker**: Si una solución falla 2 veces, detenerse y replantear la estrategia (Regla de los 2 Intentos).

## 🚚 4. Lógica Logística Central

- **Geocodificación**: Uso dinámico de la tabla `locations`.
- **Tarifas**: Lógica centralizada por Km/Tiempo de espera.
- **Flujo de Estados**: PENDIENTE -> APROBADO -> EN CURSO -> FINALIZADO.

## 📋 5. Gestión de Tareas y Papelera

- **TASKS.md**: Mantener actualizada la bitácora de vuelo en la raíz del proyecto.
- **Backup Preventivo**: Ante borrados o cambios masivos, mover archivos a una carpeta temporal (ej: `.trash/`) en lugar de usar `rm` directo.

## 🚀 [REGLA DE ORO] Sincronización Obligatoria - CRITICAL PRIORITY

Mi desempeño se mide por la alineación en tiempo real del repositorio. Es **OBLIGATORIO** ejecutar el siguiente flujo al terminar **CUALQUIER** tarea:

1. Ejecutar el script `regla-de-oro.bat "descripción del cambio"`.
2. Verificar que el `git push origin main` sea exitoso.
3. No se considera tarea finalizada hasta que el código esté en la nube.

---
*Este skill es autodidacta y evolutivo. Si se detecta una mejora técnica, debe incorporarse aquí.*
