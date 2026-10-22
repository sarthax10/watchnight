# Watchnight: the website

The website for [Watchnight](https://sarthax10.itch.io/watchnight), a social deduction horror game.
Live at https://sarthax10.github.io/watchnight/ (GitHub Pages, deployed by `.github/workflows/pages.yml`
on every push to `main`).

```
npm install
npm run dev          # http://localhost:5199
npm run build        # dist/ (SITE_BASE=/watchnight/ for Pages; / by default)
```

The pictures are graded renders of the game (`scripts/grade.py`, `npm run images`); `npm run data`
refreshes the progress log and the view counts in `public/data/`.
