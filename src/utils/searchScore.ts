/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: scoreItem, getMatchInfo, MatchField, MatchInfo, SearchableFields
 * [POS]: 全局搜索的相关性评分与命中推断，被 CommandPalette 和 HistoryApp 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ─── 评分权重表 ─────────────────────────────────────────────────────────────
//
//  字段              权重    说明
//  ─────────────────────────────────────
//  标题完全匹配      100     "GitHub" == "github"
//  标题前缀匹配       80     "git" → "GitHub"
//  标题包含匹配       60     "hub" → "GitHub"
//  标签命中           50     搜 "dev" 命中 tag "development"
//  域名命中           40     搜 "notion" 命中 "notion.so"
//  摘要命中           30     AI 生成的摘要中包含关键词
//  便签内容命中       25     便签正文包含关键词
//  URL 路径命中       20     "/products/tp-7" 包含 "tp"
//
//  时间衰减加成：
//  7 天内创建        +10     最近的优先
//  30 天内创建        +5     较近的次之
//
// ─────────────────────────────────────────────────────────────────────────────

export type MatchField = "title" | "summary" | "text" | "tags" | "url" | "none";

export interface MatchInfo {
  field: MatchField;
  text: string | null;
}

export interface SearchableFields {
  title?: string | null;
  url?: string | null;
  summary?: string | null;
  text?: string | null;
  tags?: string[] | null;
  createdAt?: number;
}

const SEVEN_DAYS = 7 * 86400000;
const THIRTY_DAYS = 30 * 86400000;

/**
 * 相关性评分：分数越高越相关，0 分表示不匹配
 */
export function scoreItem(query: string, fields: SearchableFields): number {
  const q = query.toLowerCase();
  let score = 0;

  const title = (fields.title || "").toLowerCase();
  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 80;
  else if (title.includes(q)) score += 60;

  if (fields.tags?.some((t) => t.toLowerCase().includes(q))) score += 50;

  if (fields.url) {
    const url = fields.url.toLowerCase();
    const hostname = url.replace(/^https?:\/\//, "").split("/")[0];
    if (hostname.includes(q)) score += 40;
    else if (url.includes(q)) score += 20;
  }

  if (fields.summary && fields.summary.toLowerCase().includes(q)) score += 30;
  if (fields.text && fields.text.toLowerCase().includes(q)) score += 25;

  if (score > 0 && fields.createdAt) {
    const age = Date.now() - fields.createdAt;
    if (age < SEVEN_DAYS) score += 10;
    else if (age < THIRTY_DAYS) score += 5;
  }

  return score;
}

/**
 * 命中推断：按优先级判断搜索命中的字段，返回应展示的副文本
 * - title 命中 → null（标题自身已足够）
 * - summary/text/url 命中 → 返回该字段内容
 * - tags 命中 → 返回命中 tag + summary 补充
 */
export function getMatchInfo(
  query: string,
  fields: Pick<SearchableFields, "title" | "summary" | "text" | "tags" | "url">,
): MatchInfo {
  const q = query.toLowerCase();
  if (fields.title && fields.title.toLowerCase().includes(q)) return { field: "title", text: null };
  if (fields.summary && fields.summary.toLowerCase().includes(q)) return { field: "summary", text: fields.summary };
  if (fields.text && fields.text.toLowerCase().includes(q)) return { field: "text", text: fields.text };
  if (fields.tags?.some((t) => t.toLowerCase().includes(q))) {
    const hit = fields.tags.find((t) => t.toLowerCase().includes(q)) || "";
    const suffix = fields.summary ? ` · ${fields.summary}` : "";
    return { field: "tags", text: hit + suffix };
  }
  if (fields.url && fields.url.toLowerCase().includes(q)) return { field: "url", text: fields.url };
  return { field: "none", text: null };
}
