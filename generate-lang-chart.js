const fs = require('fs');
const path = require('path');

// 1️⃣ 配置
if (!WAKATIME_API_KEY) {
  console.error("Please set WAKATIME_API_KEY in GitHub Actions secrets");
  process.exit(1);
}
// 映射语言到官方颜色
const LANG_COLORS = {
  // 前端
  "Vue.js": "#42b883",
  "React": "#61dafb",
  "Angular": "#dd0031",
  "Svelte": "#ff3e00",
  "JavaScript": "#f7df1e",
  "TypeScript": "#3178c6",
  "HTML": "#e34c26",
  "CSS": "#264de4",
  "SCSS": "#cd6799",
  "LESS": "#1d365d",
  "JSON": "#292929",
  "Markdown": "#083fa1",
  "YAML": "#cb171e",
  "GraphQL": "#e535ab",

  // 后端 / 跨端
  "Node.js": "#339933",
  "NestJS": "#e0234e",
  "Python": "#3572A5",
  "Go": "#00ADD8",
  "Java": "#b07219",
  "C#": "#178600",
  "C++": "#f34b7d",
  "PHP": "#8892be",
  "Ruby": "#701516",
  "Rust": "#dea584",
  "Kotlin": "#A97BFF",
  "Swift": "#ffac45",
  "Dart": "#00B4AB",

  // 数据/脚本
  "Shell": "#89e051",
  "Bash": "#89e051",
  "PowerShell": "#012456",
  "SQL": "#e38c00",
  "Lua": "#000080",
  "R": "#198ce7",
  "Perl": "#0298c3",

  // 文档 / 配置
  "XML": "#0060ac",
  "TOML": "#9c4221",
  "INI": "#d1dbe0",

  // 插件和其他
  "Dockerfile": "#384d54",
  "Makefile": "#427819",
  "Go Module": "#00ADD8"
};


// 获取最近 7 天
const end = new Date();
const start = new Date();
start.setDate(end.getDate() - 7);

const startStr = start.toISOString().split('T')[0];
const endStr = end.toISOString().split('T')[0];

// Node 18+ 内置 fetch
async function fetchLangs() {
  const url = `https://wakatime.com/api/v1/users/current/summaries?start=${startStr}&end=${endStr}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(WAKATIME_API_KEY).toString('base64')}`
    }
  });

  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const data = await res.json();
  const summaries = data.data || [];

  // 聚合 language 时间
  const langMap = {};
  summaries.forEach(day => {
    (day.languages || []).forEach(lang => {
      if (!langMap[lang.name]) langMap[lang.name] = 0;
      langMap[lang.name] += lang.text_seconds || 0;
    });
  });

  const totalSeconds = Object.values(langMap).reduce((a, b) => a + b, 0) || 1;

  const langs = Object.entries(langMap)
    .map(([name, seconds]) => ({
      name,
      hours: seconds / 3600,
      percent: (seconds / totalSeconds) * 100
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5); // 前五语言

  return langs;
}

async function generateSVG() {
  const langs = await fetchLangs()
  const width = 400;
  const padding = 20;
  const barHeight = 20;
  const barGap = 15;
  const totalWidth = width - padding * 2;
  const height = langs.length * (barHeight + barGap) + padding * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#fff"/>`;

  langs.forEach((lang, i) => {
    const y = padding + i * (barHeight + barGap);
    const barWidth = (lang.percent / 100) * totalWidth;
    const color = LANG_COLORS[lang.name] || "#888";

    // 底色条
    svg += `<rect x="${padding}" y="${y}" width="${totalWidth}" height="${barHeight}" rx="6" fill="#eee" />\n`;
    // 彩色条
    svg += `<rect x="${padding}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="${color}" />\n`;

    // 文本颜色
    let textColor;
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // 如果亮度高（浅色条），文字用深色，否则白色
    textColor = brightness > 160 ? "#333" : "#fff";
    svg += `<text x="${padding + 5}" y="${y + barHeight - 5}" font-family="sans-serif" font-size="12" fill="${textColor}"

    >
      ${lang.name} ${lang.hours.toFixed(2)} hrs (${lang.percent.toFixed(2)}%)
    </text>\n`;
  });

  svg += "</svg>";

  const outDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir, 'top-langs.svg'), svg);
  console.log("SVG 生成成功: assets/top-langs.svg");
}

generateSVG();
