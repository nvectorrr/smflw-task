# Dunder Mifflin Infinity

Enterprise employee portal where you chat one-on-one with your Regional Manager, Michael Scott — streaming, in character, with persistent history. You can also **email** him.

**Live:** https://dc4agmsg9ialh.cloudfront.net  
**Or after registration:** 80f68ea2-234f-4f8d-81a0-a02c92df6a4e@mailslurp.net

## Stack

React + Vite · Supabase (Auth + Postgres) · Node.js Lambda (Function URL) · Claude (`claude-sonnet-4-6`) · SST on AWS · MailSlurp (email) · TypeScript.

## Email channel

Email Michael at **`80f68ea2-234f-4f8d-81a0-a02c92df6a4e@mailslurp.net`** from the address you registered with. A MailSlurp webhook hits an `Email` Lambda, which identifies the employee by their address, generates Michael's reply, emails it back, and stores the thread — it shows up in the portal sidebar with a ✉ badge.

### Why MailSlurp and not AWS SES

Time budget was **~3 hours**, and receiving email is the hard part. AWS SES inbound requires a domain with MX + DKIM records and verification, and sandbox to production access to reply to arbitrary addresses — none of which fit the window (and this AWS account isn't even subscribed to some services, e.g. Transcribe returned `SubscriptionRequiredException` in every region). MailSlurp gives a ready-made inbound address on its own domain (no domain to buy/verify).

## Run

```bash
npm install && (cd frontend && npm install)
# fill .env (see .env.example), run supabase/schema.sql in Supabase
npx sst deploy --stage dev
# wire Michael's inbox + webhook once, using the deployed Email URL:
MAILSLURP_KEY=... node scripts/mailslurp-setup.mjs <EMAIL_LAMBDA_URL>
```
