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

## Fase 1: Multi-Model Routing ✅ COMPLETADA

### Qué se implementó:

**Nuevo archivo: `src/llm/model-router.js`**
- `selectModel()`: Selecciona 'heavy' o 'light' basado en:
  - Agentes: security/architecture → heavy, seo/frontend/test → light
  - Complejidad: complexityEstimate > 0.6 → heavy
  - Keywords: 'arquitectura', 'schema', 'JWT' → heavy; 'agregar', 'estilos' → light
  - Fase proyecto: discovery → heavy, ship → light
- `getProviderConfig()`: Obtiene config para el tier seleccionado
- `getProviderStatus()`: Verifica si heavy/light están configurados
- `resolveProvider()`: Resuelve el provider a usar con fallback

**Actualizado `src/llm/index.js`:**
- `initLLM({ heavy, light })`: Inicializa ambos providers
- `selectAndRoute()`: Combina selección con provider
- `getLLMStatus()`: Estado de providers
- `chat()` con soporte para routing
- `loadConfig()`: Carga variables LLM_PROVIDER_HEAVY/LIGHT

**Actualizado `src/mcp-server/index.js`:**
- `generateLLMProposals()` ahora acepta `routingParams`
- Pasa agentIds, complexityEstimate, projectPhase al modelo

**Actualizado config:**
- `config/default.json`: Agregada sección `model_routing`
- `.env.example`: Documentación completa de variables

### Variables de entorno:

```bash
# Light (tareas simples - por defecto)
LLM_PROVIDER_LIGHT=minimax
LLM_API_KEY_LIGHT=tu-key
LLM_MODEL_LIGHT=MiniMax-Text-01

# Heavy (tareas complejas - opcional)
LLM_PROVIDER_HEAVY=anthropic
LLM_API_KEY_HEAVY=tu-key
LLM_MODEL_HEAVY=claude-sonnet-4-20250514
```

---

## Fase 2: Auto-Registro de Proyectos (PRÓXIMA)

### Objetivo:
Cuando ai-core escanea un proyecto que NO está en `_index.json`, se registra automáticamente sin necesidad de edición manual.

### Archivos a modificar/crear:
- `src/agents-bridge.js` — Agregar `autoRegisterProject()`
- Template para `state.json` nuevo

### Flujo planeado:
```
1. Scanner detecta: language=javascript, framework=vue, projectType=landing
2. agents-bridge.matchProject() → null (no encontrado)
3. autoRegisterProject() se activa
4. Infiere: id=nombre-del-folder, type=landing, stack=[Vue 3]
5. Crea entrada en _index.json
6. Crea state.json con phase="discovery"
7. Log: "Nuevo proyecto registrado: mi-landing (Landing, Vue 3)"
```

---

## Estado del proyecto según system_update.md:

| Fase | Estado | Notas |
|------|--------|-------|
| Fase 1: Multi-Model Routing | ✅ Completada | Commit 7138249 |
| Fase 2: Auto-Registro | ✅ Completada | Commit 99afd67 |
| Fase 3: Phase Tracking | ✅ Completada | Commit 516af3e |
| Fase 4: CLI Interactivo | ✅ Completada | Commit 2fd3321 |
| Fase 5: Portabilidad | ✅ Completada | Commit 70b3a4c |
