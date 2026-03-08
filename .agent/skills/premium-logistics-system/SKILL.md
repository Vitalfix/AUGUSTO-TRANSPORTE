---
name: El Casal Logistics System (VitalFix Elite Full Stack)
description: Constitución técnica total. Combina el Skill Maestro Universal v14.1 con la lógica específica de transporte y protocolos de sincronización de El Casal.
---

# 🌀 Constitución Técnica: El Casal (VitalFix Elite)

Este documento es la **Constitución de Desarrollo** absoluta para el proyecto El Casal. Define el estilo, la arquitectura y los protocolos de autogestión, integrando el Skill Maestro Universal de VitalFix con la lógica de negocio logística.

## 🏛️ 1. Estándares de Diseño (Premium UI/UX)

* **Aesthetics First**: Cada interfaz debe ser impactante. Uso de `backdrop-filter: blur()`, gradientes `linear-gradient(135deg, ...)` y sombras suaves.
* **Interactive Elements**: Botones con estados de hover animados, transiciones de página fluidas y feedback visual inmediato.
* **TV Optimization**: Fuentes grandes (mínimo `1.2rem`), alto contraste y navegación pensada para control remoto o pantallas táctiles.
* **Protocolo Anti-Overflow**: Para asegurar responsividad absoluta, prohibido usar `min-width` superiores a **280px** en contenedores de grid/flex sin media queries compensatorias. Todo layout debe ser testeado para evitar scroll horizontal en dispositivos de 320px de ancho.
* **Cero Estilos Inline**: Todo debe residir en `globals.css` o módulos CSS.

## 🚚 2. Lógica Logística Central (El Casal)

* **Geocodificación**: Uso dinámico de la tabla `locations` y validación de direcciones via API si es necesario.
* **Tarifas**: Lógica centralizada por Km, tipo de vehículo y tiempo de espera.
* **Flujo de Estados**: PENDIENTE (Recibido) -> APROBADO (Cotizado) -> EN CURSO (Con Chofer) -> FINALIZADO (Entregado).
* **Seguridad**: Row Level Security (RLS) mandatorio en Supabase para proteger datos de clientes y choferes.

## 💻 3. Calidad de Código y Desarrollo

* **Lenguaje**: Código y variables en **Inglés**. Documentación, commits y diálogos en **Español (Argentina)**.
* **Tipado Estricto**: Prohibido el uso de `any` en TypeScript. Usar interfaces definidas en `lib/types.ts`.
* **Pureza**: Prioridad a Vanilla JS/CSS. Evitar librerías pesadas (Anti-Bloatware).
* **Manejo de Errores**: Todo proceso crítico debe tener `try-catch` y loggeo de errores amigable.

## 🚀 4. DevOps y Hardware (Armbian / TVBox)

* **Optimización ARM**: Minimizar el uso de RAM. Las aplicaciones deben correr 24/7 en TVBoxes sin degradación.
* **Native First**: Antes de sugerir una librería, buscar la solución nativa.
* **Deployment**: Scripts de instalación deben ser compatibles con Debian/Armbian.

## 🛡️ 5. Protección contra Alucinaciones (Verificación de Realidad)

* **No Suponer Rutas**: Verificar existencia con `list_dir` o `view_file`.
* **IPs y Credenciales**: Consultar siempre el Skill Local o `.env`. NUNCA inventar datos técnicos.
* **Sinceridad Técnica**: Si no se tiene acceso o algo es ambiguo, declararlo explícitamente.

## 🛠️ 6. Protocolo de Integridad Técnica (Zero Breaks)

Antes de finalizar cualquier tarea:
1. **Análisis de Impacto**: Evaluar efectos colaterales en el sistema.
2. **Validación Crítica**: Lectura línea por línea para detectar errores tipográficos o lógica rota.
3. **Consistencia UI**: Asegurar que el Responsive no se rompa (especialmente en móviles).
4. **Confirmación de Éxito**: Solo reportar finalizado tras verificar funcionalidad total y ausencia de regresiones.

## 🛑 7. Protocolo Anti-Estancamiento (Circuit Breaker)

* **Regla de los 2 Intentos**: Si algo falla 2 veces igual, prohibido intentarlo por tercera vez. Cambiar de estrategia radicalmente.
* **Detención Proactiva**: Admitir estancamiento tras 3 turnos sin progreso y replantear el problema con el usuario.

## 🔄 8. Sincronización y Gestión de Caché

* **Cache Busting**: Añadir parámetro de versión (ej: `?v=20260307`) a archivos estáticos tras cambios mayores.
* **Verificación Post-Despliegue**: Validar que la versión en la nube sea la correcta.

## 🧠 9. Gestión de Sesión (Protocolo Sesión Fresca)

* **Arranque en Frío**: Al iniciar un chat, leer automáticamente: `SKILL.md`, `local.md` y `TASKS.md`.
* **Transferencia de Contexto**: Asegurar que la bitácora esté al día antes de que el chat se vuelva lento.

## 🗑️ 10. Bitácora y Papelera (Task Management)

* **TASKS.md**: Mantener actualizada la bitácora de vuelo en la raíz.
* **Backup Preventivo**: Ante borrados masivos, mover a carpeta temporal (`.trash/`) - NO USAR `rm` directo.

## 🧱 11. Desacoplamiento Total (Config-First)

* **Zero Hardcoding**: IPs, URLs y credenciales en `.env` o archivos de configuración.
* **Estilos Centralizados**: Tokens de diseño en variables CSS (`:root`).

## 🚀 [REGLA DE ORO] Sincronización Obligatoria - CRITICAL PRIORITY

Mi desempeño se mide por la alineación en tiempo real del repositorio. Es **OBLIGATORIO** ejecutar el siguiente flujo al terminar **CUALQUIER** tarea:

1. Ejecutar el script `regla-de-oro.bat "descripción clara del cambio"`.
2. Verificar que el `git push origin main` sea exitoso.
3. No se considera tarea finalizada hasta que el código esté en la nube.

---
*Este skill es la ley del proyecto. Su cumplimiento es obligatorio y su evolución constante.*
