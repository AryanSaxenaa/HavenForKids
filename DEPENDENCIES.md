# Dependencies — Never Substitute

This file locks the exact npm package for every concern in the project.
If a tool suggests an alternative, reject it and refer back to this list.

---

## server/

| Concern | Package | Version constraint | Notes |
|---|---|---|---|
| Web framework | `express` | `^4.21` | Not Fastify, not Hono, not Koa |
| TypeScript runtime (dev) | `ts-node` | latest | Dev only |
| Mistral AI | `@mistralai/mistralai` | latest | Official SDK. Not raw fetch. |
| Database client | `@libsql/client` | latest | Turso / libSQL. NOT better-sqlite3 |
| Email | `resend` | latest | NOT nodemailer, NOT sendgrid |
| Input validation | `zod` | `^3` | All inputs validated before processing |
| Security headers | `helmet` | latest | Must be first middleware |
| CORS | `cors` | latest | |
| Rate limiting | `express-rate-limit` | latest | |
| Logging | `pino` + `pino-http` | latest | NOT console.log in production |
| Logging (dev pretty) | `pino-pretty` | latest | Dev only |
| Env vars | `dotenv` | latest | |
| Event bus | `mitt` | `^3` | Shared with game |
| UUID | built-in `crypto.randomUUID()` | N/A | No external UUID package needed |

## game/

| Concern | Package | Version constraint | Notes |
|---|---|---|---|
| Game engine | `phaser` | `^3.90` | NOT Phaser 4 (@phaserjs/phaser) |
| Phaser plugins | `phaser3-rex-plugins` | latest | NinePatch, BBCodeText, virtual gamepad |
| Event bus | `mitt` | `^3` | Same version as server |
| Build tool | `vite` | `^6` | No webpack |
| TypeScript | `typescript` | `^5.7` | |

## dashboard/

| Concern | Package | Version constraint | Notes |
|---|---|---|---|
| UI framework | `react` + `react-dom` | `^18` | NOT Next.js |
| Build tool | `vite` + `@vitejs/plugin-react` | latest | |
| Styling | `tailwindcss` | `^3` | NOT MUI, Chakra, Ant, shadcn |
| Charts | `recharts` | `^2` | NOT chart.js, D3, Victory |
| Animation | `framer-motion` | `^12` | NOT react-spring |
| Icons | `lucide-react` | latest | NOT heroicons, NOT react-icons |
| Event bus | `mitt` | `^3` | Same version as game |
| TypeScript | `typescript` | `^5.7` | |

## shared/

| Concern | Package | Notes |
|---|---|---|
| TypeScript | `typescript` | Types only — zero runtime dependencies |

---

## Packages That Must NEVER Be Used

| Banned package | Why | Use instead |
|---|---|---|
| `better-sqlite3` | Native binding, breaks in Railway containers | `@libsql/client` |
| `sqlite3` / `node-sqlite3` | Same — native binding | `@libsql/client` |
| `sequelize` | ORM overkill for this project | Raw SQL with `@libsql/client` |
| `prisma` | Generates a native binary, Railway issues | Raw SQL with `@libsql/client` |
| `mongoose` | Wrong DB | `@libsql/client` |
| `@mui/material` | Bundle size, wrong aesthetic | Tailwind CSS |
| `@chakra-ui/react` | Bundle size, wrong aesthetic | Tailwind CSS |
| `axios` | Not needed | Built-in `fetch` |
| `node-fetch` | Not needed in Node 20 | Built-in `fetch` |
| `winston` | Verbose config | `pino` |
| `morgan` | Old-style HTTP logging | `pino-http` |
| `uuid` | Not needed | `crypto.randomUUID()` |
| `lodash` | Not needed with modern JS | Native array/object methods |
| `moment` | Deprecated, heavy | `Temporal` API or `date-fns` |
| `electron` | Desktop app — HAVEN is web-only | N/A |
| `@google/generative-ai` | Wrong AI provider | `@mistralai/mistralai` |
| `openai` | Wrong AI provider | `@mistralai/mistralai` |
| `next` | Wrong framework for game/dashboard | React + Vite |
| `phaser-ldtk` | Does not exist on npm | Static PNG + zone coordinates |

---

## Version Lock Notes

- Phaser **3.x** only. Do NOT use `@phaserjs/phaser` (that is Phaser 4, alpha, API is different)
- Tailwind **v3** only. Tailwind v4 has breaking config changes — do not upgrade
- React **18** only. React 19 has breaking changes to Suspense/concurrent features
- Framer Motion is now published as `motion` in v12+ but `framer-motion` still works — use `framer-motion` for consistency
