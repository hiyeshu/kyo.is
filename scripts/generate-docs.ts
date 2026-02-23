#!/usr/bin/env bun
/**
 * [INPUT]: docs/zh/*.md, docs/en/*.md 双语 Markdown 源文件
 * [OUTPUT]: public/docs/zh/*.html, public/docs/en/*.html 静态页面
 * [POS]: 文档构建管线核心，Markdown → HTML 静态站点生成器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readdir, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// ── 常量 ──
const DOCS_DIR = "docs";
const OUTPUT_DIR = "public/docs";
const GITHUB_REPO = "https://github.com/hiyeshu/kyo.is";
const GITHUB_BLOB = `${GITHUB_REPO}/blob/main`;
const LOCALES = ["zh", "en"] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = "zh";

// 中文是默认语言，输出到 /docs/；英文输出到 /docs/en/
const I18N: Record<Locale, { docs: string; launch: string; altLang: Locale; altLabel: string; pathPrefix: string; altPrefix: string }> = {
  zh: { docs: "文档", launch: "启动 Kyo", altLang: "en", altLabel: "EN", pathPrefix: "/docs", altPrefix: "/docs/en" },
  en: { docs: "Docs", launch: "Launch Kyo", altLang: "zh", altLabel: "中", pathPrefix: "/docs/en", altPrefix: "/docs" },
};

// ── Markdown → HTML ──
function markdownToHtml(md: string): string {
  let html = md;
  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 代码块
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    if (lang === "mermaid") {
      codeBlocks.push(`<pre class="mermaid">${code.trimEnd()}</pre>`);
    } else {
      codeBlocks.push(`<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`);
    }
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // 行内代码
  html = html.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);

  // 表格
  html = html.replace(
    /\n\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g,
    (_, headerRow, bodyRows) => {
      const headers = headerRow.split("|").map((h: string) => h.trim()).filter(Boolean);
      const headerHtml = headers.map((h: string) => `<th>${h}</th>`).join("");
      const rows = bodyRows.trim().split("\n").map((row: string) => {
        const cells = row.split("|").map((c: string) => c.trim()).filter(Boolean);
        return `<tr>${cells.map((c: string) => `<td>${c}</td>`).join("")}</tr>`;
      }).join("");
      return `\n<table><thead><tr>${headerHtml}</tr></thead><tbody>${rows}</tbody></table>\n`;
    }
  );

  // 标题
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // 列表
  const listItems: { type: "ul" | "ol"; content: string; indent: number }[] = [];
  html = html.replace(/^(\s*)([*+-])\s+(.+)$/gm, (_, indent, _m, content) => {
    const idx = listItems.length;
    listItems.push({ type: "ul", content, indent: indent.length });
    return `__LIST_ITEM_${idx}__`;
  });
  html = html.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, (_, indent, _n, content) => {
    const idx = listItems.length;
    listItems.push({ type: "ol", content, indent: indent.length });
    return `__LIST_ITEM_${idx}__`;
  });
  html = html.replace(/(__LIST_ITEM_\d+__)\n\n(__LIST_ITEM_\d+__)/g, "$1\n$2");
  html = html.replace(/(__LIST_ITEM_\d+__)\n\n(__LIST_ITEM_\d+__)/g, "$1\n$2");

  html = html.replace(/(__LIST_ITEM_\d+__\n?)+/g, (match) => {
    const indices = [...match.matchAll(/__LIST_ITEM_(\d+)__/g)].map((m) => parseInt(m[1]));
    if (indices.length === 0) return match;
    let result = "";
    const stack: { type: "ul" | "ol"; indent: number; hasOpenLi: boolean }[] = [];
    for (let i = 0; i < indices.length; i++) {
      const item = listItems[indices[i]];
      const nextItem = i < indices.length - 1 ? listItems[indices[i + 1]] : null;
      while (stack.length > 0 && stack[stack.length - 1].indent > item.indent) {
        const p = stack.pop()!;
        if (p.hasOpenLi) result += "</li>";
        result += `</${p.type}>`;
      }
      if (stack.length > 0 && stack[stack.length - 1].indent === item.indent && stack[stack.length - 1].hasOpenLi) {
        result += "</li>";
        stack[stack.length - 1].hasOpenLi = false;
      }
      if (stack.length === 0 || item.indent > stack[stack.length - 1].indent) {
        result += `<${item.type}>`;
        stack.push({ type: item.type, indent: item.indent, hasOpenLi: false });
      }
      result += `<li>${item.content}`;
      stack[stack.length - 1].hasOpenLi = true;
      if (!nextItem || nextItem.indent <= item.indent) {
        result += "</li>";
        stack[stack.length - 1].hasOpenLi = false;
      }
    }
    while (stack.length > 0) {
      const p = stack.pop()!;
      if (p.hasOpenLi) result += "</li>";
      result += `</${p.type}>`;
    }
    return result + "\n";
  });

  // 粗体 / 斜体
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 文件路径 → GitHub 链接
  html = html.replace(/<code>([^<]*)<\/code>/g, (match, content) => {
    if (match.includes("http") || match.includes("github.com") || match.includes("href=")) return match;
    const filePathMatch = content.match(/(src\/|api\/|scripts\/|docs\/|public\/)([a-zA-Z0-9_\-/.]+\.(tsx?|jsx?|json|css|html|md|sh|mdc))/);
    if (!filePathMatch) return match;
    const fullPath = filePathMatch[1] + filePathMatch[2];
    const githubUrl = `${GITHUB_BLOB}/${fullPath}`;
    const linked = content.replace(filePathMatch[0], `<a href="${githubUrl}" target="_blank" rel="noopener noreferrer">${filePathMatch[0]}</a>`);
    return `<code>${linked}</code>`;
  });

  // 水平线
  html = html.replace(/^---$/gm, "<hr>");

  // 段落
  html = html.split("\n\n").map((block) => {
    block = block.trim();
    if (!block) return "";
    if (block.startsWith("<")) return block;
    if (block.startsWith("__CODE_BLOCK_")) return block;
    return `<p>${block.replace(/\n/g, " ")}</p>`;
  }).join("\n");

  // 还原代码块
  codeBlocks.forEach((code, i) => { html = html.replace(`__CODE_BLOCK_${i}__`, code); });
  return html;
}

// ── 文档条目 ──
interface DocEntry {
  id: string;
  title: string;
  html: string;
  filename: string;
  sectionNum: string;
  parentSection?: string;
  children: DocEntry[];
}

function parseSectionNumber(filename: string): string {
  const m = filename.match(/^(\d+(?:\.\d+)?)-/);
  return m ? m[1] : "";
}

function getParentSection(sn: string): string | undefined {
  return sn.includes(".") ? sn.split(".")[0] : undefined;
}

function sortBySectionNumber(a: DocEntry, b: DocEntry): number {
  const pa = a.sectionNum.split(".").map(Number);
  const pb = b.sectionNum.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// ── 侧边栏 ──
function generateSidebar(current: DocEntry, all: DocEntry[], locale: Locale): string {
  const rootDocs: DocEntry[] = [];
  const childMap = new Map<string, DocEntry[]>();
  for (const doc of all) {
    if (doc.parentSection) {
      const arr = childMap.get(doc.parentSection) || [];
      arr.push(doc);
      childMap.set(doc.parentSection, arr);
    } else {
      rootDocs.push(doc);
    }
  }
  for (const [k, v] of childMap) childMap.set(k, v.sort(sortBySectionNumber));

  const t = I18N[locale];
  const items: string[] = [];

  for (const doc of rootDocs.sort(sortBySectionNumber)) {
    const children = childMap.get(doc.sectionNum) || [];
    const cls = current.id === doc.id ? "active" : "";
    items.push(`<a href="${t.pathPrefix}/${doc.id}" class="nav-item ${cls}"><span class="nav-num">${doc.sectionNum}</span>${doc.title}</a>`);

    if (children.length > 0) {
      const isCurrent = current.sectionNum === doc.sectionNum || current.parentSection === doc.sectionNum;
      if (isCurrent) {
        for (const c of children) {
          const ccls = c.id === current.id ? "active" : "";
          items.push(`<a href="${t.pathPrefix}/${c.id}" class="nav-item nav-child ${ccls}"><span class="nav-num">${c.sectionNum}</span>${c.title}</a>`);
        }
      }
    }
  }
  return items.join("\n");
}

// ── 页面模板 ──
function generatePage(doc: DocEntry, all: DocEntry[], idx: number, locale: Locale): string {
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;
  const sidebar = generateSidebar(doc, all, locale);
  const t = I18N[locale];
  const htmlLang = locale === "zh" ? "zh-CN" : "en";

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title} - Kyo</title>
  <link rel="icon" href="/favicon.svg">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#fafafa;--fg:#171717;--fg2:#666;--fg3:#999;
      --border:#eaeaea;--accent:#000;--accent-hover:#444;
      --code-bg:#f5f5f5;--code-border:#eaeaea;
      --sidebar-w:240px;--header-h:48px;--content-max:720px;
      --radius:6px;
    }
    html{font-size:15px}
    body{
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
      line-height:1.7;color:var(--fg);background:var(--bg);
      -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
    }
    a{color:var(--fg);text-decoration:none}
    a:hover{color:var(--accent-hover)}

    .header{
      position:sticky;top:0;z-index:50;
      background:hsla(0,0%,98%,.8);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      border-bottom:1px solid var(--border);
      height:var(--header-h);padding:0 24px;
      display:flex;align-items:center;justify-content:space-between;
    }
    .header-left{display:flex;align-items:center;gap:8px}
    .header-left .logo{display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--fg)}
    .header-left .logo img{width:20px;height:20px}
    .header-left .logo span{font-weight:600;font-size:14px;letter-spacing:-.02em}
    .header-left .sep{color:var(--fg3);font-weight:300;font-size:18px}
    .header-left .label{color:var(--fg2);font-size:13px;font-weight:400}
    .header-right{display:flex;align-items:center;gap:12px}
    .header-right a{font-size:13px;color:var(--fg2);display:flex;align-items:center;gap:5px;transition:color .15s}
    .header-right a:hover{color:var(--fg)}
    .lang-switch{
      font-size:12px;color:var(--fg3);border:1px solid var(--border);
      padding:3px 10px;border-radius:var(--radius);transition:all .15s;
    }
    .lang-switch:hover{color:var(--fg);border-color:var(--fg3)}
    .launch{
      background:var(--accent);color:#fff !important;padding:5px 14px;border-radius:var(--radius);
      font-size:13px;font-weight:500;transition:background .15s;
    }
    .launch:hover{background:var(--accent-hover);color:#fff !important}

    .container{display:flex;max-width:calc(var(--sidebar-w) + var(--content-max) + 80px);margin:0 auto}

    .sidebar{
      width:var(--sidebar-w);flex-shrink:0;
      padding:20px 16px 40px;
      position:sticky;top:var(--header-h);height:calc(100vh - var(--header-h));
      overflow-y:auto;border-right:1px solid var(--border);
    }
    .sidebar::-webkit-scrollbar{width:0;display:none}
    .nav-item{
      display:flex;align-items:center;gap:0;
      padding:7px 12px;margin:1px 0;
      font-size:13px;color:var(--fg3);
      border-radius:var(--radius);
      transition:all .15s;text-decoration:none;
    }
    .nav-item:hover{background:#f0f0f0;color:var(--fg2)}
    .nav-item.active{background:#f0f0f0;color:var(--fg);font-weight:500}
    .nav-num{width:22px;flex-shrink:0;font-size:11px;opacity:.45;font-variant-numeric:tabular-nums}
    .nav-child{margin-left:12px;font-size:12.5px !important}
    .nav-child .nav-num{width:28px}

    .content{flex:1;padding:40px 48px 80px;min-width:0;max-width:var(--content-max)}
    article{animation:fadeIn .3s ease}
    @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

    h1{font-size:2rem;font-weight:700;letter-spacing:-.04em;line-height:1.2;margin-bottom:12px;color:var(--fg)}
    h2{font-size:1.3rem;font-weight:600;letter-spacing:-.03em;margin:40px 0 16px;color:var(--fg);padding-bottom:8px;border-bottom:1px solid var(--border)}
    h3{font-size:1.05rem;font-weight:600;letter-spacing:-.02em;margin:28px 0 10px;color:var(--fg)}
    h4{font-size:.9rem;font-weight:600;margin:20px 0 8px;color:var(--fg)}
    p{margin:12px 0;color:var(--fg2);font-size:.935rem}
    strong{color:var(--fg);font-weight:600}
    hr{border:none;border-top:1px solid var(--border);margin:32px 0}
    blockquote{border-left:3px solid var(--border);padding:2px 0 2px 16px;margin:16px 0;color:var(--fg3);font-style:italic}
    blockquote p{color:var(--fg3)}
    ul,ol{margin:12px 0 12px 20px;color:var(--fg2)}
    li{margin:6px 0;font-size:.935rem}
    li::marker{color:var(--fg3)}

    code{
      font-family:"SF Mono",SFMono-Regular,Menlo,Monaco,Consolas,monospace;
      font-size:.835rem;background:var(--code-bg);border:1px solid var(--code-border);
      padding:2px 6px;border-radius:4px;color:var(--fg);
    }
    pre{
      background:var(--fg);color:#e5e5e5;
      padding:20px 24px;border-radius:var(--radius);overflow-x:auto;
      margin:20px 0;font-size:.825rem;line-height:1.6;border:1px solid #333;
    }
    pre code{background:none;border:none;padding:0;color:inherit;font-size:inherit;border-radius:0}

    table{width:100%;border-collapse:collapse;margin:20px 0;font-size:.875rem}
    th,td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--border)}
    th{font-weight:600;font-size:.8rem;color:var(--fg3);text-transform:uppercase;letter-spacing:.04em}
    td{color:var(--fg2)}
    tr:last-child td{border-bottom:none}

    pre.mermaid{background:none;border:none;padding:0;text-align:center;margin:24px 0;color:var(--fg)}
    .mermaid svg{max-width:100%;height:auto}

    details{margin:12px 0}
    details summary{cursor:pointer;color:var(--fg2);font-size:.9rem;padding:6px 0;user-select:none;font-weight:500}
    details summary:hover{color:var(--fg)}
    details[open] summary{margin-bottom:8px}

    .page-nav{
      display:flex;justify-content:space-between;gap:16px;
      margin-top:48px;padding-top:24px;border-top:1px solid var(--border);
    }
    .page-nav a{font-size:.875rem;color:var(--fg2);transition:color .15s;display:flex;align-items:center;gap:4px}
    .page-nav a:hover{color:var(--fg)}
    .page-nav .arrow{font-size:1.1em;opacity:.5}

    .menu-btn{
      display:none;background:transparent;border:0;padding:4px;cursor:pointer;
      -webkit-appearance:none;appearance:none;color:inherit;line-height:1;
    }
    .menu-btn svg{display:block;width:20px;height:20px}
    .overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:30}
    @media(max-width:768px){
      .menu-btn{display:flex !important;align-items:center;justify-content:center}
      .sidebar{
        position:fixed;left:0;top:var(--header-h);
        width:280px;height:calc(100vh - var(--header-h));
        background:var(--bg);z-index:40;
        transform:translateX(-100%);transition:transform .25s ease;
        border-right:1px solid var(--border);
      }
      .sidebar.open{transform:translateX(0);box-shadow:4px 0 24px rgba(0,0,0,.08)}
      .sidebar.open ~ .overlay{display:block}
      .content{padding:24px 20px 60px}
      h1{font-size:1.6rem}
      h2{font-size:1.15rem}
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-left">
      <button class="menu-btn" onclick="toggleSidebar()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8h16M4 16h16"/></svg>
      </button>
      <a href="/" class="logo"><img src="/favicon.svg" alt="Kyo"><span>Kyo</span></a>
      <span class="sep">/</span>
      <span class="label">${t.docs}</span>
    </div>
    <div class="header-right">
      <a href="${t.altPrefix}/${doc.id}" class="lang-switch">${t.altLabel}</a>
      <a href="${GITHUB_REPO}" target="_blank">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      </a>
      <a href="/" class="launch">${t.launch}</a>
    </div>
  </header>

  <div class="container">
    <nav class="sidebar">${sidebar}</nav>
    <div class="overlay" onclick="toggleSidebar()"></div>
    <main class="content">
      <article>${doc.html}</article>
      <nav class="page-nav">
        ${prev ? `<a href="${t.pathPrefix}/${prev.id}"><span class="arrow">&larr;</span> ${prev.title}</a>` : "<span></span>"}
        ${next ? `<a href="${t.pathPrefix}/${next.id}">${next.title} <span class="arrow">&rarr;</span></a>` : "<span></span>"}
      </nav>
    </main>
  </div>

  <script>
    function toggleSidebar(){document.querySelector('.sidebar').classList.toggle('open')}
    function toggleNavGroup(b){
      const g=b.closest('.nav-group'),c=g.querySelector('.nav-children'),s=b.querySelector('svg');
      const o=g.classList.toggle('expanded');
      c.style.display=o?'block':'none';
      s.style.transform=o?'rotate(90deg)':'rotate(0deg)';
      b.setAttribute('aria-expanded',o);
    }
    document.addEventListener('click',e=>{
      const sb=document.querySelector('.sidebar'),mb=document.querySelector('.menu-btn');
      if(sb.classList.contains('open')&&!sb.contains(e.target)&&!mb.contains(e.target))sb.classList.remove('open');
    });
  </script>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({startOnLoad:true,theme:'neutral',securityLevel:'loose',
      themeVariables:{fontFamily:'-apple-system,sans-serif',fontSize:'13px',primaryColor:'#f5f5f5',primaryBorderColor:'#e5e5e5',primaryTextColor:'#171717',lineColor:'#999'},
      flowchart:{curve:'basis',padding:12,nodeSpacing:40,rankSpacing:40}
    });
  </script>
</body>
</html>`;
}

// ── 生成管线 ──
async function generateLocale(locale: Locale) {
  const srcDir = join(DOCS_DIR, locale);
  // 中文 → public/docs/  英文 → public/docs/en/
  const outDir = locale === DEFAULT_LOCALE ? OUTPUT_DIR : join(OUTPUT_DIR, locale);
  await mkdir(outDir, { recursive: true });

  const files = (await readdir(srcDir)).filter((f) => f.endsWith(".md")).sort();
  const docs: DocEntry[] = [];

  for (const file of files) {
    const content = await readFile(join(srcDir, file), "utf-8");
    const titleMatch = content.match(/^# (.+)$/m);
    const sectionNum = parseSectionNumber(file);
    const title = titleMatch ? titleMatch[1] : file.replace(/^\d+(?:\.\d+)?-/, "").replace(".md", "");
    const id = file.replace(/^\d+(?:\.\d+)?-/, "").replace(".md", "");
    const parentSection = getParentSection(sectionNum);
    const html = markdownToHtml(content);
    docs.push({ id, title, html, filename: file, sectionNum, parentSection, children: [] });
  }

  docs.sort(sortBySectionNumber);

  for (let i = 0; i < docs.length; i++) {
    const pageHtml = generatePage(docs[i], docs, i, locale);
    await Bun.write(join(outDir, `${docs[i].id}.html`), pageHtml);
  }

  // index → 重定向到第一篇
  const t = I18N[locale];
  const first = docs[0];
  await Bun.write(join(outDir, "index.html"),
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${t.pathPrefix}/${first?.id || "overview"}"></head></html>`);

  return docs.length;
}

async function generate() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  let total = 0;
  for (const locale of LOCALES) {
    const count = await generateLocale(locale);
    total += count;
    console.log(`  [${locale}] ${count} pages`);
  }

  console.log(`[docs] Generated ${total} pages total in ${OUTPUT_DIR}/`);
}

generate().catch((err) => {
  console.error("[docs] Failed:", err);
  process.exit(1);
});
