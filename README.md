# Human or Robot? — The Blind Experiment

HTML + CSS + vanilla JS site, Cloudflare Pages Functions backend, Supabase (Postgres, Auth, private Storage), SheetJS Excel export.

## Folder layout
- `public/` – the website (this is the Cloudflare "build output directory")
  - `index.html`, `css/`, `js/` – quiz, blind game, result card
  - `admin/index.html` – admin sign-in (`/admin`), `admin/dashboard/index.html` – dashboard (`/admin/dashboard`)
  - `_headers` – security headers (including camera permission for selfies)
- `functions/` – Cloudflare Pages Functions (`/api/submit`, `/api/admin/*`, and a server-side gate for `/admin/dashboard`)
- `supabase/schema.sql`, `supabase/make_admin.sql` – database setup
- `.env.example` – names of the variables you must set (no real values)

## Who can do what
- **Visitors** can only submit a result. There is no delete, edit or read endpoint for them, and the database blocks direct access (RLS on, no public policies, privileges revoked).
- **Users can never delete their submission or its photo.** Only an authenticated administrator listed in `admin_users` can delete, through `POST /api/admin/delete`. That endpoint checks the session with Supabase Auth and the `admin_users` table on the server for every request.

## Setup (step by step)

### 1. Create the Supabase project
1. Go to supabase.com, sign in, click **New project**. Pick a name, a strong database password, and a nearby region, then **Create**.
2. Wait until the project finishes starting.

### 2. Create the administrator account (before the SQL step 4)
1. Left menu **Authentication > Users > Add user > Create new user**.
2. Email: `asaduzzamanshwan366@gmail.com`, choose a strong password, tick **Auto Confirm User**, then **Create user**.
3. In **Authentication** settings (Sign In / Providers) turn **off** "Allow new users to sign up" so nobody else can register. Even if they could, only people in `admin_users` get admin access.

### 3. Run the schema
1. Left menu **SQL Editor > New query**.
2. Paste all of `supabase/schema.sql`, click **Run**. This creates the tables, enables Row Level Security, and creates the private bucket `submission-photos` (2 MB limit, JPG/PNG/WEBP only, not public).

### 4. Authorize the administrator
1. New query, paste `supabase/make_admin.sql`, **Run**. The result must show one row with the email above. If it shows none, the Auth user from step 2 does not exist yet.

### 5. Check the photo bucket
**Storage** menu: `submission-photos` must show as **Private**. No storage policies are added on purpose: only the server (secret key) can read, write or delete files.

### 6. Copy your keys
**Project Settings > API Keys** (or **API**): copy the **Project URL**, the **publishable** key (older projects: `anon` key) and the **secret** key (older projects: `service_role` key). Keep the secret key private.

### 7. Private GitHub repository
1. github.com > **New repository**, set **Private**, create it.
2. Upload the contents of this folder (**Add file > Upload files**, drag everything, **Commit**). `.gitignore` keeps secrets out; never upload real keys.

### 8. Cloudflare Pages
1. dash.cloudflare.com > **Workers & Pages > Create > Pages > Connect to Git**, authorize GitHub and pick the repository.
2. Build settings: Framework preset **None**, Build command **empty**, Build output directory **`public`**. Save and Deploy.
3. After the first deploy: project **Settings > Variables and Secrets** (called Environment variables in older dashboards) > **Add**, for **Production** (and Preview if you use it):

| Name | Value | Type |
|---|---|---|
| `SUPABASE_URL` | Project URL from step 6 | Text |
| `SUPABASE_PUBLISHABLE_KEY` | publishable / anon key | Text |
| `SUPABASE_SECRET_KEY` | secret / service_role key | **Secret** (encrypted) |

4. **Deployments > Retry deployment** (or push a commit) so the variables apply.
5. Do not add a `wrangler.toml`; it would make the dashboard variables read-only.

### 9. Open the site
- Public site: `https://YOUR-PROJECT.pages.dev/`
- Admin: `https://YOUR-PROJECT.pages.dev/admin` (signs in, then goes to `/admin/dashboard`)

## Notes
- **Excel export** loads SheetJS from cdnjs on the dashboard only. The free SheetJS build sets column widths but cannot style header cells.
- **Spam protection:** same-origin check, hidden trap field, minimum quiz time, 5 submissions per network per hour (stored as a salted hash), size and type checks (photo content is checked by file signature).
- **Server checks:** the verification score and identity are recomputed on the server; the category must be valid for that identity.
- A visitor's result card is created in their own browser. No public share links exist and private photos never get public URLs; admins see photos through 5-minute signed links.
- No CORS headers are added because the site and API share one origin; cross-site browser requests are rejected.
- If an admin deletes a record, its photo is removed first, then the record. If the photo removal fails, the record is kept.

## Status of this build
Written but **not run against a live Supabase or Cloudflare project**; the first real test is your deployment. See the chat summary for what was checked.
