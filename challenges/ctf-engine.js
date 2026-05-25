/* SOC CTF shared engine - UTF-8 */
(function (global) {
  const HINT_COST = 5;
  const POINTS = 20;

  function initCTF(cfg) {
    const taskCount = cfg.taskCount || 5;
    const $ = (id) => document.getElementById(id);
    const state = { score: 0, tasks: {}, hintsUsed: 0 };
    const storageKey = "ctf_" + cfg.id;

    function allTasksCorrect() {
      for (let i = 1; i <= taskCount; i++) {
        if (state.tasks[i] !== "ok") return false;
      }
      return true;
    }

    function load() {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const data = JSON.parse(raw);
        state.score = data.score || 0;
        state.tasks = data.tasks || {};
        state.hintsUsed = data.hintsUsed || 0;
      } catch (e) {}
    }

    function saveProgress() {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          score: state.score,
          tasks: state.tasks,
          hintsUsed: state.hintsUsed,
        })
      );
      const all = JSON.parse(localStorage.getItem("ctf_all_progress") || "{}");
      if (allTasksCorrect()) {
        all[cfg.id] = {
          done: true,
          flag: cfg.flag,
          score: state.score,
          at: Date.now(),
        };
      } else if (all[cfg.id]) {
        delete all[cfg.id];
      }
      localStorage.setItem("ctf_all_progress", JSON.stringify(all));
    }

    function updateUI() {
      const scoreEl = $("score");
      if (scoreEl) scoreEl.textContent = state.score;
      const bar = $("bar");
      if (bar) bar.style.width = state.score + "%";
      const flag = $("flag");
      if (flag) flag.classList.toggle("show", allTasksCorrect());
      const sub = $("scoreSub");
      if (sub) {
        sub.textContent = allTasksCorrect()
          ? "All tasks complete" + (state.score < 100 ? " (hints reduced score)" : "")
          : "";
      }
    }

    function cardHasAnswer(feedbackId) {
      const fb = $(feedbackId);
      if (!fb) return false;
      const card = fb.closest(".card") || fb.closest(".task-card");
      if (!card) return true;
      const fields = card.querySelectorAll("input, select, textarea");
      const radioNames = new Set();
      let radioAnswered = false;
      for (const f of fields) {
        if (f.type === "radio") {
          radioNames.add(f.name);
          continue;
        }
        if (f.type === "checkbox" && f.checked) return true;
        if (f.tagName === "SELECT" && f.value.trim()) return true;
        if ((f.type === "text" || f.type === "number" || f.type === "password") && f.value.trim())
          return true;
      }
      for (const name of radioNames) {
        if (card.querySelector('input[name="' + name + '"]:checked')) radioAnswered = true;
      }
      const zoneEl = card.querySelector("[data-answer-zone]");
      if (zoneEl) {
        const empty = zoneEl.getAttribute("data-empty-text") || "";
        const txt = zoneEl.textContent.trim();
        if (txt && txt !== empty) return true;
      }
      return radioAnswered || false;
    }

    function check(taskNum, isCorrect, feedbackId) {
      const fb = $(feedbackId);
      if (!fb) return;
      if (!cardHasAnswer(feedbackId)) {
        fb.className = "fb bad";
        fb.textContent = "Enter or select an answer before checking.";
        return;
      }
      const prev = state.tasks[taskNum];
      if (isCorrect) {
        if (prev !== "ok") {
          state.tasks[taskNum] = "ok";
          state.score = Math.min(100, state.score + POINTS);
        }
        fb.className = "fb ok";
        fb.textContent = "Correct (+" + POINTS + ").";
        if (cfg.onCorrect) cfg.onCorrect(taskNum);
      } else {
        if (prev === "ok") {
          state.tasks[taskNum] = "wrong";
          state.score = Math.max(0, state.score - POINTS);
          fb.className = "fb bad";
          fb.textContent =
            "Wrong - previous points for this task removed (-" + POINTS + ").";
        } else {
          state.tasks[taskNum] = "wrong";
          fb.className = "fb bad";
          fb.textContent =
            "Incorrect. Review the evidence or use Hint (-" + HINT_COST + " pts).";
        }
      }
      updateUI();
      saveProgress();
    }

    function hint(taskNum, hintText, hintElId) {
      const el = $(hintElId || "hint-" + taskNum);
      if (!el) return;
      if (state.score < HINT_COST) {
        el.textContent =
          "Hints cost " + HINT_COST + " points. Complete any task first so your score is at least " +
          HINT_COST + ".";
        return;
      }
      state.score = Math.max(0, state.score - HINT_COST);
      state.hintsUsed++;
      el.textContent = "Hint: " + hintText;
      updateUI();
      saveProgress();
    }

    function reset() {
      state.score = 0;
      state.tasks = {};
      state.hintsUsed = 0;
      document.querySelectorAll(".fb").forEach((e) => {
        e.className = "fb";
        e.textContent = "";
      });
      document.querySelectorAll("[id^=hint-]").forEach((e) => (e.textContent = ""));
      const root = document.querySelector("main") || document.body;
      root.querySelectorAll("input").forEach((i) => {
        if (i.type === "checkbox" || i.type === "radio") i.checked = false;
        else i.value = "";
      });
      root.querySelectorAll("select").forEach((s) => (s.selectedIndex = 0));
      const flag = $("flag");
      if (flag) flag.classList.remove("show");
      localStorage.removeItem(storageKey);
      const all = JSON.parse(localStorage.getItem("ctf_all_progress") || "{}");
      delete all[cfg.id];
      localStorage.setItem("ctf_all_progress", JSON.stringify(all));
      updateUI();
      if (cfg.onReset) cfg.onReset();
    }

    load();
    if (allTasksCorrect()) saveProgress();
    updateUI();

    return { check, hint, reset, getScore: () => state.score, allTasksCorrect, state };
  }

  global.initCTF = initCTF;
})(window);
