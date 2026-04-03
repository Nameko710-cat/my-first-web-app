const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();


app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// DB作成
const db = new sqlite3.Database("database.sqlite", (err) => {
  if (err) {
    console.error("Failed to open database:", err);
    process.exit(1);
  }
  console.log("Opened database database.sqlite");
});

// テーブル作成
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )`,
    (err) => {
      if (err) console.error("Create users table error:", err);
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      reward INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    (err) => {
      if (err) console.error("Create tasks table error:", err);
    }
  );
});

// ユーザー取得または作成
app.get("/users", (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: "name is required" });

  db.get("SELECT * FROM users WHERE name = ?", [name], (err, row) => {
    if (err) {
      console.error("DB error GET /users:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (row) {
      return res.json(row);
    } else {
      db.run("INSERT INTO users (name) VALUES (?)", [name], function (err) {
        if (err) {
          console.error("DB error INSERT /users:", err);
          return res.status(500).json({ error: "DB error" });
        }
        res.json({ id: this.lastID, name });
      });
    }
  });
});

// 家事追加
app.post("/tasks", (req, res) => {
  const { user_id, title, reward } = req.body;
  if (!user_id || !title || typeof reward !== "number") {
    return res.status(400).json({ error: "user_id, title, reward are required" });
  }

  db.run(
    "INSERT INTO tasks (user_id, title, reward) VALUES (?, ?, ?)",
    [user_id, title, reward],
    function (err) {
      if (err) {
        console.error("DB error POST /tasks:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json({ id: this.lastID });
    }
  );
});

// 家事一覧取得
app.get("/tasks", (req, res) => {
  db.all(
    `
    SELECT tasks.id, tasks.user_id, tasks.title, tasks.reward, tasks.created_at, users.name
    FROM tasks
    JOIN users ON tasks.user_id = users.id
    ORDER BY created_at DESC
    `,
    (err, rows) => {
      if (err) {
        console.error("DB error GET /tasks:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json(rows);
    }
  );
});

// タスク削除
app.delete("/tasks/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM tasks WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("DB error DELETE /tasks/:id:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json({ deleted: this.changes });
  });
});

// index.html を返す（public に置いている場合は不要だが安全のため）
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

