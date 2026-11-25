// The browser's name and version, for the notification check's report.

// Order matters: most browsers also claim to be Chrome or Safari.
const browsers: [RegExp, string][] = [
  [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
  [/EdgA?\/([\d.]+)|EdgiOS\/([\d.]+)/, "Edge"],
  [/OPR\/([\d.]+)|OPiOS\/([\d.]+)/, "Opera"],
  [/MiuiBrowser\/([\d.]+)/, "Mi Browser"],
  [/HuaweiBrowser\/([\d.]+)/, "Huawei Browser"],
  [/UCBrowser\/([\d.]+)/, "UC Browser"],
  [/FxiOS\/([\d.]+)|Firefox\/([\d.]+)/, "Firefox"],
  [/CriOS\/([\d.]+)/, "Chrome (iPhone)"],
  [/Chrome\/([\d.]+)/, "Chrome u otro basado en Chromium"],
  [/Version\/([\d.]+).*Safari/, "Safari"],
];

export function browserName(userAgent: string) {
  for (const [pattern, name] of browsers) {
    const found = userAgent.match(pattern);
    if (found) return `${name} ${found.slice(1).find(Boolean) ?? ""}`.trim();
  }
  return "Navegador no reconocido";
}
