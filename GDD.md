# Claude Code Quest (learnclaudecode)

> Eres un desarrollador que recorre 9 islas de Claude Code (loop agéntico, contexto, permisos, skills, hooks, subagentes, MCP y plugins, headless y SDK, nube) jugando rondas cortas y labs reales en la terminal, hasta dominarlo de verdad. Base: learnaws, mismo motor y misma piel Arcade.

| | |
| --- | --- |
| Engine | React + Motion dentro de la app Next.js 16 existente (sin canvas; Phaser no aporta a un juego de UI) |
| Platform | web móvil primero (PWA) + escritorio; multiusuario con registro abierto (Clerk) |
| View | UI 2D: mapa de islas + tarjetas de ronda + diagramas SVG |
| Scope | small release por hitos jugables sobre el motor de estudio actual |
| References | Duolingo (camino, racha, sonidos), Kahoot (botones enormes de color, ritmo), Brilliant (diagramas interactivos en vez de párrafos) |

## Principios (no negociables, vienen de la evidencia)

- El motor de aprendizaje manda: FSRS por concepto, successive relearning 3+3, pretest, interleaving, confianza. El juego es la piel.
- Menos lectura: narración + diagrama (modalidad/pre-training de Mayer), texto a pedido. Letra ≥ 20 px.
- Sin cronómetro ni puntos por velocidad mientras se aprende (la presión de tiempo baja la precisión). El tiempo solo como señal interna.
- Sin rankings ni premios por completar (bajan motivación intrínseca). Feedback informativo, progreso real, racha que no castiga.
- Construir el diagrama uno mismo > verlo hecho (Nesbit & Adesope 2006: g 0.82 vs 0.37).
- Progresión corto → largo: los escenarios largos consolidan; los jefes y simulacros los entrenan con ritmo real.
- La fuente es la documentación oficial (code.claude.com/docs) y el changelog. Cada ítem guarda su página fuente; si la página cambia, el ítem se suspende hasta volver a verificarse.
- Practicar en la terminal real > leer sobre la terminal: los labs se verifican leyendo tus archivos.

## Core loop

Tocar **Jugar** → el motor elige una ronda (Descubrir · Repaso · Mezcla · Jefe) → ~8 ítems en 4–5 min → pantalla de resultado (XP, qué subió, sonido) → siguiente ronda. Meta diaria: 8 rondas (tune) ≈ 40 min + preguntas largas.

## First 30 seconds

1. Mapa de 9 islas con progreso y un botón **Jugar** gigante (y aviso de privacidad la primera vez).
2. Toque en Jugar → "Descubrir: Cómo funciona Claude Code": una voz narra mientras el diagrama tú → Claude → herramientas → tu proyecto se arma por segmentos.
3. Arrastras (o tocas pieza → hueco) los componentes al diagrama; encajan con un "clic".
4. Primera pregunta relámpago en letra grande, leída en voz alta; aciertas → sonido + rebote + XP.

## Controls

| Acción | Teclado | Toque |
| --- | --- | --- |
| Elegir opción | 1–4 / A–D | tocar botón (≥ 56 px alto) |
| Confirmar / siguiente | Enter / Espacio | botón inferior fijo |
| Confianza | Q / W / E | 3 botones |
| Colocar pieza en diagrama | Tab + Enter | arrastrar, o tocar pieza y luego hueco |
| Repetir audio / ES-EN | R / T | botones 🔊 y ES |

## Mechanics

### Formatos de ítem (de fácil a examen)

1. **Relámpago** (corto): ≤ 20 palabras, un requisito → feature (4 botones color+forma).
2. **Esto o aquello** (corto): dos opciones gigantes entre confundibles (`--continue` | `--resume`).
3. **Completa el comando** (corto): escribes el flag, comando o clave literal en un campo tipo terminal; se compara sin importar espacios ni comillas, sí mayúsculas.
4. **Ordena** (largo): tocas los elementos en orden (precedencia de settings, orden de carga de CLAUDE.md, ciclo de eventos de hooks).
5. **Arma la config** (largo): un `settings.json`, frontmatter de `SKILL.md`, `.mcp.json` o bloque de `hooks` con huecos; eliges el valor de cada hueco.
6. **Escenario** (largo): situación de un desarrollador o equipo con un requisito ("para todos los que clonen el repo", "sin tocar otros proyectos"); frases clave resaltadas.
7. **Simulacro**: solo escenarios, sin ayudas; banco reservado solo en simulacros completos.

Los formatos cortos no cuentan para la probabilidad de dominio ni entran a simulacros.

### Rondas

- **Descubrir**: explicación narrada de la unidad (segmentos de 10–15 s, avanza con toque) → construir su diagrama → 4–6 relámpago/esto-o-aquello. Desbloquea los conceptos de la unidad para el motor.
- **Repaso**: conceptos debidos por FSRS, formato según nivel (bronce → relámpago; plata → mini escenario; oro → escenario).
- **Mezcla**: grupos confundibles ya conocidos.
- **Jefe** (por isla, al tener ≥ 60% plata): 8 escenarios largos, sin ayudas.
- **Contrarreloj** (opcional): solo conceptos oro, cuenta regresiva 20 s (tune), ritmo Kahoot.

### XP y niveles

- XP solo por aciertos sin ayuda: base 10; confianza "seguro" +5 si acierta, −5 si falla (calibración); "adivinando" 5 fijo (tune).
- Nivel por servicio = fases del motor: bronce (visto), plata (en repaso), oro (graduado).
- Racha diaria (≥ 1 ronda) con 1 comodín semanal automático.
- Insignias informativas por hito de dominio ("Dominaste los hooks").

## Win, fail, restart

- **Fallo en un ítem**: sonido suave, pista graduada (si hay API key) o explicación verificada; el concepto se reprograma. Nunca "game over".
- **Ronda**: siempre termina con resultado; Jefe perdido (< 70%) → se reintenta tras repasar sus conceptos.
- **Victoria final**: dominio de las 9 islas (2 simulacros ≥ 80%, ningún dominio < 70%) + labs 1–8 verificados. Pista CCAR-F opcional con su propio gate y reporte del resultado real.

## Challenge and progression

Las islas se desbloquean por prerequisitos del syllabus; dentro de cada una los servicios suben de bronce a oro según el motor. El formato de los ítems sube con el nivel del concepto y la cercanía a la fecha meta (últimas 2 semanas: 60%+ escenarios completos).

## Game feel

Acierto: botón rebota (scale 1→1.08→1, 180 ms), destello verde, "ding", vibración 30 ms. Error: sacudida suave 6 px, tono bajo, sin rojo estridente. Pieza encaja: snap con ease-out 120 ms + "clic". Subida de nivel: confeti breve + fanfarria corta. Pantalla de resultado con contador de XP animado.

## Art direction

- **Estilo**: "Arcade" (juego casual móvil): campo terracota punteado (`#bf4f2a`, texto blanco 4.81:1), tarjetas blancas con contorno tinta de 3 px y sombra sólida de volumen, botones gruesos, Lilita One + Nunito, iconos de game-icons.net (CC BY 3.0), cero emojis.
- **Palette**: campo `#bf4f2a` / `#9e3f1f` · tinta `#1c1840` · tarjetas blancas · primario amarillo `#ffc933` · opciones rojo/azul/ámbar/verde con forma ▲◆●■ · código en bloque tinta con texto blanco y monoespaciada.
- **Legibilidad**: preguntas 20 px, opciones 24 px (botón A+ hasta 150%), contraste ≥ 4.5:1, líneas ≤ 60 caracteres, color nunca como único código (símbolos ▲◆●■).
- **HUD de ronda**: barra de progreso de la ronda, XP, botones 🔊 / ES / A+ arriba; botón de acción fijo abajo.

## Audio

- **Narración**: OpenAI TTS pre-generada y cacheada para contenido compartido (explicaciones y preguntas); auto-lectura activable. Comandos, flags, eventos y archivos se pronuncian en inglés tal como se escriben; glosa en español la primera vez por unidad. Las respuestas de "Completa el comando" nunca se leen en voz alta.
- **Música**: chiptune en loop (Juhani Junkala, CC0): Title Screen en el hub, Level 1/2/3 rotando por ronda, Ending en el resultado. Encendida por defecto con interruptor "Música"; volumen 0.28 hub / 0.13 en ronda (leer necesita silencio relativo), baja a 20% mientras suena la narración y se silencia en la llamada con el experto. Jingles 8-bit (Kenney, CC0) al empezar ronda, terminarla y subir de nivel.
- **SFX**: ver tabla de assets. Vibración en móvil.

## Multiusuario

- Registro abierto (Clerk). Todo dato de progreso tiene `userId`; los datos actuales se migran al dueño.
- **API key de OpenAI por usuario** (BYOK), cifrada AES-256-GCM, nunca devuelta al cliente. Sin key la app funciona; se apagan tutor, corrección y voz.
- La key del servidor solo se usa para el pipeline de contenido y el audio compartido.
- Admin (dueño): panel con usuarios, actividad, avance, predicción vs resultado real, feedback. Aviso de privacidad y borrado de cuenta.
- Rate limiting por usuario; TTS de texto libre no se cachea.

## Assets

| Key | Description | Source | Status |
| --- | --- | --- | --- |
| sfx-correct | acierto corto brillante | kenney:interface-sounds | todo |
| sfx-wrong | error suave grave | kenney:interface-sounds | todo |
| sfx-snap | pieza encaja | kenney:interface-sounds | todo |
| sfx-levelup | fanfarria corta | kenney:interface-sounds / generate | todo |
| sfx-streak | whoosh de racha | kenney:interface-sounds | todo |
| narration-* | narración por servicio | generate (OpenAI TTS, cache) | todo |
| font-ui | Geist (ya incluida) | next/font | done |

## Milestones

0. **M0**: copia de learnaws con marca Claude Code, base dev en Blaze, Clerk de producción (solo email y contraseña), repo y deploy en `learnclaudecode.crafter.run`.
1. **M1**: syllabus (202 conceptos, 74 unidades, 9 islas), formatos ordena / completa el comando / arma la config, contenido de las islas 1–3 generado y verificado a ciegas por subagentes de Claude.
2. **M2**: islas 4–9, RAG sobre la documentación y el changelog, experto.
3. **M3**: CLI `learnclaudecode` en npm (login por código de dispositivo, `lab`, `check`) y labs 1–8.
4. **M4**: `content:refresh` por hash de página, isla Novedades, labs 9–12, pista CCAR-F.

## Out of scope for v1

Multijugador, rankings, grupos de estudio cooperativos (candidato v2), música adaptativa, avatar/personaje.

## Changelog

- 2026-09-27: GDD de learnclaudecode a partir del de learnaws (grilling en 3 rondas; decisiones en PLAN.md).
- 2026-09-27: M0 listo (repo, Dokploy, Postgres, Blaze dev, Clerk prod solo email+contraseña, paleta terracota).
- 2026-09-27: M1 contenido de las islas 1–3: 26 unidades, 70 conceptos, 367 preguntas (232 escenario, 88 comando, 16 ordena, 31 config) y 234 relámpago; generado por subagentes de Claude desde la documentación oficial y verificado a ciegas por otro subagente (5 ítems descartados, 31 corregidos). Diagramas limitados a 3 nodos por fila para el teléfono.
