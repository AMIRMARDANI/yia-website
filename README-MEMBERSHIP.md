# YIA Membership Website

This version adds a real YIA membership application form connected to Supabase.

## Setup
1. Open `supabase-config.js`.
2. Replace `YOUR_SUPABASE_PROJECT_URL` with the Supabase Project URL.
3. Replace `YOUR_SUPABASE_PUBLISHABLE_KEY` with the Supabase Publishable key.
4. Commit both `index.html` and `supabase-config.js` to the `main` branch of the GitHub Pages repository.

Do NOT put a Supabase Secret/Service Role key in the website.

The `members` table should have RLS enabled and an INSERT policy for `public`.
