const mongoose = require('mongoose');
const app = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/todo-api';

mongoose.connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`A szerver elindult: http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Nem sikerült csatlakozni a MongoDB-hez:', err.message);
    process.exitCode = 1;
  });
