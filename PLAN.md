# learnclaudecode — plan

Misma app de estudio gamificada que [learnaws](https://github.com/crafter-station/learnaws), para dominar **Claude Code**.
Copia de learnaws (sin fork); si mantener ambas pesa, se extrae un paquete compartido (`engine`, `game`).

## Decisiones (grilling, 2026-09-27)

| Tema | Decisión |
|---|---|
| Meta | Núcleo de competencias propias de Claude Code + pista opcional **CCAR-F** (Claude Certified Architect, Foundations: Agentic Architecture 27 %, Claude Code Configuration 20 %, Prompt & Structured Output 20 %, Tool Design & MCP 18 %, Context & Reliability 15 %). No existe un examen solo de Claude Code. |
| Alcance | Claude Code + Agent SDK (MVP); lo básico de la Claude API entra con la pista CCAR-F. Desktop, móvil, Slack, Chrome, computer use, proveedores cloud y administración empresarial quedan como fichas de reconocimiento. ~150–180 conceptos, ~20 grupos. |
| Fuente | `code.claude.com/docs` (221 páginas vía `llms.txt`) + changelog. Nada de braindumps. |
| Frescura | Cada ítem guarda su página fuente y un hash. `pnpm content:refresh` compara los hashes, suspende los ítems afectados hasta que se vuelvan a verificar, reconstruye el RAG y alimenta la isla "Novedades". Más adelante, routine semanal. |
| Formatos nuevos | **Arma la config** (JSON/frontmatter validado contra el esquema, largo), **Completa el comando** (corto), **Ordena** (precedencia de settings, eventos de hooks, carga de CLAUDE.md). |
| Labs | Terminal real + CLI en npm `learnclaudecode` (`login` por código de dispositivo, `lab <n>`, `check`), con verificación determinista de archivos. Funciona en Windows. |
| Contenido | Lo generan, verifican y auditan subagentes de Claude a partir de la documentación oficial, con citas. OpenAI solo en runtime (tutor, TTS, voz, experto BYOK, embeddings). |
| DB | Producción: Postgres en Dokploy. Dev/pruebas con `AUTH_BYPASS`: base en Blaze. Nunca apuntar dev a producción. |
| Visual | Sistema Arcade de learnaws con el campo en terracota `#bf4f2a` (texto blanco 4.81:1, AA) y `#9e3f1f` de acento. |
| Audio | El mismo paquete de learnaws (Juhani Junkala CC0, Kenney, SFX sintetizados, ducking). |
| TTS | Los comandos, flags y archivos se leen en inglés tal como se escriben, con una glosa en español la primera vez en cada unidad. |
| Dominio | `learnclaudecode.crafter.run`, repo `crafter-station/learnclaudecode`, Clerk de producción desde el día 1. |

## Islas de "Descubrir"

1. El loop agéntico y las herramientas
2. Contexto, memoria y caché
3. Settings, permisos y modos (plan mode, auto, sandbox)
4. Comandos y skills
5. Hooks
6. Subagentes y trabajo en paralelo (worktrees, teams, workflows)
7. MCP y plugins
8. Headless, SDK y CI
9. Nube y superficies (web, routines, desktop, remote control)
10. Novedades (dinámica, desde el changelog)

## Labs

1. Primer contacto: instalar, `/init`, un CLAUDE.md útil, `@import`
2. Permisos: `settings.json` con allow/ask/deny y precedencia entre local y proyecto
3. Plan mode y sesiones: `--continue`, `--resume`, nombres
4. Tu primera skill: `SKILL.md`, frontmatter, argumentos, archivos de apoyo
5. Hooks guardianes: `PreToolUse` que bloquea `rm -rf`, `PostToolUse` que formatea
6. Subagente propio: revisor con herramientas limitadas y modelo elegido
7. MCP: servidor de proyecto en `.mcp.json`
8. Worktrees en paralelo y `.worktreeinclude`
9. Headless: `claude -p --output-format json` y JSON schema
10. CI: GitHub Actions que responde a `@claude`
11. Empaqueta un plugin con los labs 4–6 y un marketplace local
12. Agent SDK: agente en TypeScript con una herramienta propia

## Hitos

- **M0**: copia y cambio de marca, base de dev en Blaze, Clerk de producción, repo, deploy vacío en `learnclaudecode.crafter.run`.
- **M1**: syllabus, islas 1–3 y su banco de preguntas con los formatos nuevos. Ya se puede jugar.
- **M2**: islas 4–9, RAG (docs + changelog), experto.
- **M3**: CLI en npm, labs 1–8, reporte a la cuenta.
- **M4**: `content:refresh`, Novedades, labs 9–12, pista CCAR-F.
