# learnclaudecode

App de estudio gamificada para dominar **Claude Code** con 1 h/día: pretesting, práctica de recuperación, repetición espaciada (FSRS) por concepto, successive relearning, intercalado, calibración de confianza, explicaciones narradas con diagramas y labs reales en la terminal.

Basada en [learnaws](https://github.com/crafter-games/learnaws). Las decisiones y los hitos están en [PLAN.md](PLAN.md) y el diseño del juego en [GDD.md](GDD.md).

```bash
pnpm install
pnpm secrets     # wizard: claves en .env.local y en Dokploy (nunca las pegues en el chat)
pnpm dev
pnpm test        # motor (scheduler, mastery, planner, readiness)
```

Producción: https://learnclaudecode.crafter.run (Dokploy, autodeploy al hacer push a `main`).
