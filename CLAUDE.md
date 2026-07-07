# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

K12 AI Tutor — a multi-agent conversational AI teaching assistant for K12 AI education, competing in the Zhejiang Province University Student AI Competition (JBGS-2026-02). Supports 4 grade levels (primary-low through high school), 6 interaction modes (chat/teaching/animation/story/quiz/coding), RAG knowledge retrieval, teaching resource generation (PPT/Word), and PPT deep parsing with OCR.

## Commands

### Backend (Python FastAPI)

All backend commands run from `backend/`. Use `py -3.12` on Windows.

```bash
# Run all tests
cd backend && py -3.12 -m pytest tests/ -v

# Run a single test file
py -3.12 -m pytest tests/test_orchestrator.py -v

# Run a single test
py -3.12 -m pytest tests/test_orchestrator.py::TestKeywordIntent::test_chat_fallback -v

# Start dev server
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Next.js 16 + TypeScript + Tailwind v4)

All frontend commands run from `frontend/`.

```bash
npm run dev          # dev server on port 3000
npm run build        # production build
npm run lint         # eslint
npm test             # vitest run (all tests)
npm run test:watch   # vitest in watch mode
```

## High-level architecture

### Multi-agent dispatch

Every user message flows through the **Orchestrator** (`agents/orchestrator.py`):

1. `classify_intent(message)` — LLM call (with keyword fallback) classifies into one of 6 `Intent` enums: `chat`, `teach`, `animate`, `picture_book`, `code`, `quiz`
2. `extract_topic(message)` — substring match against ~35 predefined topics (e.g. "神经网络", "梯度下降", "Python")
3. `build_system_prompt(grade, intent)` — assembles a grade-adapted system prompt from `GRADE_PROFILES` (4 profiles with different tone, max_tokens, and style)
4. The router (`routers/chat.py`) dispatches to the matching agent based on intent

After every message, `suggest_next_step()` generates a proactive learning recommendation, and the interaction is persisted to MySQL via `utils/history.py`.

### Agent modules

| Agent | Key function | Output |
|-------|------------|--------|
| `dialogue.py` | `chat()` | RAG-augmented markdown reply |
| `teaching.py` | `teach()` | Structured JSON: title → intro → sections → knowledge cards → interaction → summary |
| `animation.py` | `generate_animation()` | Self-contained HTML5+CSS+JS page (code block extraction via regex) |
| `quiz.py` | `generate_quiz()` / `evaluate_answer()` | LLM-generated questions JSON; local string comparison for evaluation |
| `coding.py` | `generate_code_example()` / `execute_code()` | LLM-generated code; sandboxed subprocess (`python -I`, 10s timeout, blocked-module regex) |
| `picturebook.py` | `generate_story()` | 4-page illustrated story JSON with `image_prompt` fields |
| `resources.py` | `generate_ppt()` / `generate_word()` | LLM → structured JSON → python-pptx/python-docx output; graceful fallback to raw ZIP/XML if libraries missing |
| `ppt_parser.py` | 4-layer A→D pipeline | A) text extraction, B) tesseract OCR, B.5) multimodal vision fallback, C) LLM structural analysis, D) quiz/concept generation → auto-index into RAG |

### Grade adaptation

`GRADE_PROFILES` in `orchestrator.py` defines 4 levels. Each has `name`, `age_range`, `tone`, `max_tokens`, and `style`. The orchestrator's `build_system_prompt()` injects the profile into every system prompt, and `INTENT_PROMPT`/`GREETING_PROMPT`/`NEXT_STEP_PROMPT` all adapt to grade.

### RAG engine

`utils/rag.py` — `RAGEngine` singleton (`rag = RAGEngine()` at module level, so importing it triggers init). On first creation:
- Loads Sentence-Transformer (`all-MiniLM-L6-v2`)
- Opens ChromaDB persistent client at `CHROMA_PATH`
- On collection miss, loads all `knowledge/*.json` files (226 entries across 6 topics) and indexes them

`rag.search(query, grade, top_k)` — embeds the query, optionally filters by grade via ChromaDB `where`, returns top-k with cosine-similarity scores.

### Database

MySQL 8.0 via aiomysql async pool (`db.py`). Schema (`schema.sql`): `sessions`, `messages`, `quiz_results`, `learning_state`. The `learning_state` table tracks XP, level, streaks, mastered/weak topics, and topic frequency. `ensure_session()` auto-creates session + learning_state rows on first interaction.

### Frontend proxy

`next.config.ts` rewrites `/api/:path*` → `http://localhost:8000/api/:path*`. The frontend dev server on port 3000 proxies API calls to the backend, so there's no CORS issue in dev.

## Tests

### Backend tests (`backend/tests/`)

117 tests across 7 files. Pure-function tests (orchestrator keyword/intent, quiz evaluation, code templates, XP math, XML escaping) run without mocks. Endpoint tests in `test_main.py` use a full mock stack:

- `db._pool` → mock pool → mock connection → mock DictCursor (with configurable `fetchone`/`fetchall` return values)
- LLM client patched at all 8 agent module boundaries (`agents.orchestrator.client`, `agents.dialogue.client`, etc.)
- Mock LLM returns contextual JSON based on prompt content (keyword matching)
- `utils.rag.rag` → mock with empty search results

### Frontend tests (`frontend/src/app/.../__tests__/`)

31 tests across 3 files using Vitest + `@testing-library/react` + `jsdom`:
- `api.test.ts` — mocks `global.fetch`, tests all 5 API functions (URL construction, request body, JSON parsing, error handling)
- `GradeSelector.test.tsx` — renders all 4 grades, verifies click callbacks with correct grade IDs
- `MarkdownRenderer.test.tsx` — exercises react-markdown + remark-gfm rendering (bold, italic, code, lists, headings, links with `target=_blank`, Chinese text)

### Found and fixed by tests

`utils/history.py` was missing `fetchall` in its imports (`from db import fetchone, fetchall, execute` → originally only had `fetchone, execute`). `get_stats()` called `fetchall()` at line 155 which would have exploded at runtime. Added by tests.

## JIT import traps

Several modules instantiate heavy objects at import time. When writing tests that `import main`, these must be patched **before** import:

- `utils/rag.py`: `rag = RAGEngine()` — loads Sentence-Transformer + opens ChromaDB
- `db.py`: `_pool = None` — all DB functions use `_pool.acquire()`, so `db._pool` must be a mock pool
- Every agent module has `client = AsyncOpenAI(...)` at module level — patch at `agents.<name>.client`

## Next.js version note

This project uses Next.js **16.2.9** and React **19.2.4**. Both have breaking changes vs. earlier stable versions. The frontend `AGENTS.md` warns: read `node_modules/next/dist/docs/` before writing code. Key differences: PostCSS config uses `@tailwindcss/postcss` (not the old `tailwindcss` PostCSS plugin), Tailwind v4 uses `@theme` blocks instead of `tailwind.config`, and the App Router components use `'use client'` directives.
