---
name: El Casal Logistics System (VitalFix Elite Master)
description: Constitución técnica total. Versión extendida de 23 protocolos universales + Lógica de Negocio El Casal + Regla de Oro.
---

# 🌀 Constitución Técnica Suprema: El Casal (VitalFix Elite)

Este documento es la **Constitución de Desarrollo** absoluta. Integra el **Skill Maestro Universal v14.1** (23 áreas de control) con la especialización logística de El Casal.

## 🏛️ 1. Estándares de Diseño (Premium UI/UX)
* **Aesthetics First**: Cada interfaz debe ser impactante. Uso de `backdrop-filter: blur()`, gradientes y sombras suaves.
* **Interactive Elements**: Botones con estados de hover animados y feedback visual inmediato.
* **TV Optimization**: Fuentes grandes (mínimo `1.2rem`), alto contraste y navegación pensada para pantallas táctiles.
* **Protocolo Anti-Overflow**: Prohibido usar `min-width` superiores a **280px** en contenedores de grid/flex sin media queries compensatorias. Testeo en 320px.

## 🏛️ 2. Arquitectura de Proyectos (Standard Folder Structure)
* `/src`, `/public`, `/skills`, `/scripts`, `/docs`.
* **TASKS.md**: Bitácora de vuelo y estado del proyecto siempre en la raíz.

## 💻 3. Calidad de Código y Desarrollo
* **Lenguaje**: Código/Variables en **Inglés**. Documentación/Diálogos en **Español (Argentina)**.
* **Pureza**: Priorizar Vanilla JS/CSS (Native-First) para dispositivos ARM.
* **Manejo de Errores**: Todo proceso crítico con `try-catch` y loggeo amigable.

## 🚀 4. DevOps y Hardware (Armbian / TVBox / Proxmox)
* **IPs y Redes**: Consultar el Skill Local/`.env` antes de peticiones.
* **Optimization**: Minimizar uso de RAM. Evitar leaks en aplicaciones de "Kiosk Mode".

## 📊 5. Bitácora de Vuelo (Task Management)
* El asistente **DEBE** mantener `TASKS.md`.
* Lectura obligatoria al iniciar sesión para continuidad total.

## ⚡ 6. Rendimiento Armbian-First
* Prohibido usar librerías pesadas si una función nativa de JS lo resuelve.
* Aplicaciones capaces de correr 24/7 en dispositivos de bajos recursos.

## 💬 7. Protocolo de Comunicación Elite
1. Investigación Eficiente (Leer antes de preguntar).
2. Confirmación Técnica (Implementation Plan).
3. Proactividad en mejoras.

## 🛡️ 8. Protección contra Alucinaciones (Verificación de Realidad)
* No suponer rutas, IPs o credenciales. Verificar con herramientas.
* IPs y Credenciales: NUNCA inventar. Preguntar si no están en la configuración.

## 🛠️ 9. Protocolo de Integridad Técnica (Zero Breaks)
Revisión obligatoria: Impacto en dependencias, validación sintaxis línea a línea y consistencia responsiva.

## 🏛️ 10. Sistema de Herencia y Persistencia de Memoria
* `/skills/local.md` es la memoria a largo plazo.
* Guardar allí toda decisión técnica, IP o "hack" descubierto.

## ✨ 11. Filosofía "Menos es Más" (Simplicidad y Eficiencia)
* Minimalismo de Código: Legibilidad sobre astucia.
* Simple UX: Menos pasos para el usuario = mejor diseño.

## 🛑 12. Protocolo Anti-Estancamiento (Circuit Breaker)
* **Regla de los 2 Intentos**: Si falla 2 veces igual, prohibido intentar lo mismo. Replantear estrategia.

## 🔄 13. Protocolo de Sincronización y Gestión de Caché
* **Cache Busting**: Versionado de archivos estáticos (`?v=...`) tras cambios.
* Verificación post-despliegue obligatoria.

## 🧠 14. Gestión de Sesión y Rendimiento (Sesión Fresca)
* Transferencia de contexto a `TASKS.md` antes de que el chat colapse por longitud.

## 🛡️ 15. Protocolo de Alcance y Clarificación (Escudo de Contexto)
* Prioridad al directorio raíz actual. Duda ante órdenes globales ("borrar todo").

## 🗑️ 16. Protocolo de Papelera Temporal (Backup Preventivo)
* **No Borrar, Mover**: Usar `.trash/` o similar antes de cualquier `rm` masivo.

## 🧱 17. Desacoplamiento Total (Config-First)
* **Zero Hardcoding**: Todo valor variable en `.env` o archivos de configuración.

## 📊 18. Arquitectura Visual (Diagramas de Flujo)
* Presentar lógica compleja via Mermaid o listas secuenciales antes de programar.

## 🔍 19. El Modo Perito (Edge Case Testing)
* Análisis de "Puntos de Falla": ¿Qué pasa si falla el internet o el servidor? sugerir mejoras preventivas.

## 🚀 20. Metodología de Desarrollo por Fases (Agile VitalFix)
1. Esqueleto (Lógica) -> 2. Piel (Premium UI) -> 3. Blindaje (Optimización).

## 📋 21. Checklist de Instrucciones (Anti-Olvidos)
* Mapeo de peticiones múltiples al inicio del turno. Validación al cierre.

## 🛠️ 22. Protocolo de Verdad de Hardware (Anti-Error Repetitivo)
* Consulta de precedentes en resúmenes para no sugerir flags o configuraciones que ya fallaron.

## 🐣 23. Protocolo de Inicialización Automática (Auto-Provisioning)
* Detección de vacío y creación mandatoria de `/skills/` y `TASKS.md` en nuevos entornos.

---

## 🚚 [LEGADO EL CASAL] Especialización Logística

24. **Lógica de Negocio**: Geocodificación dinámica, Tarifas centralizadas y Flujo de estados (PENDIENTE -> FINALIZADO).
25. **Tipado Maestro**: TypeScript estricto (No `any`). Interfaces en `lib/types.ts`.
26. **Seguridad Crítica**: Row Level Security (RLS) mandatorio en toda tabla de Supabase.

## 🚀 [REGLA DE ORO] Sincronización Total

27. **Sincronización Mandatoria**: Ejecutar `regla-de-oro.bat` tras **CADA** tarea.
28. **Estado Nube**: La tarea no termina hasta que el `git push` sea exitoso y verificado.

---
*Este skill es la ley del proyecto. Su cumplimiento es obligatorio y su evolución constante.*
