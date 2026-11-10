(function () {
  "use strict";

  var DEFAULT_SERVER = "https://nimbus-auth.netlify.app";
  var SERVER_KEY = "nimbus-auth-url";
  var TOKEN_KEY = "nimbus-site-token";

  var authView = document.getElementById("authView");
  var userView = document.getElementById("userView");
  var form = document.getElementById("authForm");
  var username = document.getElementById("username");
  var password = document.getElementById("password");
  var repeat = document.getElementById("repeat");
  var repeatField = document.getElementById("repeatField");
  var authError = document.getElementById("authError");
  var authSubmit = document.getElementById("authSubmit");
  var serverInput = document.getElementById("serverUrl");
  var saveServer = document.getElementById("saveServer");
  var serverStatus = document.getElementById("serverStatus");
  var serverLabel = document.getElementById("serverLabel");
  var userServer = document.getElementById("userServer");
  var userUuid = document.getElementById("userUuid");
  var userName = document.getElementById("userName");
  var userCreated = document.getElementById("userCreated");
  var avatar = document.getElementById("avatar");
  var toast = document.getElementById("toast");

  var mode = "login";
  var server = DEFAULT_SERVER;
  var token = null;
  var user = null;

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {}
  }

  function toastMessage(text, isError) {
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    toast.classList.toggle("error", Boolean(isError));
    clearTimeout(toastMessage.timer);
    toastMessage.timer = setTimeout(function () {
      toast.hidden = true;
    }, 3200);
  }

  function normalizeServer(value) {
    var raw = String(value || "").trim();
    if (!raw) throw new Error("Укажи адрес сервера аккаунтов");
    if (!/^[a-z]+:\/\//i.test(raw)) {
      var local = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(raw);
      raw = (local ? "http://" : "https://") + raw;
    }
    var url;
    try {
      url = new URL(raw);
    } catch (e) {
      throw new Error("Некорректный адрес сервера");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Адрес должен начинаться с http:// или https://");
    }
    var local = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname);
    if (url.protocol === "http:" && !local) {
      throw new Error("Для удалённого сервера нужен https");
    }
    return url.origin + (url.pathname && url.pathname !== "/" ? url.pathname.replace(/\/+$/, "") : "");
  }

  function serverLabelText(url) {
    try {
      var parsed = new URL(url);
      return parsed.host + (parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/+$/, "") : "");
    } catch (e) {
      return url;
    }
  }

  function setServer(url) {
    server = url;
    serverInput.value = url;
    serverLabel.textContent = serverLabelText(url);
    if (userServer) userServer.textContent = serverLabelText(url);
  }

  function setError(message) {
    authError.textContent = message || "";
    authError.classList.toggle("show", Boolean(message));
  }

  function setStatus(message, kind) {
    serverStatus.textContent = message || "";
    serverStatus.className = "server-status" + (kind ? " " + kind : "");
  }

  function setLoading(loading) {
    authSubmit.disabled = loading;
    authSubmit.textContent = loading
      ? "Подождите…"
      : mode === "register"
        ? "Создать аккаунт"
        : "Войти";
  }

  function humanError(error) {
    var message = String((error && error.message) || error || "Неизвестная ошибка");
    if (error && error.name === "AbortError") {
      return "Сервер не ответил. Проверь адрес и попробуй снова.";
    }
    if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
      return "Нет связи с сервером аккаунтов. Проверь адрес, https и доступность сервера.";
    }
    return message;
  }

  async function api(path, options) {
    var settings = options || {};
    var url = server.replace(/\/+$/, "") + path;
    var headers = { Accept: "application/json" };
    if (settings.body) headers["Content-Type"] = "application/json";
    var bearer = settings.token !== undefined ? settings.token : token;
    if (bearer) headers.Authorization = "Bearer " + bearer;

    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, 15000);

    var response;
    try {
      response = await fetch(url, {
        method: settings.method || "GET",
        headers: headers,
        body: settings.body || undefined,
        signal: controller.signal,
        cache: "no-store"
      });
    } finally {
      clearTimeout(timer);
    }

    var data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
    if (!response.ok) {
      var error = new Error((data && data.error) || "Сервер вернул ошибку " + response.status);
      error.status = response.status;
      throw error;
    }
    return data || { ok: true };
  }

  function showUser(nextUser) {
    user = nextUser;
    userView.hidden = false;
    authView.hidden = true;
    userName.textContent = user.username || "Player";
    avatar.textContent = (user.username || "P").charAt(0).toUpperCase();
    userUuid.textContent = user.uuid || "неизвестно";
    if (user.createdAt) {
      try {
        userCreated.textContent = new Date(user.createdAt).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
      } catch (e) {
        userCreated.textContent = "—";
      }
    } else {
      userCreated.textContent = "—";
    }
    if (userServer) userServer.textContent = serverLabelText(server);
    document.title = user.username + " — Light Visual";
  }

  function showAuth() {
    user = null;
    userView.hidden = true;
    authView.hidden = false;
    document.title = "Личный кабинет — Light Visual";
  }

  async function checkHealth() {
    setStatus("Проверяем сервер…", "");
    try {
      var data = await api("/api/health", { token: null });
      var serviceName = data.service === "light-visual-auth" ? "Light Visual Auth" : (data.service || "Light Visual Auth");
      setStatus("Сервер отвечает: " + serviceName + " · v" + (data.version || 1), "ok");
    } catch (error) {
      setStatus(humanError(error), "err");
    }
  }

  function setMode(nextMode) {
    mode = nextMode === "register" ? "register" : "login";
    document.querySelectorAll("[data-auth-tab]").forEach(function (tab) {
      var active = tab.getAttribute("data-auth-tab") === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    repeatField.hidden = mode !== "register";
    repeat.required = mode === "register";
    password.autocomplete = mode === "register" ? "new-password" : "current-password";
    setError("");
    setLoading(false);
    username.focus();
  }

  function validate() {
    var name = username.value.trim();
    var pass = password.value;
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
      return "Ник: от 3 до 16 символов, только латиница, цифры и _";
    }
    if (pass.length < 6 || pass.length > 128) {
      return "Пароль: от 6 до 128 символов";
    }
    if (mode === "register" && pass !== repeat.value) {
      return "Пароли не совпадают";
    }
    return null;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    var problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    try {
      var body = {
        username: username.value.trim(),
        password: password.value
      };
      if (mode === "register") body.repeat = repeat.value;
      var data = await api(mode === "register" ? "/api/register" : "/api/login", {
        method: "POST",
        body: JSON.stringify(body),
        token: null
      });
      if (!data.token || !data.user) {
        throw new Error("Сервер не вернул сессию");
      }
      token = data.token;
      writeStorage(TOKEN_KEY, token);
      showUser(data.user);
      toastMessage(mode === "register" ? "Аккаунт создан" : "Добро пожаловать, " + data.user.username);
      setError("");
      form.reset();
    } catch (error) {
      setError(humanError(error));
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      if (token) await api("/api/logout", { method: "POST" });
    } catch (e) {
      // the local session is cleared even when the server is offline
    }
    token = null;
    writeStorage(TOKEN_KEY, null);
    showAuth();
    toastMessage("Вы вышли из аккаунта");
  }

  function copyUuid() {
    var value = user && user.uuid ? user.uuid : "";
    if (!value) {
      toastMessage("UUID не найден", true);
      return;
    }
    var done = function () {
      toastMessage("UUID скопирован");
    };
    var fail = function () {
      toastMessage("Не удалось скопировать UUID", true);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done, fail);
      return;
    }
    try {
      var area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      done();
    } catch (e) {
      fail();
    }
  }

  async function saveServerUrl() {
    var next;
    try {
      next = normalizeServer(serverInput.value);
    } catch (error) {
      setStatus(humanError(error), "err");
      toastMessage(humanError(error), true);
      return;
    }
    if (token && server !== next) {
      var ok = window.confirm("Сменить сервер аккаунтов? Сессия на сайте будет сброшена.");
      if (!ok) {
        serverInput.value = server;
        return;
      }
      token = null;
      writeStorage(TOKEN_KEY, null);
      showAuth();
    }
    server = next;
    writeStorage(SERVER_KEY, server);
    setServer(server);
    checkHealth();
    toastMessage("Адрес сервера сохранён");
  }

  function openServerSettings() {
    var details = document.querySelector(".account-server");
    if (details) {
      details.open = true;
      details.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    serverInput.focus();
  }

  async function init() {
    var initial = readStorage(SERVER_KEY) || DEFAULT_SERVER;
    try {
      var fromQuery = new URLSearchParams(location.search).get("server");
      if (fromQuery) {
        initial = normalizeServer(fromQuery);
        writeStorage(SERVER_KEY, initial);
      }
    } catch (e) {}
    try {
      server = normalizeServer(initial);
    } catch (e) {
      server = DEFAULT_SERVER;
    }
    setServer(server);
    token = readStorage(TOKEN_KEY);

    document.querySelectorAll("[data-auth-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        setMode(tab.getAttribute("data-auth-tab"));
      });
    });
    form.addEventListener("submit", submit);
    saveServer.addEventListener("click", saveServerUrl);
    document.getElementById("logout").addEventListener("click", logout);
    document.getElementById("copyUuid").addEventListener("click", copyUuid);
    document.getElementById("openServer").addEventListener("click", openServerSettings);
    serverInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        saveServerUrl();
      }
    });

    if (token) {
      try {
        var data = await api("/api/me");
        if (data && data.user) {
          showUser(data.user);
        } else {
          throw new Error("Сессия не найдена");
        }
      } catch (error) {
        token = null;
        writeStorage(TOKEN_KEY, null);
        showAuth();
        if (error.status !== 401) {
          toastMessage(humanError(error), true);
        }
      }
    } else {
      showAuth();
    }

    setMode(mode);
    checkHealth();
  }

  init();
})();
