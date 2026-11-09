(function () {
  "use strict";

  var root = document.documentElement;
  var THEMES = [
    ["7C5CFF", "3FE0D0", "7FA8FF"],
    ["FF5C9E", "FFC2E0", "FF9BC4"],
    ["3FA0FF", "6EE7FF", "4FA8FF"],
    ["FF8A3C", "FFC857", "FF9E5E"],
    ["3FE0A0", "C6E84B", "7FE8C8"],
    ["8A90A6", "C6CDDF", "9AA2B8"],
    ["5C6CFF", "9E7BFF", "3C4C9E"],
    ["E05EE8", "FF8A5E", "C6A0FF"],
    ["rainbow", "3FE0D0", "7FA8FF"]
  ];
  var cards = Array.prototype.slice.call(document.querySelectorAll(".theme-card"));
  var dotsBox = document.getElementById("themeDots");
  var rainbowTimer = null;
  var rainbowHue = 0;

  function hardSet(theme) {
    stopRainbow();
    if (theme[0] === "rainbow") {
      startRainbow();
      return;
    }
    root.style.setProperty("--a1", "#" + theme[0]);
    root.style.setProperty("--a2", "#" + theme[1]);
    root.style.setProperty("--sky", "#" + theme[2]);
  }

  function startRainbow() {
    if (rainbowTimer) return;
    rainbowTimer = setInterval(function () {
      rainbowHue = (rainbowHue + 1.4) % 360;
      root.style.setProperty("--a1", "hsl(" + rainbowHue + ", 78%, 66%)");
      root.style.setProperty("--a2", "hsl(" + ((rainbowHue + 70) % 360) + ", 82%, 64%)");
      root.style.setProperty("--sky", "hsl(" + ((rainbowHue + 140) % 360) + ", 70%, 68%)");
    }, 60);
  }

  function stopRainbow() {
    if (rainbowTimer) {
      clearInterval(rainbowTimer);
      rainbowTimer = null;
    }
  }

  function savedThemeIndex() {
    try {
      var index = parseInt(localStorage.getItem("nimbus-theme"), 10);
      return index >= 0 && index < THEMES.length ? index : 0;
    } catch (e) {
      return 0;
    }
  }

  function applyTheme(index, save) {
    index = index >= 0 && index < THEMES.length ? index : 0;
    hardSet(THEMES[index]);

    cards.forEach(function (card, i) {
      card.setAttribute("aria-pressed", i === index ? "true" : "false");
    });
    if (dotsBox) {
      Array.prototype.forEach.call(dotsBox.children, function (dot, i) {
        dot.setAttribute("aria-pressed", i === index ? "true" : "false");
      });
    }
    root.setAttribute("data-theme", String(index + 1));

    if (save) {
      try {
        localStorage.setItem("nimbus-theme", String(index));
      } catch (e) {}
    }
  }

  function buildThemeDots() {
    if (!dotsBox || !cards.length) return;
    cards.forEach(function (card, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-pressed", "false");
      dot.title = card.querySelector("b") ? card.querySelector("b").textContent : "Тема " + (i + 1);
      dot.setAttribute("aria-label", dot.title);
      var a = card.getAttribute("data-a");
      dot.style.background =
        a === "rainbow"
          ? "conic-gradient(#ff5c8a, #ffb84d, #c6e84b, #3fe0a0, #3fa0ff, #7c5cff, #e05ee8, #ff5c8a)"
          : "linear-gradient(135deg, #" + a + ", #" + card.getAttribute("data-b") + ")";
      dot.addEventListener("click", function () {
        applyTheme(i, true);
      });
      dotsBox.appendChild(dot);
      card.addEventListener("click", function () {
        applyTheme(i, true);
      });
    });
  }

  buildThemeDots();
  applyTheme(savedThemeIndex(), false);

  // Mobile navigation
  var burger = document.getElementById("navBurger");
  var mobileMenu = document.getElementById("mobileMenu");
  function closeMobile() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove("open");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }
  if (burger && mobileMenu) {
    burger.addEventListener("click", function () {
      var open = mobileMenu.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMobile);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMobile();
    });
  }

  // Reveal on scroll
  var revealItems = document.querySelectorAll(".reveal");
  if (revealItems.length) {
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      revealItems.forEach(function (item) {
        observer.observe(item);
      });
    } else {
      revealItems.forEach(function (item) {
        item.classList.add("in");
      });
    }
  }

  // Copy-to-clipboard buttons
  var toast = document.getElementById("toast");
  var toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.hidden = true;
    }, 2800);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      copyText(button.getAttribute("data-copy")).then(
        function () {
          showToast("SHA256 скопирован");
        },
        function () {
          showToast("Не удалось скопировать");
        }
      );
    });
  });
})();
