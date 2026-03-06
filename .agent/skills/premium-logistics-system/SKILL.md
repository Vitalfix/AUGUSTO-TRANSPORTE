---
name: Premium Logistics System
description: Especialización en desarrollo de sistemas de transporte de alta gama, enfocada en UX Premium (Glassmorphism), optimización de rutas y código escalable.
---

# Skill: Premium Logistics System (El Casal-TRANSPORTE)

Esta skill define los estándares técnicos y visuales para el proyecto El Casal.

## Estándares de Diseño (Premium Aesthetics)

- **Glassmorphism**: Uso consistente de `backdrop-filter: blur()`, bordes semitransparentes y sombras suaves.
- **Paleta de Colores**: Uso de gradientes oscuros (`#0a0a14`) y acentos en dorado/ámbar (`--accent-color`).
- **Responsividad**: Prioridad absoluta a la visualización móvil para choferes y clientes.

## Estándares de Código (Clean Logistics Code)

- **Cero Estilos Inline**: Todos los estilos deben residir en `globals.css` o módulos CSS.
- **Tipado Estricto**: Evitar el uso de `any` en las interfaces de TypeScript, especialmente en modelos de Pedidos y Ubicaciones.
- **Seguridad**: Implementación de Row Level Security (RLS) en cada nueva tabla de Supabase.
- **Simplicidad y Eficiencia**: Valorar siempre la solución más simple y directa que resuelva el problema de forma eficiente (mínimo código, máximo impacto).

## Lógica Logística

- **Geocodificación Dinámica**: Uso de la tabla `locations` para puntos predefinidos.
- **Cálculo de Tarifas**: Lógica centralizada basada en kilómetros o tiempo de espera, según la distancia.
- **Gestión de Estados**: Flujo controlado de pedidos (PENDIENTE -> APROBADO -> EN CURSO -> FINALIZADO).

## Instrucciones para el Agente

1. Antes de crear cualquier UI, verificar el cumplimiento de las variables CSS globales.
2. Al modificar APIs, asegurar la validación de la sesión de administrador mediante encabezados seguros.
3. **Verificación de Base de Datos**: Antes de subir cambios que involucren nuevas columnas o tablas (como `customer_id` en `orders`), verificar siempre que el esquema de la base de datos en Supabase esté sincronizado con el código propuesto para evitar errores de ejecución en producción.
4. **Auto-Auditoría**: Antes de finalizar cualquier tarea o entregar un cambio, realizar un chequeo general del flujo afectado para asegurar que nada se haya roto y prever posibles errores o fallas.
5. Mantener siempre actualizado el `plan_maestro_El Casal.md`.
