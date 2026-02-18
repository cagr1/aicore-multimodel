# ai-core

Sistema de orquestación multi-agente externo, independiente de cualquier proyecto, integrable mediante MCP en Kilo.ai.

## Características

- **Externo**: No se instala dentro de proyectos cliente
- **Stack-agnóstico**: Soporta JS, TS, Python, Go, Rust, PHP, C#
- **MCP Ready**: Integración con Kilo via Model Context Protocol
- **Agentes deterministas**: Código ejecutable, no markdown
- **LLM Integrado**: MiniMax, OpenAI, Anthropic
- **Memoria controlada**: Persistencia por proyecto con límite configurable
- **Perfilado automático**: Detecta tipo de proyecto (landing, saas, api...)
- **Router inteligente**: Detecta intención sin keywords explícitas

## Inicio Rápido

```bash
# Clonar e instalar
npm install

# Configurar LLM (opcional)
export LLM_PROVIDER=minimax
export LLM_API_KEY=tu-api-key
export LLM_MODEL=MiniMax-Text-01

# Ejecutar
node index.js --project ./mi-proyecto --prompt "agregar login JWT"
```

Ver [USAGE.md](USAGE.md) para documentación completa.

## Estructura

```
ai-core/
├── index.js              # Entry point
├── USAGE.md              # Guía de uso
├── README.md             # Este archivo
├── plans/
│   └── architecture.md   # Arquitectura del proyecto
└── src/
    ├── scanner/          # Detecta lenguaje/framework
    ├── router/          # Selecciona agente (inteligente)
    ├── orchestrator/    # Coordena ejecución
    ├── agents/          # 6 agentes especializados
    ├── memory/          # Persistencia JSONL
    ├── file-engine/     # Diff, backup, apply
    ├── proposals/       # Propuestas estructuradas
    ├── llm/             # Abstracción LLM
    │   └── providers/   # minimax, openai, anthropic
    ├── profiles/        # Perfiles por proyecto
    └── mcp-server/      # Servidor MCP
```

## Agentes

| Agente | Función |
|--------|---------|
| SEO | Análisis y optimización de motores de búsqueda |
| Code | Análisis y sugerencias de código |
| Frontend | Componentes UI, templates, estilos |
| Backend | APIs, bases de datos, arquitectura |
| Security | Vulnerabilidades y recomendaciones |
| Test | Generación de tests unitarios |

## Proveedores LLM

| Proveedor | Variable |
|-----------|----------|
| MiniMax | `LLM_PROVIDER=minimax` |
| OpenAI | `LLM_PROVIDER=openai` |
| Anthropic | `LLM_PROVIDER=anthropic` |

## Uso CLI

```bash
# Análisis básico
node index.js --project ./mi-proyecto --prompt "optimizar SEO"

# Análisis con propuestas
node index.js --project ./mi-proyecto --prompt "hero animation 3d"

# Preview
node index.js --project ./mi-proyecto --preview <proposal-id>

# Aplicar
node index.js --project ./mi-proyecto --apply <proposal-id>
```

Ver [USAGE.md](USAGE.md) para más ejemplos.

## Integración con Kilo

Configura el endpoint MCP en Kilo para usar ai-core como herramienta externa.

## Licencia

MIT
