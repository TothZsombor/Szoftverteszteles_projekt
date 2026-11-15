jest.mock('../models/todo.model', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

const TodoModel = require('../models/todo.model');
const TodoController = require('../controllers/todo.controller');
const httpMocks = require('node-mocks-http');
const newTodo = require('./mock-data/new-todo.json');

const validId = '507f1f77bcf86cd799439011';
const anotherId = '507f191e810c19729de860ea';
const storedTodo = { _id: validId, title: 'Todo1', done: false };

function makeReq({ params = {}, body = {} } = {}) {
  return httpMocks.createRequest({ params, body });
}


function makeRes() {
  return httpMocks.createResponse();
}


beforeEach(() => {
  jest.resetAllMocks();
});

describe('1. csapattag | GET /api/todos', () => {

  test('1. a TodoModel.find függvényt pontosan egyszer hívja meg', async () => {
    TodoModel.find.mockResolvedValue([]);
    await TodoController.getTodos(makeReq(), makeRes());
    expect(TodoModel.find).toHaveBeenCalledTimes(1);
    expect(TodoModel.find).toHaveBeenCalledWith();
  });


  test('2. sikeres lekérés esetén 200 a státuszkód', async () => {
    TodoModel.find.mockResolvedValue([storedTodo]);
    const res = makeRes();
    await TodoController.getTodos(makeReq(), res);
    expect(res.statusCode).toBe(200);
  });


  test('3. több találatot JSON-tömbként küld vissza', async () => {
    const items = [storedTodo, { _id: anotherId, title: 'Todo2', done: true }];
    TodoModel.find.mockResolvedValue(items);
    const res = makeRes();
    await TodoController.getTodos(makeReq(), res);
    expect(res._getJSONData()).toEqual(items);
  });


  test('4. találat nélkül 200 és üres tömb a válasz', async () => {
    TodoModel.find.mockResolvedValue([]);
    const res = makeRes();
    await TodoController.getTodos(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual([]);
  });


  test('5. váratlan adatbázishiba esetén 500-at ad', async () => {
    TodoModel.find.mockRejectedValue(new Error('DB offline'));
    const res = makeRes();
    await TodoController.getTodos(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });


  test('6. 500-nál nem szivárogtatja ki a belső hibaüzenetet', async () => {
    TodoModel.find.mockRejectedValue(new Error('titkos szerveradat'));
    const res = makeRes();
    await TodoController.getTodos(makeReq(), res);
    expect(res._getJSONData()).toEqual({ error: 'Belső szerverhiba' });
  });
});

describe('1. csapattag | GET /api/todos/:id', () => {
  test('1. az URL-ből kapott id-val hívja a findById-t', async () => {
    TodoModel.findById.mockResolvedValue(storedTodo);
    await TodoController.getTodoById(makeReq({ params: { id: validId } }), makeRes());
    expect(TodoModel.findById).toHaveBeenCalledTimes(1);
    expect(TodoModel.findById).toHaveBeenCalledWith(validId);
  });

  test('2. megtalált todo esetén 200 és a todo JSON-adat a válasz', async () => {
    TodoModel.findById.mockResolvedValue(storedTodo);
    const res = makeRes();
    await TodoController.getTodoById(makeReq({ params: { id: validId } }), res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual(storedTodo);
  });

  test('3. létező formátumú, de nem található id-ra 404-et ad', async () => {
    TodoModel.findById.mockResolvedValue(null);
    const res = makeRes();
    await TodoController.getTodoById(makeReq({ params: { id: validId } }), res);
    expect(res.statusCode).toBe(404);
    expect(res._getJSONData()).toEqual({ error: 'Todo nem található' });
  });

  test('4. hibás id-ra 400-at ad, és nem kérdez le adatbázist', async () => {
    const res = makeRes();
    await TodoController.getTodoById(makeReq({ params: { id: 'hibas-id' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'Érvénytelen azonosító' });
    expect(TodoModel.findById).not.toHaveBeenCalled();
  });

  test('5. váratlan adatbázishibára 500-at és biztonságos üzenetet ad', async () => {
    TodoModel.findById.mockRejectedValue(new Error('belső részletek'));
    const res = makeRes();
    await TodoController.getTodoById(makeReq({ params: { id: validId } }), res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Belső szerverhiba' });
  });

  test('6. Mongoose CastError esetén 400-at és validációs üzenetet ad', async () => {
    const error = new Error('ID átalakítási hiba');
    error.name = 'CastError';
    TodoModel.findById.mockRejectedValue(error);
    const res = makeRes();
    await TodoController.getTodoById(makeReq({ params: { id: validId } }), res);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'Érvénytelen adatok' });
  });
});

describe('2. csapattag | DELETE /api/todos/:id', () => {
  test('1. a helyes id-val egyszer hívja a findByIdAndDelete-et', async () => {
    TodoModel.findByIdAndDelete.mockResolvedValue(storedTodo);
    await TodoController.deleteTodo(makeReq({ params: { id: validId } }), makeRes());
    expect(TodoModel.findByIdAndDelete).toHaveBeenCalledTimes(1);
    expect(TodoModel.findByIdAndDelete).toHaveBeenCalledWith(validId);
  });

  test('2. sikeres törlés 204-es, üres és lezárt HTTP-választ ad', async () => {
    TodoModel.findByIdAndDelete.mockResolvedValue(storedTodo);
    const res = makeRes();
    await TodoController.deleteTodo(makeReq({ params: { id: validId } }), res);
    expect(res.statusCode).toBe(204);
    expect(res._getData()).toBe('');
    expect(res._isEndCalled()).toBe(true);
  });

  test('3. nem létező rekord törlése 404-et ad', async () => {
    TodoModel.findByIdAndDelete.mockResolvedValue(null);
    const res = makeRes();
    await TodoController.deleteTodo(makeReq({ params: { id: validId } }), res);
    expect(res.statusCode).toBe(404);
    expect(res._getJSONData()).toEqual({ error: 'Todo nem található' });
  });

  test('4. hibás id-t elutasít 400-zal, és nem hívja a modellt', async () => {
    const res = makeRes();
    await TodoController.deleteTodo(makeReq({ params: { id: 'rossz' } }), res);
    expect(res.statusCode).toBe(400);
    expect(TodoModel.findByIdAndDelete).not.toHaveBeenCalled();
  });

  test('5. váratlan adatbázishibára 500-at és általános hibaüzenetet ad', async () => {
    TodoModel.findByIdAndDelete.mockRejectedValue(new Error('titkos DB üzenet'));
    const res = makeRes();
    await TodoController.deleteTodo(makeReq({ params: { id: validId } }), res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Belső szerverhiba' });
  });

  test('6. Mongoose CastError esetén 400-at ad', async () => {
    const error = new Error('sikertelen típuskonverzió');
    error.name = 'CastError';
    TodoModel.findByIdAndDelete.mockRejectedValue(error);
    const res = makeRes();
    await TodoController.deleteTodo(makeReq({ params: { id: validId } }), res);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'Érvénytelen adatok' });
  });
});

describe('2. csapattag | POST /api/todos', () => {
  test('1. eltávolítja a title szóközeit, és alapértelmezetten done=false értéket ment', async () => {
    TodoModel.create.mockResolvedValue(storedTodo);
    await TodoController.createTodo(makeReq({ body: { title: '  Todo1  ' } }), makeRes());
    expect(TodoModel.create).toHaveBeenCalledTimes(1);
    expect(TodoModel.create).toHaveBeenCalledWith({ title: 'Todo1', done: false });
  });

  test('2. sikeres létrehozáskor 201-et és a létrejött objektumot adja vissza', async () => {
    TodoModel.create.mockResolvedValue(storedTodo);
    const res = makeRes();
    await TodoController.createTodo(makeReq({ body: newTodo }), res);
    expect(res.statusCode).toBe(201);
    expect(res._getJSONData()).toEqual(storedTodo);
  });

  test('3. a kifejezetten megadott done=true értéket elfogadja', async () => {
    TodoModel.create.mockResolvedValue({ ...storedTodo, done: true });
    await TodoController.createTodo(makeReq({ body: { title: 'Todo1', done: true } }), makeRes());
    expect(TodoModel.create).toHaveBeenCalledWith({ title: 'Todo1', done: true });
  });

  test('4. hibás JSON-adatokat 400-zal elutasít és egyiket sem menti', async () => {

    const invalidBodies = [
      { done: false },                    
      { title: '   ' },                   
      { title: 42 },                      
      { title: 'Todo', done: 'true' },    
      { title: 'Todo', admin: true },     
    ];
    for (const body of invalidBodies) {
      const res = makeRes();
      await TodoController.createTodo(makeReq({ body }), res);
      expect(res.statusCode).toBe(400);
    }
    expect(TodoModel.create).not.toHaveBeenCalled();
  });

  test('5. Mongoose ValidationError esetén 400-at ad', async () => {
    const error = new Error('modell validációs hiba');
    error.name = 'ValidationError';
    TodoModel.create.mockRejectedValue(error);
    const res = makeRes();
    await TodoController.createTodo(makeReq({ body: newTodo }), res);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'Érvénytelen adatok' });
  });

  test('6. váratlan adatbázishiba esetén 500-at ad', async () => {
    TodoModel.create.mockRejectedValue(new Error('adatbázis nem elérhető'));
    const res = makeRes();
    await TodoController.createTodo(makeReq({ body: newTodo }), res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Belső szerverhiba' });
  });
});