# ai-core

Sistema de orquestación multi-agente externo, independiente de cualquier proyecto, integrable mediante MCP en Kilo.ai.

## Características

- **Externo**: No se instala dentro de proyectos cliente
- **Stack-agnóstico**: Soporta JS, TS, Python, Go, Rust, PHP, C#
- **MCP Ready**: Integración con Kilo via Model Context Protocol
- **Agentes deterministas**: Código ejecutable, no markdown
- **Memoria controlada**: Persistencia por proyecto con límite configurable

## Uso

```bash
# Ejecución básica
node index.js --project ./mi-proyecto --prompt "analiza el SEO"

# Con modelo
node index.js --project ./mi-proyecto --prompt "refactoriza" --model gpt-4
```

## Estructura

```
src/
├── scanner/      # Detecta lenguaje/framework
├── router/      # Selecciona agente apropiado
├── orchestrator/# Ejecuta agentes
├── agents/      # 6 agentes especializados
├── memory/      # Persistencia JSONL
├── file-engine/ # Diff, backup, apply
└── mcp-server/  # Servidor MCP
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

## Integración con Kilo

Configura el endpoint MCP en Kilo para usar ai-core como herramienta externa.

## Licencia

MIT
