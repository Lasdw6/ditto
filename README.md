# Your Chemical Romance

Your Chemical Romance is a Next.js + Convex dating app where people swipe on date ideas instead of faces, then `Chem` opens a room when it sees a strong fit.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Fill in:
   - `NEXT_PUBLIC_CONVEX_URL`
   - `OPENAI_API_KEY`
3. Start the app:

```bash
npm install
npm run dev
```

## Vercel deployment

This repo is set up so Vercel deploys both the frontend and the Convex backend in one build.

### Required Vercel environment variables

- `CONVEX_DEPLOY_KEY`
- `OPENAI_API_KEY`

`NEXT_PUBLIC_CONVEX_URL` is injected during the Vercel build by `npx convex deploy`, so you do not need to hardcode it in Vercel when the build runs through the configured Convex deploy step.

### One-time setup

1. Import the repo into Vercel.
2. Confirm the project root is `ycr` if you are importing from the `ditto` monorepo root.
3. Add `CONVEX_DEPLOY_KEY` in Vercel:
   - use a production deploy key for Production
   - use a preview deploy key for Preview
4. Add `OPENAI_API_KEY` in Vercel for the same environments.
5. Deploy.

### Build behavior

`vercel.json` sets the build command to:

```bash
npx convex deploy --cmd 'npm run build'
```

That means each Vercel deployment:

- pushes the current Convex functions/schema
- resolves the correct Convex URL for that deployment
- runs the Next.js production build against that backend

## Notes

- The AI route handlers export `maxDuration = 60` so Vercel can give them a longer execution limit for model calls.
- If you want local env parity with Vercel, use `vercel env pull` after linking the project.
