// Data layer. Uses Firebase Firestore when credentials are configured,
// otherwise falls back to an in-memory store so the app can run locally.
const { randomUUID } = require('crypto');

function makeFirestore() {
  const admin = require('firebase-admin');
  const credential = process.env.FIREBASE_SERVICE_ACCOUNT
    ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    : admin.credential.applicationDefault();
  admin.initializeApp({ credential });
  const fs = admin.firestore();

  return {
    mode: 'Firebase Firestore',
    async list(col, orderField) {
      const snap = await fs.collection(col).orderBy(orderField).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async get(col, id) {
      const d = await fs.collection(col).doc(id).get();
      return d.exists ? { id: d.id, ...d.data() } : null;
    },
    async add(col, data) {
      const ref = await fs.collection(col).add(data);
      return ref.id;
    },
    async update(col, id, data) {
      await fs.collection(col).doc(id).update(data);
    },
    async remove(col, id) {
      await fs.collection(col).doc(id).delete();
    },
  };
}

function makeMemory() {
  const data = {
    books: new Map(),
    orders: new Map(),
  };
  const seed = [
    { title: 'The Pragmatic Programmer', author: 'Andrew Hunt', genre: 'Technology', price: 39.99, stock: 12 },
    { title: 'Clean Code', author: 'Robert C. Martin', genre: 'Technology', price: 34.5, stock: 8 },
    { title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'History', price: 18.0, stock: 20 },
  ];
  seed.forEach((b) => data.books.set(randomUUID(), b));

  return {
    mode: 'in-memory (no Firebase credentials found; data resets on restart)',
    async list(col, orderField) {
      return [...data[col].entries()]
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => String(a[orderField]).localeCompare(String(b[orderField])));
    },
    async get(col, id) {
      const v = data[col].get(id);
      return v ? { id, ...v } : null;
    },
    async add(col, doc) {
      const id = randomUUID();
      data[col].set(id, { ...doc });
      return id;
    },
    async update(col, id, doc) {
      data[col].set(id, { ...data[col].get(id), ...doc });
    },
    async remove(col, id) {
      data[col].delete(id);
    },
  };
}

const useFirestore = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
module.exports = useFirestore ? makeFirestore() : makeMemory();
