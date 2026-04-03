// script.js - index.html (amount/type/date/memo, listArea, total) に合わせた実装

const DEFAULT_USER = "Ginga";

async function getUserId(name) {
  try {
    const res = await fetch("/users?name=" + encodeURIComponent(name));
    if (!res.ok) throw new Error("GET /users failed: " + res.status);
    const data = await res.json();
    return data.id;
  } catch (e) {
    console.error("getUserId error:", e);
    return null;
  }
}

async function addRecord() {
  const amountEl = document.getElementById("amount");
  const typeEl = document.getElementById("type");
  const dateEl = document.getElementById("date");
  const memoEl = document.getElementById("memo");

  const amount = Number(amountEl.value);
  const type = typeEl.value;
  const date = dateEl.value;
  const memo = memoEl.value.trim();

  if (!amount || !type || !date) {
    return alert("金額・種類・日付は必須です");
  }

  const user_id = await getUserId(DEFAULT_USER);
  if (!user_id) return alert("ユーザー取得に失敗しました");

  try {
    const res = await fetch("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id,
        title: memo || (type === "income" ? "収入" : "支出"),
        reward: amount
      })
    });
    if (!res.ok) {
      console.error("POST /tasks failed", res.status);
      return alert("追加に失敗しました");
    }

    // フォームをクリア
    amountEl.value = "";
    memoEl.value = "";
    dateEl.value = "";
    typeEl.value = "income";

    // 再読み込み
    loadRecords();
  } catch (e) {
    console.error("addRecord error:", e);
    alert("追加中にエラーが発生しました");
  }
}

async function deleteTask(id) {
  try {
    const res = await fetch("/tasks/" + id, { method: "DELETE" });
    if (!res.ok) console.warn("DELETE failed", res.status);
  } catch (e) {
    console.error("deleteTask error:", e);
  }
  loadRecords();
}

async function loadRecords() {
  try {
    console.log("loadRecords start");
    const res = await fetch("/tasks");
    console.log("fetch /tasks status:", res.status);
    const rows = await res.json();
    console.log("fetch /tasks body:", rows);

    const area = document.getElementById("listArea");
    if (!area) {
      console.error("No element with id 'listArea' found");
      return;
    }

    area.innerHTML = ""; // クリア

    if (!Array.isArray(rows) || rows.length === 0) {
      area.innerHTML = "<p>No records</p>";
      updateTotals(rows || []);
      return;
    }

    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.padding = "0";
    ul.style.margin = "0";

    rows.forEach(r => {
      const li = document.createElement("li");
      li.className = "record-card";
      li.style.borderBottom = "1px solid #eee";
      li.style.padding = "8px 0";

      const dateText = r.date || r.created_at || "";
      const titleText = r.title || r.memo || "";
      const nameText = r.name || DEFAULT_USER;
      const amountText = r.reward ?? r.amount ?? 0;

      li.innerHTML = `
        <div class="record-header" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong>${escapeHtml(nameText)}</strong>
            <div style="font-size:0.9em;color:#666">${escapeHtml(dateText)}</div>
          </div>
          <div style="text-align:right">
            <div class="reward" style="font-weight:600">${amountText}円</div>
            <button class="delete-btn" data-id="${r.id}" style="margin-top:6px">削除</button>
          </div>
        </div>
        <p style="margin:6px 0 0 0">${escapeHtml(titleText)}</p>
      `;

      const delBtn = li.querySelector(".delete-btn");
      if (delBtn) {
        delBtn.addEventListener("click", async () => {
          if (!confirm("本当に削除しますか？")) return;
          await deleteTask(r.id);
        });
      }

      ul.appendChild(li);
    });

    area.appendChild(ul);
    updateTotals(rows);
  } catch (e) {
    console.error("loadRecords error:", e);
    const area = document.getElementById("listArea");
    if (area) area.innerHTML = "<p>Error loading records</p>";
  }
}

function updateTotals(rows) {
  const totalEl = document.getElementById("total");
  const incomeEl = document.getElementById("incomeTotal");
  const expenseEl = document.getElementById("expenseTotal");

  let total = 0;
  let income = 0;
  let expense = 0;

  if (Array.isArray(rows)) {
    rows.forEach(r => {
      const v = Number(r.reward ?? r.amount ?? 0);
      total += v;
      if (v >= 0) income += v;
      else expense += Math.abs(v);
    });
  }

  if (totalEl) totalEl.textContent = `${total}円`;
  if (incomeEl) incomeEl.textContent = `${income}円`;
  if (expenseEl) expenseEl.textContent = `${expense}円`;
}

// 簡易エスケープ（表示用）
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 初期化
window.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addBtn");
  if (addBtn) addBtn.addEventListener("click", addRecord);
  loadRecords();
});
