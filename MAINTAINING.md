# Maintaining Opus-Motion

Guidelines for maintaining, updating, and extending the Opus-Motion library and studio.

## 1. Adding New Film Styles

To register a new film style into the catalog:
1. Add an entry to `data/styles.json` with the required schema:
   - `slug`: Unique lowercase identifier (e.g., `clay-stopmotion`).
   - `en`: English title.
   - `cn`: Chinese localized title.
   - `category_en`: Category (e.g., `Stop-Motion & Clay`, `Cinema & Eras`).
   - `line`: One-sentence stylistic synopsis.
   - `film`: Masterwork reference work.
   - `dur`: Default duration in seconds.
   - `uses`: Array of tags (e.g., `["three.js", "clay", "12fps"]`).
   - `prompt`: Full production prompt instructions for AI code generators.
2. If the style includes Clawd character starring roles, set `"is_clawd": true`.

## 2. Adding Clawd Character Rigs

Clawd character rigs are defined in `studio/app.js` inside `renderClawdCharacter(ctx, charKey, time, emotion, viseme, cx, cy, scale)`:
- Implement Bézier vector curves, joint kinematics, and dynamic emotion states (`happy`, `focused`, `surprised`, `curious`, `sad`).
- Map mouth open/close visemes to `viseme` parameters.

## 3. Updating Catalogs & Validation

Run the test suite and JSON validation prior to committing:
```bash
python -m unittest tests/test_catalog.py
python cli.py styles --category Cinema
python cli.py proxy-status
```
