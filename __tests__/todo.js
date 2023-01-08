const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
let server;
let agent;
function getCsrfToken(re) {
  var $ = cheerio.load(re.text);
  return $("[name=_csrf]").val();
}

async function login(agent, username, password) {
  let result = await agent.get("/login");
  var csrfToken = getCsrfToken(result);
  result = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
}

describe("Test Cases For DataBase", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(process.env.PORT || 5000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign Up", async () => {
    var res = await agent.get("/signup");
    var csrfToken = getCsrfToken(res);
    const response = await agent.post("/users").send({
      firstName: "sandeep",
      lastName: "kodari",
      email: "kodarisandeep9182@gmail.com",
      password: "Sandeep@123",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Sign Out", async () => {
    var res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  });

  test("Create  a Todo", async () => {
    var agent = request.agent(server);
    await login(agent, "kodarisandeep9182@gmail.com", "Sandeep@123");
    var res = await agent.get("/todos");
    var csrfToken = getCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "choco",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Mark it Todo As a Completed (we are updating todo)", async () => {
    var agent = request.agent(server);
    await login(agent, "kodarisandeep9182@gmail.com", "Sandeep@123");
    var res = await agent.get("/todos");
    var csrfToken = getCsrfToken(res);
    await agent.post("/todos").send({
      title: "play Football",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const Todos = await agent.get("/todos").set("Accept", "application/json");
    const parseTodos = JSON.parse(Todos.text);
    const countTodaysTodos = parseTodos.dueToday.length;
    const Todo = parseTodos.dueToday[countTodaysTodos - 1];
    const status = Todo.completed ? false : true;
    res = await agent.get("/todos");
    csrfToken = getCsrfToken(res);
    const changeTodo = await agent
      .put(`/todos/${Todo.id}`)
      .send({ _csrf: csrfToken, completed: status });

    const parseUpadteTodo = JSON.parse(changeTodo.text);
    expect(parseUpadteTodo.completed).toBe(true);
  });

  test("It Will Delete a Todo if the given id exits and return a boolean response ", async () => {
    var agent = request.agent(server);
    await login(agent, "kodarisandeep9182@gmail.com", "Sandeep@123");
    var res = await agent.get("/todos");
    var csrfToken = getCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy toolkit",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const Todos = await agent.get("/todos").set("Accept", "application/json");
    const parseTodos = JSON.parse(Todos.text);
    const countTodaysTodos = parseTodos.dueToday.length;
    const Todo = parseTodos.dueToday[countTodaysTodos - 1];
    const todoID = Todo.id;

    res = await agent.get("/todos");
    csrfToken = getCsrfToken(res);

    const rese = await agent
      .delete(`/todos/${todoID}`)
      .send({ _csrf: csrfToken });

    const bool = Boolean(rese.text);
    expect(bool).toBe(true);
  });
});
