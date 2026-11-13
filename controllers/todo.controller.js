const TodoModel = require('../models/todo.model');

const isValidId = (id) => typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id);

function respondWithError(res, error) {
  if (error && (error.name === 'ValidationError' || error.name === 'CastError')) {
    return res.status(400).json({ error: 'Érvénytelen adatok' });
  }
  return res.status(500).json({ error: 'Belső szerverhiba' });
}

function validateTodoBody(body, partial = false) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  const allowed = new Set(['title', 'done']);

  if (keys.some((key) => !allowed.has(key))) return null;
  if (partial && keys.length === 0) return null;
  if (!partial && !keys.includes('title')) return null;

  const result = {};
  if (keys.includes('title')) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) return null;
    result.title = body.title.trim();
  }
  if (keys.includes('done')) {
    if (typeof body.done !== 'boolean') return null;
    result.done = body.done;
  } else if (!partial) {
    result.done = false;
  }
  return result;
}

exports.getTodos = async (_req, res) => {
  try {
    const todos = await TodoModel.find();
    return res.status(200).json(todos);
  } catch (error) {
    return respondWithError(res, error);
  }
};


exports.getTodoById = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Érvénytelen azonosító' });
  }
  try {
    const todo = await TodoModel.findById(req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo nem található' });
    return res.status(200).json(todo);
  } catch (error) {
    return respondWithError(res, error);
  }
};


exports.createTodo = async (req, res) => {
  const payload = validateTodoBody(req.body);
  if (!payload) return res.status(400).json({ error: 'Érvénytelen todo adatok' });

  try {
    const created = await TodoModel.create(payload);
    return res.status(201).json(created);
  } catch (error) {
    return respondWithError(res, error);
  }
};


exports.updateTodo = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Érvénytelen azonosító' });
  }
  const payload = validateTodoBody(req.body, true);
  if (!payload) return res.status(400).json({ error: 'Érvénytelen todo adatok' });

  try {
    const updated = await TodoModel.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ error: 'Todo nem található' });
    return res.status(200).json(updated);
  } catch (error) {
    return respondWithError(res, error);
  }
};


exports.deleteTodo = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Érvénytelen azonosító' });
  }
  try {
    const deleted = await TodoModel.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Todo nem található' });
    return res.status(204).send();
  } catch (error) {
    return respondWithError(res, error);
  }
};
