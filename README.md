# Online Bookstore (Express + EJS + Firebase Firestore)

CRUD web app: manage books (list, view, add, edit, delete) and customer orders
(place, view, edit status/customer, delete). Placing an order reduces stock;
cancelling an order returns it.

## Run locally

```bash
npm install
npm start          # http://localhost:3000
```

With no Firebase credentials it uses an in-memory store (seeded with 3 books).
To use Firestore locally, set the `FIREBASE_SERVICE_ACCOUNT` environment variable
(see below) before `npm start`.

## 1. Firebase setup (free Spark plan, test mode)

1. Go to https://console.firebase.google.com and choose **Add project** (Analytics can be off).
2. **Build -> Firestore Database -> Create database**. Pick any region and choose
   **Start in test mode**, then **Enable**.
3. **Project settings (gear icon) -> Service accounts -> Generate new private key**.
   This downloads a JSON file. Never commit it.

Notes:
- Test mode only sets open security rules (they expire after 30 days). The app uses
  `firebase-admin`, which bypasses security rules, so it works the same either way.
- The service-account key is still required, because the server authenticates with it.
- The `books` and `orders` collections are created automatically on first write.

## 2. Push to GitHub

```bash
git remote add origin https://github.com/<your-user>/<repo>.git
git push -u origin main
```

## 3. Deploy on Render (GitHub integration)

1. Go to https://render.com -> **New -> Web Service** and connect your GitHub repo.
2. Runtime: Node. Build command: `npm install`. Start command: `npm start`. Plan: Free.
3. **Environment -> Add variable** `FIREBASE_SERVICE_ACCOUNT`. Open the downloaded
   JSON file in a text editor and paste its full contents as the value.
4. Click **Create Web Service**. Every `git push` to `main` auto-deploys.

The free tier sleeps when idle, so the first request after a pause can take ~50 seconds.

## 4. Verify

- The page footer shows **Storage: Firebase Firestore** (in-memory means the
  environment variable is missing or wrong).
- Add a book and place an order, then check the `books` and `orders` collections
  in the Firestore console.

## Project structure

```
app.js          Express routes (books and orders CRUD, validation)
db.js           Data layer: Firestore, or in-memory fallback
views/          EJS templates (books/, orders/, partials/)
public/         Static CSS
```
