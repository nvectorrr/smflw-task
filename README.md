# Dunder Mifflin Infinity

Enterprise employee portal where you chat one-on-one with your Regional Manager, Michael Scott — streaming, in character, with persistent history.

**Live:** https://dc4agmsg9ialh.cloudfront.net

## Stack

React + Vite · Supabase (Auth + Postgres) · Node.js Lambda streaming (Function URL) · Claude (`claude-sonnet-4-6`) · SST on AWS · TypeScript.

## Run

```bash
npm install && (cd frontend && npm install)
# fill .env (see .env.example), run supabase/schema.sql in Supabase
npx sst deploy --stage dev
```
