# Review dashboard (web)

React 19 + Vite 7 + TypeScript + Tailwind 4 + shadcn/ui (Recharts charts, SheetJS export).
It only reads the files described in `../docs/data-contract.md`.

## Commands

```sh
npm install        # once
npm run dev        # local web app with hot reload (http://localhost:5173)
npm run build      # type-check + build the single file dist/index.html
npm run preview    # serve dist/ as a local web app (http://localhost:4173)
npm run lint
```

## Two modes

**Single self-contained file.** `npm run build` writes one file, `dist/index.html`, with all
JS and CSS inlined and no external requests (system fonts, no CDN). It contains this exact
placeholder:

```html
<script id="dashboard-data" type="application/json">null</script>
```

`build_dashboard.py` copies the file to `data/<app_id>/dashboard.html` and replaces `null` with
that app's `dashboard_data.json` (escaping `</` and `<!--`). When the placeholder holds data the
page uses it and hides the app switcher.

**Local web app.** When the placeholder is `null` (`npm run dev`, `npm run preview`), the page
fetches `data/apps.json` and then `data/<app_id>/dashboard_data.json`. A small Vite plugin in
`vite.config.ts` serves exactly those two kinds of JSON file from `../data/` (anything else under
`/data/` is a 404, and path traversal is rejected). Set `DASHBOARD_DATA_DIR=/some/folder` to serve
a different data folder. The selected app is kept in the URL hash (`#app=<app_id>`, default: the
first app). Opening `dist/index.html` straight from disk without embedded data shows an error,
because browsers block `fetch` on `file://`.

## How data flows

- `src/data/types.ts`: types for the contract.
- `src/data/load.ts`: reads the embedded JSON or fetches it, and normalises every field.
- `src/data/filters.ts`: filter state, date ranges, URL-hash encoding, `applyFilters`.
- `src/data/aggregate.ts`: pure functions for KPIs, chart series and the category summary.
- `src/data/categories.ts`: category labels and the fixed colour palette (config order).
- `src/components/dashboard/*`: header, filters bar, KPI cards, charts, tables, export menu.

All filters (and the view) live in the URL hash, so a filtered view can be bookmarked or shared.

## Excel export

The sheets and columns are defined in one constant, `EXPORT_CONFIG` in `src/export-config.ts`
(sheet name, source `reviews` or `summary`, frozen header, and columns with key, header, width and
optional `type: "date"`). `src/lib/excel.ts` builds the workbook with SheetJS, writes dates as real
Excel dates, and patches in the frozen header row (SheetJS Community Edition cannot write panes).
"All reviews" exports every review with the pipeline's summary; "Filtered reviews" exports the
current selection and recomputes the summary from it.
