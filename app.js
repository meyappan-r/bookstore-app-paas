const path = require('path');
const express = require('express');
const db = require('./db');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const STATUSES = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];

app.use((req, res, next) => {
  res.locals.msg = req.query.msg || '';
  res.locals.storage = db.mode;
  next();
});

// ---------- validation helpers ----------
function parseBook(body) {
  const book = {
    title: (body.title || '').trim(),
    author: (body.author || '').trim(),
    genre: (body.genre || '').trim(),
    price: Number(body.price),
    stock: Number(body.stock),
  };
  const errors = [];
  if (!book.title) errors.push('Title is required.');
  if (!book.author) errors.push('Author is required.');
  if (!Number.isFinite(book.price) || book.price < 0) errors.push('Price must be 0 or more.');
  if (!Number.isInteger(book.stock) || book.stock < 0) errors.push('Stock must be a whole number, 0 or more.');
  return { book, errors };
}

// ---------- home ----------
app.get('/', (req, res) => res.redirect('/books'));

// ---------- books ----------
app.get('/books', wrap(async (req, res) => {
  const books = await db.list('books', 'title');
  res.render('books/index', { books });
}));

app.get('/books/new', (req, res) => {
  res.render('books/form', { book: {}, errors: [], action: '/books', heading: 'Add a new book' });
});

app.post('/books', wrap(async (req, res) => {
  const { book, errors } = parseBook(req.body);
  if (errors.length) {
    return res.status(400).render('books/form', { book, errors, action: '/books', heading: 'Add a new book' });
  }
  await db.add('books', book);
  res.redirect('/books?msg=' + encodeURIComponent('Book added.'));
}));

app.get('/books/:id', wrap(async (req, res) => {
  const book = await db.get('books', req.params.id);
  if (!book) return res.status(404).render('error', { message: 'Book not found.' });
  res.render('books/show', { book });
}));

app.get('/books/:id/edit', wrap(async (req, res) => {
  const book = await db.get('books', req.params.id);
  if (!book) return res.status(404).render('error', { message: 'Book not found.' });
  res.render('books/form', { book, errors: [], action: `/books/${book.id}`, heading: 'Edit book' });
}));

app.post('/books/:id', wrap(async (req, res) => {
  const existing = await db.get('books', req.params.id);
  if (!existing) return res.status(404).render('error', { message: 'Book not found.' });
  const { book, errors } = parseBook(req.body);
  if (errors.length) {
    return res.status(400).render('books/form', {
      book: { ...book, id: req.params.id }, errors, action: `/books/${req.params.id}`, heading: 'Edit book',
    });
  }
  await db.update('books', req.params.id, book);
  res.redirect('/books?msg=' + encodeURIComponent('Book updated.'));
}));

app.post('/books/:id/delete', wrap(async (req, res) => {
  await db.remove('books', req.params.id);
  res.redirect('/books?msg=' + encodeURIComponent('Book deleted.'));
}));

// ---------- orders ----------
app.get('/orders', wrap(async (req, res) => {
  const orders = (await db.list('orders', 'createdAt')).reverse();
  res.render('orders/index', { orders });
}));

app.get('/orders/new', wrap(async (req, res) => {
  const books = (await db.list('books', 'title')).filter((b) => b.stock > 0);
  res.render('orders/new', { books, order: { bookId: req.query.bookId || '' }, errors: [] });
}));

app.post('/orders', wrap(async (req, res) => {
  const books = (await db.list('books', 'title')).filter((b) => b.stock > 0);
  const order = {
    customerName: (req.body.customerName || '').trim(),
    customerEmail: (req.body.customerEmail || '').trim(),
    bookId: req.body.bookId,
    quantity: Number(req.body.quantity),
  };
  const errors = [];
  if (!order.customerName) errors.push('Customer name is required.');
  if (!/^\S+@\S+\.\S+$/.test(order.customerEmail)) errors.push('A valid customer email is required.');
  if (!Number.isInteger(order.quantity) || order.quantity < 1) errors.push('Quantity must be at least 1.');
  const book = order.bookId ? await db.get('books', order.bookId) : null;
  if (!book) errors.push('Please choose a book.');
  else if (order.quantity > book.stock) errors.push(`Only ${book.stock} copies of "${book.title}" in stock.`);

  if (errors.length) return res.status(400).render('orders/new', { books, order, errors });

  await db.update('books', book.id, { stock: book.stock - order.quantity });
  await db.add('orders', {
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    bookId: book.id,
    bookTitle: book.title,
    quantity: order.quantity,
    total: Math.round(book.price * order.quantity * 100) / 100,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  });
  res.redirect('/orders?msg=' + encodeURIComponent('Order placed.'));
}));

app.get('/orders/:id/edit', wrap(async (req, res) => {
  const order = await db.get('orders', req.params.id);
  if (!order) return res.status(404).render('error', { message: 'Order not found.' });
  res.render('orders/edit', { order, statuses: STATUSES, errors: [] });
}));

app.post('/orders/:id', wrap(async (req, res) => {
  const order = await db.get('orders', req.params.id);
  if (!order) return res.status(404).render('error', { message: 'Order not found.' });
  const update = {
    customerName: (req.body.customerName || '').trim(),
    customerEmail: (req.body.customerEmail || '').trim(),
    status: req.body.status,
  };
  const errors = [];
  if (!update.customerName) errors.push('Customer name is required.');
  if (!/^\S+@\S+\.\S+$/.test(update.customerEmail)) errors.push('A valid customer email is required.');
  if (!STATUSES.includes(update.status)) errors.push('Invalid status.');
  if (errors.length) {
    return res.status(400).render('orders/edit', { order: { ...order, ...update }, statuses: STATUSES, errors });
  }
  // Cancelling an order returns its copies to stock.
  if (update.status === 'Cancelled' && order.status !== 'Cancelled') {
    const book = await db.get('books', order.bookId);
    if (book) await db.update('books', book.id, { stock: book.stock + order.quantity });
  }
  await db.update('orders', order.id, update);
  res.redirect('/orders?msg=' + encodeURIComponent('Order updated.'));
}));

app.post('/orders/:id/delete', wrap(async (req, res) => {
  await db.remove('orders', req.params.id);
  res.redirect('/orders?msg=' + encodeURIComponent('Order deleted.'));
}));

// ---------- errors ----------
app.use((req, res) => res.status(404).render('error', { message: 'Page not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { message: 'Something went wrong.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Bookstore running on port ${port} — storage: ${db.mode}`));
