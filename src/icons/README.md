# 图标文件说明

请在此目录下添加以下图标文件：

## 必需的图标文件

- `icon16.png` - 16x16 像素，用于扩展管理页面
- `icon32.png` - 32x32 像素，用于扩展管理页面 
- `icon48.png` - 48x48 像素，用于扩展管理页面
- `icon128.png` - 128x128 像素，用于 Chrome Web Store

## 图标设计建议

1. **主题**：建议使用盾牌、锁或钥匙等安全相关图标
2. **颜色**：主要使用蓝色（#3b82f6）配合白色或透明背景
3. **风格**：现代化、简洁的扁平设计风格
4. **格式**：PNG 格式，支持透明背景

## 在线图标生成工具

- [Favicon.io](https://favicon.io/) - 在线图标生成器
- [RealFaviconGenerator](https://realfavicongenerator.net/) - 专业图标生成
- [Canva](https://www.canva.com/) - 设计工具

## 示例图标元素

可以使用这些 SVG 元素作为参考：

```svg
<!-- 盾牌图标 -->
<svg viewBox="0 0 24 24" fill="#3b82f6">
  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
</svg>

<!-- 锁图标 -->
<svg viewBox="0 0 24 24" fill="#3b82f6">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
  <circle cx="12" cy="16" r="1"/>
  <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
</svg>
```

添加图标后，运行 `npm run build` 重新构建项目。
