

## Plan: Add API Documentation Section

Add a new API documentation section below the main upload area on the homepage, showing developers how to use the DeepTrust image analysis API.

### What will be built

A new section on the Index page with:
- **Section header**: "API Documentation" with a brief intro
- **Endpoint card**: Shows `POST /analyze-image` with method badge
- **Request body**: JSON example showing `imageBase64` and `imageUrl` parameters with descriptions
- **Response body**: JSON example showing the full response schema (verdict, confidence, summary, issues, metadata)
- **Code snippet**: A `curl` or `fetch` example showing how to call the API
- **Authentication note**: Mention that requests require an API key header

### Technical approach

1. **New component** `src/components/ApiDocs.tsx` — self-contained API documentation section with:
   - Styled code blocks using `<pre>` with monospace font and syntax-highlighted-style backgrounds
   - Tabs (using existing shadcn Tabs) to switch between request/response examples and code snippets
   - Cards for each endpoint

2. **Update `src/pages/Index.tsx`** — render `<ApiDocs />` below the `</AnimatePresence>` block, inside `<main>` but always visible (not gated by upload/result state). Give it `relative z-10` so it stays above parallax layers.

3. **Fix build errors** in `supabase/functions/analyze-image/index.ts` — cast `fetchErr` and `error` to `Error` type to resolve the TS18046 errors.

### Design
- Matches existing light theme with `bg-card`, `border-border`, and `text-foreground` styling
- Code blocks use a dark/muted background for contrast
- Responsive layout, stacks on mobile

