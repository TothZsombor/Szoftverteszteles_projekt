# TODO CRUD REST API – teljes magyarázat és szóbeli felkészítő

**A feladat:** Node.js-ben működő, feladatokat (todo-kat) kezelő REST API, amelynek **minden CRUD-végpontjához pontosan 6 unit teszt** tartozik. Az 5 végponthoz tehát **összesen 30 teszt** készült. A tesztfájlban **kommentekkel három csapattagra** van szétosztva a munka.

Ez a README úgy készült, hogy a kód megértése után a csapat **tanári kérdésekre is tudjon válaszolni**. Nem kell előre tudni a Jestet vagy a MongoDB-t: a használt fogalmakat lent elmagyarázzuk.

---

## 1. Mit csinál a program?

Egy egyszerű teendőlista (TODO API). Minden feladatnak van:

- **`_id`** – a MongoDB azonosítója, ami egyedileg azonosítja a feladatot;
- **`title`** – a feladat címe, például `"Tanulás"`;
- **`done`** – logikai érték: `false` = nincs kész; `true` = kész.

Egy példa feladat:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Tanulás",
  "done": false
}
```

A kliens (pl. böngésző, Postman, frontend) HTTP-kéréseket küld. Az Express a megfelelő **végponthoz** (URL + HTTP-metódus) irányítja a kérést. A controller ellenőrzi az adatokat, szükség esetén meghívja a Mongoose-modellt, majd visszaküldi a HTTP-választ.

**CRUD** = Create (létrehozás), Read (lekérdezés), Update (módosítás), Delete (törlés). A két GET azért külön végpont, mert az egyik **az összes**, a másik **egy adott** feladatot kér le.

### Az 5 vizsgált végpont

| HTTP-metódus | URL | Feladat | Sikeres kód | Kié a teszt? |
|---|---|---|---:|---|
| `GET` | `/api/todos` | Összes feladat lekérése | `200` | 1. csapattag |
| `GET` | `/api/todos/:id` | Egy feladat lekérése ID alapján | `200` | 1. csapattag |
| `DELETE` | `/api/todos/:id` | Egy feladat törlése | `204` | 2. csapattag |
| `POST` | `/api/todos` | Új feladat létrehozása | `201` | 2. csapattag |
| `PATCH` | `/api/todos/:id` | Meglévő feladat részleges módosítása | `200` | 3. csapattag |

**Fontos:** a `:id` nem szó szerint az URL része. A helyére egy valódi azonosító kerül: pl. `/api/todos/507f1f77bcf86cd799439011`.

A `/` gyökérútvonal is létezik: `{ "msg": "Hello World" }` választ ad. Ez csak egy egyszerű bemutató útvonal, **nem része az öt CRUD-végpontnak és a 30 unit tesztnek**.

---

## 2. Projektfájlok: melyik mire való?

```text
todo-crud-unit-project/
│
├── app.js                          # Express alkalmazás és végpontok
├── server.js                       # MongoDB-csatlakozás és szerverindítás
├── controllers/
│   └── todo.controller.js          # Az 5 végpont tényleges működése
├── models/
│   └── todo.model.js               # MongoDB-adatséma, Mongoose-modell
├── tests/
│   ├── todo.controller.test.js     # Pontosan 30 unit teszt; 3 csapatrész
│   └── mock-data/
│       └── new-todo.json           # Példakérés a POST-teszthez
├── package.json                    # Csomagok, npm-parancsok, Jest-beállítás
├── package-lock.json               # Függőségek rögzített verziói
├── .gitignore                      # Kihagyott generált fájlok
└── README.md                       # Ez a magyarázat
```

### `app.js` – a bejárat

1. `require('express')`: betölti az Express keretrendszert.
2. `require('./controllers/todo.controller')`: betölti az általunk írt controllerfüggvényeket.
3. `const app = express()`: létrehozza a webalkalmazást.
4. `app.use(express.json())`: a JSON-kérés törzsét JavaScript-objektummá alakítja, így a controllerben olvasható a `req.body`.
5. `app.get`, `app.post`, `app.patch`, `app.delete`: az URL-ekhez megfelelő controllerfüggvényt rendel. Például a `POST /api/todos` a `createTodo` függvényhez jut.
6. A végén az `app.use` egy `404`-es választ küld olyan URL-ekre, amelyeket egyik korábbi végpont sem kezel.
7. `module.exports = app`: más fájlok számára elérhetővé teszi az alkalmazást.

**Miért nincs `app.listen()` az `app.js`-ben?** Mert az alkalmazás betöltése így nem indít automatikusan szervert. A szerverindítás külön fájlban van, így a tesztelt részeket könnyebb önállóan használni.

### `server.js` – a valódi futtatás

1. Betölti a Mongoose-t és az `app.js`-ből az Express alkalmazást.
2. `PORT`: a szerver portja, alapból `3000`.
3. `MONGO_URI`: a MongoDB-kapcsolati cím, alapból `mongodb://127.0.0.1:27017/todo-api`.
4. `mongoose.connect(MONGO_URI)`: megpróbál kapcsolódni az adatbázishoz.
5. Ha ez **sikerül**, `app.listen(PORT)` elindítja a HTTP-szervert.
6. Ha **nem sikerül**, hibát ír a konzolra és hibás kilépési állapotot állít be.

**Ezt a fájlt a unit tesztek nem töltik be**, mert unit tesztelésnél nincs szükség valódi szerverre vagy MongoDB-re.

### `models/todo.model.js` – az adatok szabályai

A Mongoose egy MongoDB-hez használható Node.js-könyvtár. A **Schema** meghatározza, milyen mezőkből áll a tárolt dokumentum.

- `title: { type: String, required: true, trim: true }`: a cím szöveg, kötelező, a szélső szóközöket a modell is levágja.
- `done: { type: Boolean, required: true, default: false }`: a készültség logikai érték; új feladatnál alapból `false`.
- `mongoose.model('Todo', TodoSchema)`: elkészíti a `Todo` nevű modellt.
- `module.exports`: más fájlok importálhatják a modellt.

A controller **külön is ellenőrzi** a bemeneti adatokat. Ez azért jó, mert a rossz kéréseket már az adatbázis meghívása előtt vissza tudja utasítani.

### `controllers/todo.controller.js` – a program üzleti logikája

A controller a kérés (`req`) alapján kiszámítja, milyen választ (`res`) kell küldeni. Itt van mind az öt művelet.

#### Közös segédfüggvények

**`isValidId(id)`**: csak az olyan szöveget fogadja el, amely **pontosan 24 hexadecimális karakterből** áll (`0`–`9`, `a`–`f`, nagybetűk is jók). Ezzel kiszűri a hibás MongoDB ObjectId-formátumot. **Fontos:** attól, hogy az ID formátuma jó, a rekord még nem biztos, hogy létezik.

**`validateTodoBody(body, partial = false)`**: ellenőrzi és megtisztítja a JSON-adatokat:

- A `body` csak objektum lehet; `null`, tömb és szöveg nem megfelelő.
- Csak a `title` és `done` mező engedélyezett; pl. `admin` nem.
- A `title`, ha szerepel, nem lehet üres vagy csak szóköz; kötelezően szöveg.
- A `title.trim()` levágja az elejéről/végéről a szóközöket.
- A `done`, ha szerepel, kizárólag `true` vagy `false` lehet. A `"true"` szöveg **nem** jó.
- **POST** (`partial = false`): a `title` kötelező, hiányzó `done` esetén `false` lesz.
- **PATCH** (`partial = true`): elég egy engedélyezett mező is; üres `{}` nem jó. A kihagyott mezőt **nem módosítjuk**.
- Jó bemenetnél a megtisztított objektumot, rossznál `null`-t ad vissza. A controller a `null`-ból `400`-as HTTP-választ csinál.

**`respondWithError(res, error)`**: az adatbázishibákat egységesen kezeli:

- Mongoose `ValidationError` vagy `CastError` → `400`, `{ "error": "Érvénytelen adatok" }`;
- minden más váratlan hiba → `500`, `{ "error": "Belső szerverhiba" }`.

A konkrét adatbázis-hibaüzenetet nem küldi vissza a kliensnek, így nem szivárog ki belső információ.

#### Az öt controllerfüggvény

**`getTodos(req, res)` – GET összes**

1. Meghívja a `TodoModel.find()` metódust.
2. Ha sikeres, `200` státusszal JSON-tömböt ad: lehet több feladat, de akár `[]` is.
3. Ha a modell hibát jelez, meghívja a közös hibakezelőt.

**`getTodoById(req, res)` – GET egy ID alapján**

1. Az URL-ből kiolvassa `req.params.id` értékét.
2. Ellenőrzi az ID formátumát; hibás esetben `400`.
3. `TodoModel.findById(id)` megkeresi a feladatot.
4. Ha nincs találat (`null`), `404`.
5. Ha van találat, `200` és a feladat JSON-ja.
6. Adatbázishibára a közös hibakezelő válaszol.

**`createTodo(req, res)` – POST**

1. A `req.body` a JSON-adatokat tartalmazza.
2. `validateTodoBody(req.body)` ellenőrzi a mezőket.
3. Rossz bemenetre `400`, és a modell **nem** hívódik meg.
4. Jó bemenetre `TodoModel.create(payload)` létrehozza a feladatot.
5. Siker esetén `201` és a létrehozott objektum a válasz.
6. Modellhibára a közös hibakezelőt használja.

**`updateTodo(req, res)` – PATCH**

1. Ellenőrzi az URL-ben lévő azonosítót; rossz ID-ra `400`.
2. `validateTodoBody(req.body, true)` elfogad egyetlen megadott, megfelelő mezőt is.
3. `TodoModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true })` módosít.
4. `new: true` azt kéri, hogy a **módosított** rekordot kapjuk vissza; `runValidators: true` pedig azt, hogy a Mongoose-frissítés is futtassa az adatséma-validációkat.
5. Ha nincs ilyen rekord, `404`; ha van, `200` és a frissített JSON.
6. Adatbázishibánál a közös hibakezelőt hívja.

**`deleteTodo(req, res)` – DELETE**

1. Ellenőrzi az URL-ből kapott ID-t.
2. `TodoModel.findByIdAndDelete(id)` törölni próbálja a rekordot.
3. Ha a modell `null`-t ad (nincs ilyen rekord), `404`.
4. Ha sikerült a törlés, `204 No Content` a válasz – **nincs válaszüzenet-törzs**.
5. Hibás ID-ra `400`, adatbázishibára a közös hibakezelő válaszol.

---

## 3. HTTP státuszkódok: mit jelentenek?

| Kód | Neve | Ebben a programban mikor? |
|---:|---|---|
| `200` | OK | Sikeres GET vagy PATCH |
| `201` | Created | Sikeres POST – új feladat készült |
| `204` | No Content | Sikeres DELETE – törlés, üres válasz |
| `400` | Bad Request | Rossz ID-formátum, érvénytelen JSON vagy Mongoose-validációs hiba |
| `404` | Not Found | Adott ID nem található, vagy ismeretlen URL |
| `500` | Internal Server Error | Váratlan adatbázis-/szerverhiba |

**Gyakori kérdés:** miért `200` az üres GET-lista, de `404` a hiányzó egyedi rekord? Mert az „összes feladat” lekérése üres adatbázisnál is sikeresen lefutott (`[]`). Viszont egy konkrét, kért ID-hoz nem volt találat.

---

## 4. Hogyan működik a unit tesztelés?

### A unit teszt jelentése

A **unit teszt** a program egy kicsi, elkülönített részét vizsgálja. A mi esetünkben a controllerfüggvényeket hívjuk meg közvetlenül, és figyeljük a válaszukat. **Nem teszteljük valódi HTTP-kéréssel a teljes rendszert**, és **nem használunk valódi adatbázist**. Ez eltér az integrációs teszttől, amely több valódi komponenst együtt próbálna ki.

A függetlenség azt jelenti, hogy **nem kell MongoDB, elindított szerver vagy hálózati API** a tesztekhez. A tesztkeretrendszer és a tesztkönyvtárak telepítése természetesen szükséges (`npm ci`).

### Mi az a mock?

A **mock** egy hamisított függvény, amelynek előre megmondjuk, mit adjon vissza. Például:

```javascript
TodoModel.find.mockResolvedValue([storedTodo]);
```

Ez olyan, mintha az adatbázis egy egyfeladatos listát adott volna vissza – de a valóságban **nem történik adatbázishívás**.

A tesztfájl legelején a `jest.mock('../models/todo.model', () => ({ ... }))` a teljes modellt 5 darab `jest.fn()` függvényre cseréli. Mindegyik azt az adatbázisműveletet utánozza, amelyet a controller egyébként használna:

| Mock | Melyik controller hívja? |
|---|---|
| `TodoModel.find` | `getTodos` |
| `TodoModel.findById` | `getTodoById` |
| `TodoModel.create` | `createTodo` |
| `TodoModel.findByIdAndUpdate` | `updateTodo` |
| `TodoModel.findByIdAndDelete` | `deleteTodo` |

### Mire való a `node-mocks-http`?

Ez a csomag **szimulált Express request (`req`) és response (`res`) objektumokat** készít. A valódi végpont normál esetben a hálózaton kapná ezeket; unit tesztnél mi hozzuk létre őket:

```javascript
const req = makeReq({
  params: { id: validId },
  body: { done: true }
});
const res = makeRes();
await TodoController.updateTodo(req, res);
```

A hívás után ki tudjuk olvasni:

- `res.statusCode` – milyen HTTP-státuszt állított be a controller;
- `res._getJSONData()` – milyen JSON-adatot küldött vissza;
- `res._getData()` – milyen nyers tartalma van a válasznak;
- `res._isEndCalled()` – lezárta-e a választ.

**A `makeReq` és `makeRes` saját, rövid segédfüggvényeink** a tesztfájl elején: csak azért vannak, hogy ne kelljen minden tesztben ismételni ugyanazt a hosszú kódot.

### Jest-parancsok és kifejezések

| Kódrészlet | Jelentése |
|---|---|
| `describe('...', () => { ... })` | Összefog egy végponthoz tartozó tesztcsoportot |
| `test('...', async () => { ... })` | Egy önálló teszteset; a neve elmondja, mit várunk |
| `beforeEach(() => jest.resetAllMocks())` | Minden teszt előtt törli az előző mockhívásokat és viselkedésbeállításokat |
| `jest.fn()` | Hamis/mock függvény |
| `.mockResolvedValue(adat)` | Az aszinkron művelet sikeres Promise-szal visszaadja az `adat`-ot |
| `.mockRejectedValue(error)` | Az aszinkron művelet hibával elutasított Promise-t ad |
| `await` | Megvárjuk, amíg az aszinkron controllerfüggvény befejeződik |
| `expect(valami).toBe(200)` | Pontosan `200` legyen az érték |
| `expect(obj).toEqual(masikObj)` | Az objektumok tartalma egyezzen |
| `.toHaveBeenCalledWith(...)` | A mock a megfelelő paramétereket kapta |
| `.toHaveBeenCalledTimes(1)` | A mock pontosan egyszer futott |
| `.not.toHaveBeenCalled()` | A mock egyáltalán nem futott |
| `for (const body of ...)` | Több ugyanolyan típusú érvénytelen bemeneti példát ellenőrzünk **egy** tesztesetben |

**Miért van `await`?** Mert a controllerfüggvények `async` függvények, a modellek műveletei Promise-t adnak. Ha nem várnánk meg a befejezést, előfordulhatna, hogy túl korán olvassuk ki a választ.

**Miért fontos a `jest.resetAllMocks()`?** Különben az előző teszt hívásai és előre megadott modellválaszai átszivároghatnának a következő tesztbe, és hibás eredményt okozhatnának.

### Egy teljes teszt értelmezése

```javascript
test('nem létező todo esetén 404-et ad', async () => {
  TodoModel.findById.mockResolvedValue(null); // Adatbázis helyett: nincs találat
  const res = makeRes();                     // Szimulált HTTP-válasz
  await TodoController.getTodoById(           // Meghívjuk a tesztelt függvényt
    makeReq({ params: { id: validId } }), res
  );
  expect(res.statusCode).toBe(404);          // Ez az elvárt eredmény
});
```

Három lépésben érdemes gondolkodni:

1. **Előkészítés (Arrange):** mock beállítása, `req` és `res` létrehozása.
2. **Végrehajtás (Act):** meghívjuk a controllerfüggvényt `await`-tel.
3. **Ellenőrzés (Assert):** `expect(...)`-tel ellenőrizzük az eredményt.

---

## 5. Mind a 30 teszt – pontosan mi történik és miért?

Mind az öt `describe` blokkban **pontosan 6 `test(...)` szerepel**. Az alábbi felsorolás a fájlban található tesztek **sorrendjét és működését** követi.

### 1. csapattag – `GET /api/todos` (6 teszt)

1. **A `find` egyszer fut, paraméter nélkül:** ezzel ellenőrizzük, hogy a listázás a megfelelő modellmetódust használja.
2. **Sikeres lekérésnél `200`:** az API jelzi, hogy a kérés sikeres volt.
3. **Több találatnál a teljes JSON-tömb jön vissza:** nem vesznek el a feladatok és a mezők.
4. **Üres listánál `200` és `[]`:** a nulla találat nem hiba.
5. **Váratlan adatbázishibánál `500`:** a rendszer kezeli a Promise hibáját.
6. **`500` esetén nincs belső hibaüzenet:** a válasz csak `{ "error": "Belső szerverhiba" }`.

### 1. csapattag – `GET /api/todos/:id` (6 teszt)

1. **`findById` a megadott ID-val fut:** ellenőrizzük az URL-paraméter továbbadását.
2. **Létező rekordnál `200` és a megtalált JSON:** az adatok helyesen érkeznek vissza.
3. **Nem létező rekordnál `404`:** ezt a modell `null` válaszával szimuláljuk.
4. **Hibás ID-ra `400`, modellhívás nélkül:** fölösleges adatbázisműveletet előzünk meg.
5. **Váratlan adatbázishibára `500`:** a kliens biztonságos, általános hibát kap.
6. **Mongoose `CastError` esetén `400`:** a típus-/azonosítókezelési hibát bemeneti hibaként kezeljük.

### 2. csapattag – `DELETE /api/todos/:id` (6 teszt)

1. **`findByIdAndDelete` egyszer, helyes ID-val fut:** biztosítja, hogy a megfelelő rekordra kérünk törlést.
2. **Sikeres törlésnél `204`, üres és lezárt válasz:** a `204` kódnál nem küldünk JSON-törzset.
3. **Nem létező rekordnál `404`:** nem állítjuk, hogy egy nem létező rekordot töröltünk.
4. **Hibás ID-ra `400`, törlési modellhívás nélkül:** a bemeneti ellenőrzés már a törlés előtt lefut.
5. **Váratlan adatbázishibára `500`:** belső hiba nem kerül részletezve a válaszba.
6. **Mongoose `CastError` esetén `400`:** a közös hibakezelő működését ellenőrizzük.

### 2. csapattag – `POST /api/todos` (6 teszt)

1. **A cím szóközeit levágja, hiányzó `done` esetén `false`-t állít:** a modell már tisztított adatot kap.
2. **Sikeres létrehozásnál `201` és JSON:** ellenőrizzük a létrehozás státuszkódját és eredményét.
3. **A megadott `done: true` megmarad:** nem írjuk felül a kliens helyes értékét.
4. **Érvénytelen bemenetekre `400`, mentés nélkül:** hiányzó/üres/nem szöveges cím, rossz `done` és ismeretlen mező. **Ez egy teszt**, amely több hibás adatot ellenőriz egy ciklusban.
5. **Mongoose `ValidationError` esetén `400`:** a modell szintjén érkező validációs hibát is kezeljük.
6. **Váratlan adatbázishibára `500`:** a váratlan hibából szabályos HTTP-hibaválasz lesz.

### 3. csapattag – `PATCH /api/todos/:id` (6 teszt)

1. **A helyes ID-t és mezőt adja át, megfelelő opciókkal:** `new: true`, `runValidators: true`; kizárólag a `done` mezőt módosítjuk.
2. **Sikeres módosításnál `200` és a frissített JSON:** a kliens látja az új állapotot.
3. **Csak a megadott `title` frissül, levágott szóközökkel:** a kihagyott `done` mezőhöz nem nyúlunk.
4. **Hibás ID vagy hibás/üres body → `400`, modellhívás nélkül:** több rossz példát ellenőrzünk **egyetlen tesztben**.
5. **Nem létező rekordnál `404`:** a modell `null` választ szimulál.
6. **Váratlan adatbázishibánál `500`:** a belső részleteket nem adjuk vissza.

**A tesztek száma: 6 + 6 + 6 + 6 + 6 = 30.** A 30 különálló `test(...)` mellett egyes tesztek tudatosan több azonos kategóriába eső hibás példát vizsgálnak, de nem számoljuk ezeket külön tesztnek.

---

## 6. Hogyan indítsátok el?

### Szükséges programok

- **Node.js 22 vagy újabb** (a projektben rögzített Jest 30 és Mongoose 9 verziókhoz megfelelő választás);
- npm (a Node.js-szel települ);
- terminál (VS Code Terminál / Windows PowerShell / parancssor).

### Csak a tesztek futtatásához

Nyissatok terminált abban a mappában, ahol a `package.json` van, majd:

```bash
npm ci
npm test
```

A `npm ci` feltelepíti a `package-lock.json`-ban rögzített függőségeket (első alkalommal internet kellhet). A `npm test` **nem** kapcsolódik MongoDB-hez, és nem indít HTTP-szervert.

**Várt eredmény:** minden teszt sikeres futtatásakor **1 tesztcsomag, 30 sikeres teszt** jelenik meg a Jest végén. Ha a teszt nem fut le, előbb a telepítést, Node-verziót és a terminál aktuális mappáját ellenőrizzétek.

### Csak egy csapattag tesztjeinek futtatása

```bash
npx jest --runInBand --testNamePattern="1. csapattag"
npx jest --runInBand --testNamePattern="2. csapattag"
npx jest --runInBand --testNamePattern="3. csapattag"
```

A `--testNamePattern` a tesztcsoport nevére szűr. Ezért az 1. csapattagnál **12**, a 2. csapattagnál **12**, a 3. csapattagnál **6** teszt fut. A többiek tesztjeit Jest kihagyja (skipped), nem törli.

### Lefedettség

```bash
npm run test:coverage
```

Jest kimutatást készít arról, hogy a `controllers/todo.controller.js` sorainak, függvényeinek és ágainak mekkora részét futtatták a tesztek. A jelentés a `coverage/` mappába kerül. **A lefedettség nem egyenlő a helyességgel**: magas százaléknál is lehet hibás a program vagy hiányos a tesztelés.

### A valódi API indítása (külön feladat a unit tesztektől)

Ehhez **ténylegesen futó MongoDB** szükséges. Alapbeállításként helyi MongoDB-t keres a 27017-es porton. Indítás:

```bash
npm start
```

Fejlesztői mód, amely fájlváltozáskor újraindít:

```bash
npm run dev
```

A szerver alapcíme sikeres adatbázis-kapcsolatnál: `http://localhost:3000`.

**Ha a MongoDB nem fut, az API nem indul el – ez nem a unit tesztek hibája.** A tesztekhez ne indítsatok sem MongoDB-t, sem `npm start`-ot.

### Példakérések (a valóban elindított API-hoz)

A példák terminálos `curl` parancsok; Postmanből is elvégezhetők. **Ezek kézi/API kipróbálások, nem a Jest unit tesztek részei.**

**Összes todo:**

```bash
curl http://localhost:3000/api/todos
```

**Új todo létrehozása:**

```bash
curl -X POST http://localhost:3000/api/todos -H "Content-Type: application/json" -d '{"title":"Tanulás","done":false}'
```

**Egy todo lekérése** (a példában szereplő ID helyett a POST válaszából kapott `_id`-t írjátok):

```bash
curl http://localhost:3000/api/todos/507f1f77bcf86cd799439011
```

**Készre állítás:**

```bash
curl -X PATCH http://localhost:3000/api/todos/507f1f77bcf86cd799439011 -H "Content-Type: application/json" -d '{"done":true}'
```

**Törlés:**

```bash
curl -X DELETE http://localhost:3000/api/todos/507f1f77bcf86cd799439011
```

*Windows PowerShellben a `curl` egyes verziókban alias lehet; ilyenkor a `curl.exe` parancsot használjátok, a JSON-idézőjeleket pedig a választott terminál szabályai szerint kell escape-elni. Postmanben egyszerűbb a `Body → raw → JSON` használata.*

---

## 7. `package.json`, `package-lock.json`, `new-todo.json`, `.gitignore`

### `package.json`

A Node.js projekt leírása. A `scripts` alatt vannak a parancsok:

| Parancs | Mit csinál? |
|---|---|
| `npm start` | `node server.js`: valódi HTTP-szerver és MongoDB kapcsolat |
| `npm run dev` | `nodemon server.js`: változáskor újraindítja a szervert |
| `npm test` | `jest --runInBand`: elindítja a unit teszteket, egymás után futtatva a tesztfájlokat |
| `npm run test:coverage` | Mint fent, de lefedettségi jelentést is készít |

**Fő csomagok:**

- `express`: HTTP útvonalak és válaszok kezelése;
- `mongoose`: MongoDB-modell és adatbázisműveletek;
- `node-mocks-http`: hamis request/response objektumok a tesztekben;
- `jest`: tesztkeretrendszer (állítások, mockok, tesztfuttatás);
- `nodemon`: fejlesztéskor automatikus újraindítás;
- `@types/jest`: Jest típusleírások, szerkesztői kódkiegészítéshez. **Nem TypeScript a projekt**, CommonJS JavaScriptet használunk.

A `devDependencies` elsősorban fejlesztéshez és teszteléshez, a `dependencies` a szokásos futtatáshoz szükséges csomagokat jelenti. Ebben a projektben a `node-mocks-http` a `dependencies` között szerepel, bár csak tesztekben használjuk.

A `jest` beállításban:

- `testEnvironment: "node"`: Node.js környezet;
- `collectCoverageFrom`: a controller fájlt méri a lefedettségnél;
- `coverageDirectory: "coverage"`: ide kerül a riport.

### `package-lock.json`

Rögzíti a csomagverziókat és függőségeiket, így az `npm ci` reprodukálhatóbb telepítést ad. Ezt általában **nem kézzel szerkesztjük**.

### `tests/mock-data/new-todo.json`

A POST-teszt példabemenete:

```json
{
  "title": "Todo1",
  "done": false
}
```

A teszt a `require('./mock-data/new-todo.json')` sorral olvassa be. Ez **nem adatbázisfájl**, csak egy tesztben használt minta.

### `.gitignore`

Megadja, mely generált/lokális fájlokat ne kövessük Gitben, például a telepített `node_modules/` mappát. A ZIP ezért csak a projekt forrásfájljait és a telepítéshez szükséges konfigurációt tartalmazza.

---

## 8. A három csapattag szóbeli bemutatója

### 1. csapattag: a két GET végpont (12 teszt)

**Mit mutasson meg a kódból?** `app.js` két `app.get(...)` sora; `getTodos` és `getTodoById` controllerfüggvények; a tesztfájl első két `describe` blokkja.

**Röviden elmondható szöveg:**

> „Én a lekérdezésekért feleltem. Az első GET az összes feladatot visszaadja, az üres lista is sikeres 200-as válasz. A második GET egy URL-ben megadott azonosító alapján keres, előbb ellenőrzi annak formátumát, aztán lekérdezi a modellt. Hibás ID-ra 400-at, nem létező rekordnál 404-et küld. Mindkét végponthoz 6 Jest unit tesztet írtam, a Mongoose műveleteit mockoltam, ezért nincs szükség adatbázisra.”

**Amire rákérdezhetnek:** miért különbözik a 400 és 404; miért `[]` a lista nulla találatnál; mi a `find()` és a `findById()` között a különbség?

### 2. csapattag: DELETE és POST (12 teszt)

**Mit mutasson meg?** `createTodo`, `deleteTodo`, a bemeneti validáció, és a két saját `describe` blokk.

**Röviden elmondható szöveg:**

> „Én a létrehozást és a törlést teszteltem. A POST előbb ellenőrzi a JSON-adatokat: a title kötelező, a done logikai érték, alapból false. Siker esetén a modell létrehozza a feladatot és 201-es választ kapunk. A DELETE ID alapján töröl; sikeresen 204-et ad üres válasszal. A tesztekben ellenőrzöm azt is, hogy érvénytelen bemenetre nem hívódik meg az adatbázismodell, valamint a 404-es és 500-as hibákat.”

**Amire rákérdezhetnek:** miért 201 és nem 200; miért 204 és nincs JSON-törzs; miért nem hívjuk a modellt hibás bemenetnél?

### 3. csapattag: PATCH (6 teszt)

**Mit mutasson meg?** `updateTodo`, `validateTodoBody(..., true)` és az utolsó `describe` blokk.

**Röviden elmondható szöveg:**

> „Én a módosításért feleltem. PATCH esetén nem szükséges minden mezőt újraküldeni, csak azt módosítjuk, amit megadunk. A bemeneti adatokat ellenőrizzük, majd a findByIdAndUpdate hívásban a new: true miatt a módosított objektumot kérjük vissza, a runValidators: true miatt pedig a modell ellenőrzéseit is lefuttatjuk. Hat teszttel vizsgálom a helyes frissítést, a válaszkódot, a részleges módosítást, a hibás adatot, a hiányzó rekordot és az adatbázishibát.”

**Amire rákérdezhetnek:** miért PATCH és nem PUT; mi történik, ha csak `done: true` érkezik; mire jó a `new: true` és a `runValidators: true`?

### Közös kérdések és rövid válaszok

**1. Miért unit teszt és nem integrációs teszt?**  
Mert közvetlenül egy controllerfüggvényt tesztelünk, a modellt mockoljuk, a HTTP-objektumok szimuláltak. Nem fut össze valódi HTTP-szerver és MongoDB.

**2. Mi az a `jest.mock()`?**  
A valódi függőséget helyettesítjük ellenőrizhető hamis függvényekkel, így a teszt eredménye nem függ az adatbázistól.

**3. Miért 6 teszt végpontonként?**  
A feladat előírja. Tudatosan különböző helyzeteket választottunk: normál működés, bemeneti hibák, hiányzó rekord és szerverhiba.

**4. Mitől lesz egy teszt jó?**  
Előre megmondott bemenetből előre megmondott eredményt vár, ellenőrzi a státuszt/adatot és ahol fontos, a modellhívást. Független a többi teszttől.

**5. Miért kell `async` és `await`?**  
Az adatbázisműveletek aszinkronok. Az `await` biztosítja, hogy a válasz beállítása után ellenőrizzünk.

**6. Miért nincs szükség MongoDB-re a `npm test` során?**  
Mert a `TodoModel` összes használt függvénye mockolt, és a `server.js` nem indul el.

**7. Mit jelent az `expect(...)`?**  
Ez a teszt elvárt eredménye. Ha a valós eredmény eltér, a teszt megbukik.

**8. Mi történik, ha a modell hibát dob?**  
A controller `try/catch` blokkja elkapja, a `respondWithError` pedig megfelelő 400-as vagy 500-as HTTP-választ állít be.

**9. Miért lehet sok állítás egy tesztben?**  
Egy helyzetben több kapcsolódó dolgot is ellenőrizhetünk (pl. státuszkód + JSON-válasz). Egy `test(...)` ettől még egy teszteset.

**10. A 30 unit teszt garantálja, hogy az éles API tökéletesen működik?**  
Nem. A controller logikáját ellenőrzi izoláltan. A valódi Express route-ok, hálózat és MongoDB együttes működéséhez integrációs/end-to-end tesztek is kellenének.

---

## 9. Hogyan mutassátok be élőben 2–3 percben?

1. **App:** mutassátok meg az `app.js` öt útvonalát; mondjátok el, mit jelent a CRUD.
2. **Controller:** nyissátok meg a `todo.controller.js` fájlt; magyarázzátok el a bemeneti ellenőrzést, a modellhívást és a státuszkódot.
3. **Mock:** a tesztfájl tetején mutassátok meg a `jest.mock` részt; mondjátok el, hogy **nincs igazi DB**.
4. **Három felelősségi rész:** mutassátok meg a `1. CSAPATTAG`, `2. CSAPATTAG`, `3. CSAPATTAG` kommenteket és az 5 db, egyenként 6 tesztes `describe` blokkot.
5. **Futtatás:** `npm test`, majd ha kell, `npm run test:coverage`; magyarázzátok el, hogy mit jelent a 30 sikeres teszt.

### Ellenőrzőlista leadás előtt

- [ ] A projekt mappában létezik a `package.json`.
- [ ] A `tests/todo.controller.test.js` fájlban **5 db `describe`**, mindegyikben **6 db `test`** van.
- [ ] A három csapattag feladatait kommentek választják el.
- [ ] A `npm ci` után a `npm test` sikeresen lefut.
- [ ] Tudjátok, hogy **unit teszthez MongoDB nem szükséges**.
- [ ] Mindenki el tudja magyarázni a saját 6 vagy 12 tesztjét.

**Rövid végső összegzés:** Express + Mongoose alapú TODO CRUD API; 5 végpont; 30 Jest unit teszt; adatbázis nélküli mockolás; 3 részre osztott csapatmunka. A README tartalmazza a fájlok, függvények, státuszkódok, tesztek és futtatási parancsok magyarázatát.
