# Vistas del Menú del Comedor

Este directorio contiene las vistas para gestionar el menú del comedor en la aplicación NexUS.

## Componentes

### ResidentMenuView
- **Ubicación**: `ResidentMenuView.tsx`
- **Descripción**: Vista para residentes de solo lectura del menú semanal
- **Características**:
  - Visualización del menú organizado por días
  - Comidas agrupadas por tipo (Desayuno, Comida, Cena, Merienda)
  - Indicadores de opciones dietéticas (Vegetariano, Vegano)
  - Visualización de alérgenos
  - Información de fecha formateada
  - Diseño responsivo y visual atractivo

### AdminMenuView
- **Ubicación**: `AdminMenuView.tsx`
- **Descripción**: Vista de administración para gestionar el menú semanal
- **Características**:
  - Visualización completa del menú semanal
  - Botones para agregar comidas a cada día
  - Botones para editar y eliminar comidas existentes
  - Modal de edición/adición de comidas (interfaz visual)
  - Campos para:
    - Nombre de la comida
    - Tipo de comida (Desayuno, Comida, Cena, Merienda)
    - Descripción
    - Alérgenos
    - Marcas dietéticas (Vegetariano, Vegano)
  - Consejos de administración
  - Botón para crear nueva semana

## Tipos de Datos

### `menu.types.ts`
Define las interfaces utilizadas:
- **Meal**: Información de una comida individual
- **MenuDay**: Menú de un día completo
- **MenuWeek**: Menú de una semana completa

## Datos de Ejemplo

Ambas vistas incluyen datos mock de ejemplo que muestran cómo se vería el menú en la práctica.

## Integración

### Para Residentes
- Accesible desde `StudentView` en la pestaña "menu"
- También accesible desde la tarjeta de "Menú" en `StudentHome`
- Ruta: `/frontend/src/components/StudentView.tsx`

### Para Admin
- Accesible desde `AdminView` en la pestaña "kitchen" o "Menú Comedor"
- Se puede acceder desde la métrica del dashboard o directamente del menú lateral
- Ruta: `/frontend/src/components/AdminView.tsx`

## Notas de Implementación

### Sin Funcionalidad Implementada
- Los botones de editar, eliminar y guardar son visuales solamente
- El modal de edición muestra la interfaz pero sin guardar datos
- La funcionalidad de API se implementará en próximas iteraciones

### Estilos
- Utilizan Tailwind CSS para el diseño
- Componentes UI reutilizables de `@/components/ui/`
- Iconos de `lucide-react`
- Paleta de colores consistente con el proyecto

## Próximas Iteraciones

- [ ] Conectar con API backend para obtener datos reales
- [ ] Implementar funcionalidad de guardar cambios
- [ ] Agregar autenticación y permisos
- [ ] Implementar notificaciones de cambios
- [ ] Agregar filtros avanzados (por mes, año, etc.)
- [ ] Exportar menú a PDF
- [ ] Crear historial de versiones del menú
