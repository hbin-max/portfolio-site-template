import { copyFile, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
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
  <script src="site.js" defer></script>
</head>
<body>
  <a class="skip" href="#main">跳到正文</a>
  <header class="bar">
    <a class="brand" href="index.html"><span aria-hidden="true">${escape(Array.from(profile.name)[0])}</span>${escape(profile.name)}</a>
    <nav aria-label="主导航">${nav.map(([href, label]) =>
      `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`
    ).join(' ')}</nav>
    <a class="header-link" href="resume.html">完整履历 <span aria-hidden="true">↗</span></a>
  </header>
  <main id="main">${body}</main>
  <footer class="footer"><span>${escape(profile.name)}${isTemplate ? ' · 模板示例' : ''}</span><a href="#main">回到顶部 <span aria-hidden="true">↑</span></a></footer>
</body>
</html>
`;
}

function entries(title, items, kind = '') {
  if (!items?.length) return '';
  return `<section class="entry-group ${kind}"><h2>${title}</h2><ul class="entries">${items.map(item =>
    `<li><strong>${escape(item.title)}</strong><p>${escape(item.detail)}</p></li>`
  ).join('')}</ul></section>`;
}

const slugs = profile.projects.map(project => project.id);
if (slugs.some(slug => typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    || new Set(slugs).size !== slugs.length) {
  throw new Error('Project IDs must be unique lowercase slugs.');
}

const coverFiles = new Map();
for (const project of profile.projects) {
  if (!project.image) continue;
  const source = resolve(dirname(profilePath), project.image);
  const extension = extname(source).toLowerCase();
  if (!['.avif', '.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    throw new Error(`Unsupported project image type for ${project.id}`);
  }
  coverFiles.set(project.id, { source, name: `cover-${project.id}${extension}` });
}

function stage(project, { reveal = false, transition = false } = {}) {
  if (!project) return '';
  const cover = coverFiles.get(project.id);
  const content = cover
    ? `<img src="${cover.name}" alt="${escape(project.imageAlt ?? project.title)}" decoding="async">`
    : `<span class="study-object" aria-hidden="true"><span>✦</span></span>`;
  const motion = transition ? ` style="view-transition-name:cover-${project.id}"` : '';
  return `<div class="stage${cover ? ' has-cover' : ''}${reveal ? ' reveal' : ''}"${motion}>
    <div class="stage-base">${content}</div>
    ${reveal ? `<div class="stage-reveal" aria-hidden="true">${content}</div>
      <button type="button" class="reveal-toggle" aria-pressed="false">${cover ? '查看原图' : '查看色彩'}</button>` : ''}
  </div>`;
}

function projectList(projects) {
  return `<ul class="project-list">${projects.map(project => `
    <li><a class="project-card" href="project-${project.id}.html">
      ${stage(project, { transition: true })}
      <div class="project-copy"><span class="meta">${escape(project.type)}</span>
        <strong>${escape(project.title)}</strong><p>${escape(project.summary)}</p>
        <span class="project-arrow" aria-hidden="true">↗</span>
      </div>
    </a></li>
  `).join('')}</ul>`;
}

function title(text, copy = '') {
  return `<header class="page-head"><h1 class="page-title">${text}</h1>${copy ? `<p>${copy}</p>` : ''}</header>`;
}

const lead = profile.projects[0];
const pages = new Map([
  ['index.html', page('首页', 'index.html', `
    <section class="hero${lead ? '' : ' hero-text-only'}" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="hero-tagline">${escape(profile.tagline)}</p>
        <h1 id="hero-title">${escape(profile.name)}</h1>
        ${profile.nameLatin ? `<p class="name-latin" lang="en">${escape(profile.nameLatin)}</p>` : ''}
        <p class="intro">${escape(profile.intro)}</p>
        <div class="actions"><a href="resume.html">查看履历 <span aria-hidden="true">↗</span></a>${lead ? '<a href="#work">精选项目 <span aria-hidden="true">↓</span></a>' : ''}</div>
      </div>
      ${lead ? `<figure class="hero-figure">${stage(lead, { reveal: true })}
        <figcaption><span>${escape(lead.type)}</span><a href="project-${lead.id}.html">${escape(lead.title)} <span aria-hidden="true">↗</span></a></figcaption>
      </figure>` : ''}
    </section>
    ${profile.education?.length || profile.honors?.length ? `<div class="academic">
      ${entries('教育背景', profile.education)}${entries('荣誉', profile.honors)}
    </div>` : ''}
    ${lead ? `<section class="work" id="work"><header class="section-head"><h2>精选项目</h2><a href="projects.html">全部项目 <span aria-hidden="true">↗</span></a></header>
      ${projectList(profile.projects.slice(0, 3))}
    </section>` : ''}
    ${profile.interests?.length ? `<section class="interest-link">
      <h2>兴趣与作品</h2><p>${profile.interests.map(item => escape(item.title)).join(' · ')}</p>
      <a href="interests.html">探索作品 <span aria-hidden="true">↗</span></a>
    </section>` : ''}
  `)],
  ['resume.html', page('履历', 'resume.html', `
    ${title('履历', escape(profile.tagline))}
    <div class="resume-content">
      ${entries('教育背景', profile.education)}${entries('学业表现', profile.academics)}
      ${entries('荣誉', profile.honors)}
    </div>
  `)],
  ['projects.html', page('项目', 'projects.html', `
    ${title('项目')}${projectList(profile.projects)}
  `)],
  ['interests.html', page('兴趣与作品', 'interests.html', `
    ${title('兴趣与作品')}
    <ul class="interest-list">${(profile.interests ?? []).map(item => `
      <li><div class="interest-art" aria-hidden="true"></div>
        <div class="interest-copy"><h2>${escape(item.title)}</h2><p>${escape(item.detail)}</p></div>
      </li>`).join('')}
    </ul>
  `)]
]);

for (const project of profile.projects) {
  pages.set(`project-${project.id}.html`, page(project.title, 'projects.html', `
    <article class="case">
      <a class="back" href="projects.html">← 全部项目</a>
      <p class="meta">${escape(project.type)}</p>
      ${title(escape(project.title), escape(project.summary))}
      ${stage(project, { transition: true })}
      <div class="case-text"><h2>设计说明</h2>${project.details.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</div>
    </article>
  `));
}

await mkdir(output, { recursive: true });
const expectedCovers = new Set([...coverFiles.values()].map(file => file.name));
const existingFiles = await readdir(output);
for (const name of existingFiles) {
  if (/^project-[a-z0-9-]+\.html$/.test(name) && !pages.has(name)) {
    await unlink(resolve(output, name));
  }
  if (/^cover-[a-z0-9-]+\.(avif|jpe?g|png|webp)$/.test(name) && !expectedCovers.has(name)) {
    await unlink(resolve(output, name));
  }
}
await Promise.all([
  ...['site.css', 'site.js'].map(name => copyFile(resolve(root, 'src', name), resolve(output, name))),
  ...[...coverFiles.values()].map(({ source, name }) => copyFile(source, resolve(output, name))),
  ...[...pages].map(([name, html]) => writeFile(resolve(output, name), html))
]);
console.log(`Built ${mode} profile: dist/${mode}/index.html`);
