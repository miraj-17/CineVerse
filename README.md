# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Cloudflare Pages + NexStream setup

1. In Cloudflare, open the **Pages project** connected to this repository.
2. Open **Settings → Variables and Secrets** (sometimes shown under Environment variables).
3. Add a secret named `NEXSTREAM_API_KEY` and paste the key there. Do not add it to a `VITE_` variable or commit it to Git.
4. Make sure the NexStream key is restricted/domain-locked to your live CineVerse domain in NexStream settings if that option is available.
5. Push these files to the connected GitHub repository or upload them through your normal deployment workflow, then wait for a successful Pages deployment.
6. Test a movie and a TV episode.

The key is kept out of the React bundle, but NexStream requires the key in its embedded player URL. That means a determined visitor may still inspect it in the player frame/network. Domain-locking the key is important; this integration does not make a provider-required browser embed key completely secret.

This project uses Cloudflare Pages Functions under `functions/`, so deploy it as a **Cloudflare Pages** project with Functions enabled. A static-only hosting setup will not run `/api/player`.
