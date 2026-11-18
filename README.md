# 个人展示页模板

一个中文静态作品集模板，包含首页、履历、项目详情及兴趣与作品页。默认使用示例人物数据。生成后的网页可以从本地直接打开，也可以部署到静态网站托管平台。

## 使用

需要 Node.js 22 或更新版本。项目没有第三方运行依赖。

```sh
npm run build
```

打开 `dist/template/index.html`。修改 `content/example.json` 可以替换样例内容。每个项目的 `id` 是唯一的小写字母、数字和连字符组成的标识，决定案例页链接。项目列表的前三项会出现在首页。样式集中在 `src/site.css`。

项目可填写 `image` 和 `imageAlt`。图片路径相对于资料 JSON 文件，第一项项目图同时用于首页的显影互动。访客也可点击按钮切换原图。

## 维护个人版本

把示例资料复制到 `personal/profile.json`，替换为个人信息，再运行：

```sh
npm run build:personal
```

输出在 `dist/personal/`。主仓库的 Git 忽略规则排除了 `personal/` 和 `dist/`。如需为个人内容建立独立历史，在 `personal/` 内初始化自己的 Git 仓库。个人版和模板使用同一套页面生成代码，修改布局和交互时可以一起受益。

如果个人资料存放在模板仓库的同级目录，从模板目录运行 `npm run build:personal -- ../personal/profile.json`。

## 版本与发布

- 在主仓库提交公共布局、样式、构建脚本及示例资料。交互或内容结构的大改动可以先走功能分支。
- 在个人仓库提交自己的履历、项目和素材。发布个人站时，单独检查个人版产物。
- GitHub 公共模板应推送主仓库。发布演示站时选择 `dist/template/` 为部署目录。可以用 `git ls-tree -r --name-only HEAD` 检查会公开的文件。
