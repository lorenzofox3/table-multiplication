# Académie des Tables

A small PWA to learn the multiplication tables (1–9), themed as a space-opera adventure.
See [docs/SPEC.md](docs/SPEC.md) for the full specification.

## Development

```sh
npm install
npm run dev        # http://localhost:5173/table-multiplication/
npm test           # zora unit tests of the game engine (src/game)
npm run build      # production build in dist/
```

Append `?debug` to the URL to play each scene animation on demand.

PWA icons are generated from `public/favicon.svg` with `npm run icons`.

## Deployment

Every push to `main` runs the tests, builds, and deploys to GitHub Pages
(`.github/workflows/deploy.yml`). In the repository settings, set **Pages → Source** to **GitHub Actions**.
