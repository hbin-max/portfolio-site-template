import { copyFile, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2] ?? 'template';
if (!['template', 'personal'].includes(mode) || process.argv.length > (mode === 'personal' ? 4 : 3)) {
  throw new Error('Usage: node scripts/build.mjs [template|personal [profile.json]]');
}

const isTemplate = mode === 'template';
const profilePath = isTemplate ? resolve(root, 'content/example.json')
  : process.argv[3] ? resolve(process.argv[3]) : resolve(root, 'personal/profile.json');
const profile = JSON.parse(await readFile(profilePath, 'utf8'));
const output = resolve(root, 'dist', mode);
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

const nav = [
  ['index.html', '首页'], ['resume.html', '履历'],
  ['projects.html', '项目'], ['interests.html', '兴趣与作品']
];

function page(title, current, body) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(profile.tagline)}">
  <title>${escape(title)} · ${escape(profile.name)}</title>
  <link rel="stylesheet" href="site.css">
</head>
<body>
  <a class="skip" href="#main">跳到正文</a>
  <header class="bar">
    <a class="brand" href="index.html">${escape(profile.name)}</a>
    <nav aria-label="主导航">${nav.map(([href, label]) =>
      `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`
    ).join(' ')}</nav>
  </header>
  <main id="main">${body}</main>
</body>
</html>
`;
}

function entries(title, items) {
  if (!items?.length) return '';
  return `<section class="section"><h2>${title}</h2><ul class="entries">${items.map(item =>
    `<li><strong>${escape(item.title)}</strong><p>${escape(item.detail)}</p></li>`
  ).join('')}</ul></section>`;
}

function projectList(projects) {
  return `<ul class="project-list">${projects.map(project => `
    <li><a href="project-${project.id}.html"><span class="meta">${escape(project.type)}</span>
    <strong>${escape(project.title)}</strong><span>${escape(project.summary)}</span></a></li>
  `).join('')}</ul>`;
}

const slugs = profile.projects.map(project => project.id);
if (slugs.some(slug => typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    || new Set(slugs).size !== slugs.length) {
  throw new Error('Project IDs must be unique lowercase slugs.');
}

const pages = new Map([
  ['index.html', page('首页', 'index.html', `
    <section class="hero">
      ${isTemplate ? '<p class="meta">模板演示 · 示例资料</p>' : ''}
      <h1>${escape(profile.name)}</h1><p class="tagline">${escape(profile.tagline)}</p>
      <p class="intro">${escape(profile.intro)}</p>
      <div class="actions"><a href="resume.html">查看完整履历</a><a href="projects.html">浏览项目 ↗</a></div>
    </section>
    ${entries('教育', profile.education)}
    ${entries('荣誉', profile.honors)}
    <section class="section"><h2>精选项目</h2>${projectList(profile.projects.slice(0, 3))}</section>
    <p class="end-link"><a href="interests.html">兴趣与作品 ↗</a></p>
  `)],
  ['resume.html', page('履历', 'resume.html', `
    <h1 class="page-title">履历</h1><p class="tagline">${escape(profile.tagline)}</p>
    ${entries('教育', profile.education)}${entries('荣誉', profile.honors)}
  `)],
  ['projects.html', page('项目', 'projects.html', `
    <h1 class="page-title">项目</h1>${projectList(profile.projects)}
  `)],
  ['interests.html', page('兴趣与作品', 'interests.html', `
    <h1 class="page-title">兴趣与作品</h1>${entries('类别', profile.interests)}
  `)]
]);

for (const project of profile.projects) {
  pages.set(`project-${project.id}.html`, page(project.title, 'projects.html', `
    <p class="meta">${escape(project.type)}</p>
    <h1 class="page-title">${escape(project.title)}</h1>
    <p class="tagline">${escape(project.summary)}</p>
    <div class="case-text">${project.details.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</div>
    <p class="end-link"><a href="projects.html">← 返回项目</a></p>
  `));
}

await mkdir(output, { recursive: true });
const existingFiles = await readdir(output);
for (const name of existingFiles) {
  if (/^project-[a-z0-9-]+\.html$/.test(name) && !pages.has(name)) {
    await unlink(resolve(output, name));
  }
}
await copyFile(resolve(root, 'src/site.css'), resolve(output, 'site.css'));
await Promise.all([...pages].map(([name, html]) => writeFile(resolve(output, name), html)));
console.log(`Built ${mode} profile: dist/${mode}/index.html`);
