const saved = localStorage.getItem("theme");
const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = saved ?? (sysDark ? "dark" : "light");
const toggleButton = document.getElementById("toggle");

if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
  if (savedTheme === "dark") {
    toggleButton.classList.toggle("dark", true);
    toggleButton.setAttribute("aria-checked", true);
    toggleButton.querySelector(".toggle-thumb i").className = "ti ti-moon";
  }
}
toggleButton.addEventListener("click", () => setTheme());
toggleButton.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    setTheme();
  }
});

function setTheme() {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  const isDark = newTheme === "dark";
  toggleButton.classList.toggle("dark", isDark);
  toggleButton.setAttribute("aria-checked", isDark);
  const thumb = toggleButton.querySelector(".toggle-thumb i");
  thumb.className = isDark ? "ti ti-moon" : "ti ti-sun";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}
