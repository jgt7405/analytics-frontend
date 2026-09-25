---
name: verify-visually
description: Take desktop and mobile screenshots of pages to check a visual change actually looks right, including scrolled table states. Use after any change to layout, styling, tables or charts, before calling the work done.
---

# Verify visually

```bash
npm run build
npx next start -p 3100 &            # wait until curl -s localhost:3100/robots.txt responds
node scripts/screenshot.mjs --base http://localhost:3100 /football/wins/ /basketball/standings/
# optional: also scroll a table's internal scroll container
node scripts/screenshot.mjs --base http://localhost:3100 --scroll "<css selector>" /football/standings/
```

Screenshots go to `.baseline/screens/<route>.<desktop|mobile>[.scrolled].png` (git-ignored). Open them with the Read tool and actually look: alignment, overflow at 390 px wide, sticky headers, dark text on dark backgrounds, chart labels.

**Cloud sessions can't reach the backend**, so pages render loading skeletons or error states, not data. That is still useful for layout, headers and error handling, but not for tables and charts with data. For those:

- After merging, screenshot production from a GitHub workflow, or ask the owner to check the Vercel preview deployment linked on the pull request (every PR gets one, with real data).
- Step 4 of the plan adds recorded fixtures so data renders offline.

Stop the server afterwards (`kill %1`, or find the `next start` process). Avoid `pkill -f "next start"`: the pattern also matches the shell running it.
