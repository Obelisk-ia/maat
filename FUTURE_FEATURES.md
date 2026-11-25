# Maat — Hoja de Ruta y Futuras Funcionalidades

Este documento concentra las ideas de evolución para Maat fuera de la **Fase 1 (Mundos de Marca)**, organizadas por fase y valor para dueños y clientes.

---

## Fase 2 — Mecánicas de Retención, Gamificación y Hospitalidad

### 1. Niveles VIP automáticos por tarjetas completadas
- Aprovechar los campos existentes `completedCards` y `visits` en `memberships` para desbloquear niveles configurables por negocio (ej. *Nuevo → Regular → Cliente de Casa / VIP*).
- Evolución visual de la tarjeta al subir de nivel (borde metálico, insignia o *skin* especial dentro de su mundo).
- Beneficios permanentes o sellos acelerados para miembros VIP.

### 2. Regalo de bienvenida ("Primer sello de cortesía")
- Basado en el *endowed progress effect*: permitir que el dueño configure otorgar 1 o más sellos de regalo automáticamente al unirse a la tarjeta.
- Configurable en `Ajustes` (`reward-settings.tsx`).

### 3. Reglas flexibles de sellado
- Permitir configurar en `Ajustes` cómo se acumulan los sellos en lugar del límite fijo de 1 sello por día:
  - 1 sello por día (comportamiento actual).
  - Sin límite diario (1 sello por visita/compra).
  - Múltiples sellos por visita (`+1`, `+2`, `+3` o monto mínimo de compra), registrando en `stampEvents` la cantidad y el miembro del equipo que los otorgó.

### 4. Días de Doble Sello y Horas Muertas (Happy Hour de sellos)
- Reglas por día de la semana u horario (ej. *"Martes = sello doble"*, *"Lunes a jueves de 15:00 a 17:00 = x2"*) para impulsar tráfico en horas flojas.
- Integración directa con el compositor de campañas push para anunciar días de sello doble.

### 5. Reconocimiento de hospitalidad en el Kiosco
- Al escanear al cliente en `StampStation`, mostrar un resumen útil para el staff: número de visita, tarjetas completadas, insignia VIP y alerta si es su cumpleaños o aniversario.
- **Notas internas del equipo** por cliente (ej. *"Pide leche de avena"*, *"Alergia a nuez"*, *"Le gusta mesa en terraza"*), visibles solo para dueño y staff.

### 6. Rachas de visita (*Streaks*) y Retos temporales
- Retos de hábito configurables por el dueño (ej. *"Visita 3 semanas seguidas y gana un postre sorpresa"*).
- Indicador visual de racha dentro del mundo de la tarjeta y recordatorio automático cuando está por perderse.

### 7. Cumpleaños y Aniversario de miembro
- Captura opcional de día y mes de cumpleaños (sin año para minimizar fricción).
- Activación automática de cupón de **Semana de Cumpleaños** (ventana de 7–14 días para fomentar visitas en grupo) y recordatorio push programado.
- Celebración automática del aniversario de primera visita.

### 8. Drops con cupo limitado (FOMO)
- Desde `Campañas push`, permitir crear promociones flash con límite de reclamos y vigencia del día (ej. *"Los primeros 15 miembros que reclamen tienen un rol de pistache gratis hoy"*).
- Botón de reclamo en tiempo real dentro del mundo del negocio con contador de cupos restantes.

---

## Fase 3 — Crecimiento Viral y Reputación Local

### 1. Referidos "Invita a un amigo" (*Treat a Friend*)
- Pase regalable compartible por WhatsApp (*"Te invito un beneficio en [Negocio]"*) que el cliente desbloquea al unirse o al completar una tarjeta.
- Cuando el amigo se registra y obtiene su primer sello, quien invitó recibe automáticamente un sello extra o premio de agradecimiento.

### 2. Misión de reseña en Google Maps y feedback privado
- Solicitud sutil de 1 toque después de canjear un premio o tras la 3ª visita (*"¿Cómo estuvo tu experiencia hoy?"*).
- Calificaciones altas (4–5 estrellas) → acceso directo para publicar reseña en Google Maps.
- Calificaciones bajas (1–3 estrellas) → formulario privado que llega directo al dashboard del dueño para resolver el problema antes de que se vuelva reseña pública.

### 3. Tarjetas compartibles en Stories / WhatsApp
- Generación de imagen visual con la estética del mundo del negocio cuando el cliente completa una tarjeta o desbloquea un premio, lista para compartir en Instagram Stories o WhatsApp.

---

## Fase 4 — Escala Operativa, Ecosistema Móvil y Red Maat

### 1. Multi-sucursal real
- Tabla de sucursales por organización (dirección, horario, enlace de Maps).
- Asignación de staff a sucursal específica y métricas desglosadas por sucursal en el dashboard.
- Selector o lista de sucursales dentro del mundo del negocio.

### 2. Modelo híbrido: Apple Wallet y Google Wallet + PWA
- Botón *"Agregar a Apple Wallet / Google Wallet"* desde la tarjeta del cliente.
- Actualización dinámica de pases vía webhook al sumar sellos o cambiar de nivel.
- Notificaciones por proximidad geográfica (*geofencing*) al pasar cerca del local, enlazando de vuelta al mundo interactivo en la PWA de Maat.

### 3. Sellado inverso y NFC
- QR dinámico temporal en mostrador o etiqueta NFC para que el cliente escanee/acerque su teléfono y sume el sello con validación en tiempo real.

### 4. Enlaces limpios y landing pública por negocio
- Slugs personalizados (ej. `maat.app/m/cafe-sol`) con vista previa inmersiva del mundo del negocio antes de registrarse, ideales para bio de Instagram y Google Business Profile.

### 5. Descubrimiento local opcional
- Sección opcional de negocios cercanos participantes en Maat para impulsar descubrimiento cruzado entre clientes activos de la wallet.
