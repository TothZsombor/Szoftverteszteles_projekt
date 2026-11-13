const mongoose = require('mongoose');

const TodoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  done: {
    type: Boolean,
    required: true,
    default: false,
  },
});

module.exports = mongoose.model('Todo', TodoSchema);
