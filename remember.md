# Remember - Decisiones y Observaciones del Proyecto

> **Fecha:** 2026-02-26
> **Contexto:** Después de analizar el estado de ai-core y definir el plan en system_update.md

---

## Decisión: Modelo LLM a usar para desarrollo

### Pregunta inicial
> "¿Es necesario usar Opus o puedo seguir con MiniMax 2.5?"

### Respuesta profesional

**No. Puedes implementar las 5 fases con MiniMax 2.5.**

| Fase | Tipo de trabajo | ¿Necesita Opus? |
|------|----------------|-----------------|
| Fase 1: Multi-Model Router | Código Node.js estándar, lógica if/else | No |
| Fase 2: Auto-Registro | Leer/escribir JSON files | No |
| Fase 3: Phase Tracking | File system operations + heurísticas | No |
| Fase 4: CLI Interactivo | UI de terminal | No |
| Fase 5: Portabilidad | Configuración y UX | No |

### Cuándo SÍ se necesitaría un modelo más potente

1. **Decisiones de arquitectura complejas** — "¿Cómo manejar el caso donde ambos providers fallan?"
2. **Refactorización de sistemas complejos** — Cuando hay muchas dependencias interconectadas
3. **Debugging sutil** — Race conditions, memory leaks, edge cases

### Recomendación práctica

**Escalar solo cuando sea necesario:**
- Usar MiniMax 2.5 por defecto
- Si el modelo no entiende lo que quieres, cambiar a Opus solo para esa tarea específica
- Esto es exactamente lo que la Fase 1 implementa para ai-core: usar modelo barato por defecto y escalar al caro solo cuando la complejidad lo requiere

### Costo estimado de implementar las 5 fases

| Enfoque | Costo |
|---------|-------|
| Solo MiniMax 2.5 | ~$0 (gratis) |
| Solo Opus | ~$15-30 (innecesario) |
| **Híbrido (MiniMax + Opus solo para decisiones de arquitectura)** | **~$2-5 (óptimo)** |

---

## Nota para futuras sesiones

- El proyecto está en **Fase 0 → Fase 1** según system_update.md
- La prioridad #1 es **Multi-Model Routing**
- Se puede hacer todo con MiniMax 2.5, escalando a Opus solo cuando sea necesario
- El principio de "modelo correcto para la tarea" aplica tanto para ai-core como para el desarrollo del propio ai-core
