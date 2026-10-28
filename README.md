# Online Bookstore (Express + EJS + Firebase Firestore)

CRUD web app: manage books (list, view, add, edit, delete) and customer orders
(place, view, edit status/customer, delete). Cancelling an order returns stock.

## Run locally

```bash
npm install
npm start          # http://localhost:3000
```

With no Firebase credentials it uses an in-memory store (seeded with 3 books).
To use Firestore locally, set `FIREBASE_SERVICE_ACCOUNT` (see below) before `npm start`.

## 1. Firebase setup (free Spark plan)

1. https://console.firebase.google.com -> Add project.
2. Build -> Firestore Database -> Create database (production mode, any region).
3. Project settings -> Service accounts -> Generate new private key (downloads a JSON file).
   Never commit this file.

Collections `books` and `orders` are created automatically on first write.

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Online bookstore"
git branch -M main
git remote add origin https://github.com/<your-user>/<repo>.git
git push -u origin main
```

## 3. Deploy on Render (GitHub integration)

1. https://render.com -> New -> Web Service -> connect your GitHub repo.
2. Runtime: Node. Build command: `npm install`. Start command: `npm start`. Plan: Free.
3. Environment -> add variable `FIREBASE_SERVICE_ACCOUNT` = the full contents of the
   service-account JSON file (paste as a single value).
4. Create Web Service. Every `git push` to `main` auto-deploys.

The page footer shows "Firebase Firestore" when the database connection is configured.
