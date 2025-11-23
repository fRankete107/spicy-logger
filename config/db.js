require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'spicytool-logs';

const connectionString = `${uri}${dbName}`;

mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log(`Conexión a MongoDB establecida: ${dbName}`))
.catch(err => console.error('Error al conectar a MongoDB:', err));

module.exports = mongoose;
