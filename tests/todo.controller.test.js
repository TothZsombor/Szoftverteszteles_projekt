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

describe('3. csapattag | PATCH /api/todos/:id', () => {
  test('1. helyes id-val, kizárólag a megadott mezővel és jó opciókkal frissít', async () => {
    TodoModel.findByIdAndUpdate.mockResolvedValue({ ...storedTodo, done: true });
    await TodoController.updateTodo(
      makeReq({ params: { id: validId }, body: { done: true } }), makeRes()
    );
    expect(TodoModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(TodoModel.findByIdAndUpdate).toHaveBeenCalledWith(
      validId, { done: true }, { new: true, runValidators: true }
    );
  });

  test('2. sikeres módosítás 200-at és a frissített JSON-objektumot adja vissza', async () => {
    const updated = { ...storedTodo, done: true };
    TodoModel.findByIdAndUpdate.mockResolvedValue(updated);
    const res = makeRes();
    await TodoController.updateTodo(makeReq({ params: { id: validId }, body: { done: true } }), res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual(updated);
  });

  test('3. csak a megadott title-t módosítja, és levágja a szóközöket', async () => {
    TodoModel.findByIdAndUpdate.mockResolvedValue({ ...storedTodo, title: 'Új cím' });
    await TodoController.updateTodo(
      makeReq({ params: { id: validId }, body: { title: '  Új cím  ' } }), makeRes()
    );
    expect(TodoModel.findByIdAndUpdate.mock.calls[0][1]).toEqual({ title: 'Új cím' });
  });

  test('4. érvénytelen id-t vagy body-t 400-zal utasít el, adatbázishívás nélkül', async () => {
    const invalidRequests = [
      { params: { id: 'hibas-id' }, body: { done: true } },
      { params: { id: validId }, body: {} },
      { params: { id: validId }, body: { title: '   ' } },
      { params: { id: validId }, body: { done: 1 } },
      { params: { id: validId }, body: { owner: 'admin' } },
    ];
    for (const request of invalidRequests) {
      const res = makeRes();
      await TodoController.updateTodo(makeReq(request), res);
      expect(res.statusCode).toBe(400);
    }
    expect(TodoModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('5. nem létező todo módosításakor 404-et ad', async () => {
    TodoModel.findByIdAndUpdate.mockResolvedValue(null);
    const res = makeRes();
    await TodoController.updateTodo(makeReq({ params: { id: validId }, body: { done: true } }), res);
    expect(res.statusCode).toBe(404);
    expect(res._getJSONData()).toEqual({ error: 'Todo nem található' });
  });

  test('6. váratlan adatbázishibára 500-at ad, és nem adja ki a belső üzenetet', async () => {
    TodoModel.findByIdAndUpdate.mockRejectedValue(new Error('adatbázis belső hibája'));
    const res = makeRes();
    await TodoController.updateTodo(makeReq({ params: { id: validId }, body: { done: true } }), res);
    expect(res.statusCode).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Belső szerverhiba' });
  });
});
