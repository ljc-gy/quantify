# Strategy Card Explanations Design

## Scope

Only the cards in the Strategy Library tab become explainable strategy cards. Cards in the Real-time Position Analysis tab, such as charts, statistics, advice, and holdings tables, keep their current behavior because they are not individual strategies.

## User Experience

Each strategy card is clickable. Clicking a card expands an explanation inside that same card. Clicking it again collapses it. Opening a different strategy closes the previous one, so the grid stays easy to scan.

The expanded explanation uses plain language and avoids technical jargon where possible. It includes:

- One-sentence summary: a simple everyday explanation of what the strategy is trying to do.
- What it watches: the signal, indicator, price behavior, or position rule the strategy depends on.
- When it fits: the market condition where the strategy usually makes sense.
- Main caution: the most important risk or weak spot.

The card shows a small affordance such as "点击查看解释" or "收起解释" so users know the card is interactive.

## Data And Logic

The implementation derives explanations from existing strategy data in `client/src/data/strategies.json`: strategy name, category, keywords, and methods. A small helper function maps each category and common strategy name pattern to clear plain-language text. If a strategy is not recognized by name, the helper falls back to category-level copy plus the existing methods.

This keeps the feature local to the Strategy Library page and avoids adding a backend endpoint or changing the strategy JSON schema.

## Accessibility

Cards use button-like interaction semantics:

- Keyboard users can focus a card and press Enter or Space to toggle it.
- The expanded area is connected to the card with `aria-expanded`.
- Visual hover and focus states make clickable cards discoverable.

## Testing

Add focused frontend tests or the closest available verification for:

- Clicking a strategy card reveals a plain-language explanation.
- Clicking the same card again collapses it.
- Opening a second card closes the first.
- Keyboard activation works with Enter or Space.

If no frontend test runner is configured, verify through lint/build and a browser smoke test.

## Out Of Scope

- No route change or detail page.
- No backend API changes.
- No investment advice wording beyond explaining strategy mechanics and risks.
- No changes to cards outside the Strategy Library tab.
