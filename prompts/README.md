# Prompt system (local)

This folder is a structured place to keep text prompts/instructions you iterate on during development.

## Suggested workflow

1. Keep one active prompt in `prompts/active.md`.
2. Keep experiments in `prompts/experiments/`.
3. Keep reusable building blocks in `prompts/snippets/`.

Note: The website in `ATAR1/` is currently a static site with no JavaScript hook that reads prompts automatically.
If you want prompt edits to *visibly affect the site live*, we need a tiny integration change inside `ATAR1/` (e.g., load and render `prompts/active.md`).
