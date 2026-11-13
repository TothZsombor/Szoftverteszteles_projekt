const express = require('express');
const TodoController = require('./controllers/todo.controller');

const app = express();
app.use(express.json());

app.get('/', (_req, res) => res.json({ msg: 'Hello World' }));

app.get('/api/todos', TodoController.getTodos);
app.get('/api/todos/:id', TodoController.getTodoById);
app.post('/api/todos', TodoController.createTodo);
app.patch('/api/todos/:id', TodoController.updateTodo);
app.delete('/api/todos/:id', TodoController.deleteTodo);

app.use((_req, res) => res.status(404).json({ error: 'Ismeretlen végpont' }));

module.exports = app;
