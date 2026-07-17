# Pulse — Customer Health Tracker

A beginner-friendly LaunchDarkly-branded app for tracking customer health scores.

Built with:

- **HTML** — page structure
- **CSS** — layout and styling
- **JavaScript** — data, filters, detail view, and CSV import

## Live site (GitHub Pages)

Once Pages is enabled for this repo, the app is available at:

**https://aworth919.github.io/customer-health-tracker/**

### Enable Pages (one-time)

1. Open [Settings → Pages](https://github.com/aworth919/customer-health-tracker/settings/pages)
2. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
3. Click **Save**
4. Wait 1–2 minutes, then open the live URL above

Real CSV exports stay local (gitignored) and are not published with the site.

## Open it locally

1. Open the project folder in Cursor.
2. Open `index.html` in your browser  
   (drag it into Chrome/Safari, or use Live Server).

You should see summary stats, search/status filters, and a customer table.

## What you can do

- Add customers (saved in the browser with `localStorage`)
- Click a row for a detail view and editable score drivers
- Import a Looker CSV (for example `enterprise_plan_customers.csv`)
- Sort by customer, owner, health, status, or last touch

## Real CSV data

Customer exports belong on your machine only. This repo gitignores `*.csv` and `data/` so real account data is not pushed to GitHub.

To try the import:

1. Click **Choose CSV file** in the app
2. Select your Looker export
3. Browse, filter, sort, and open account details

## Project files

| File | Role |
|------|------|
| `index.html` | Structure of the page |
| `styles.css` | Look and layout |
| `app.js` | Data + interactive behavior |
| `.gitignore` | Keeps local CSV exports out of git |

## Git basics

```bash
git status
git add .
git commit -m "Describe what changed"
git push
```

For reviewable changes, use a branch + pull request into `main` instead of committing straight to `main`.
