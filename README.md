# AutoPassfiller - 安全密码管理器

一个基于 React + Tailwind CSS 的 Chrome 扩展插件，提供安全的密码存储和自动填充功能。

## 功能特性

### 🔐 安全加密
- 使用 AES-256-GCM 加密算法
- 基于主密码的密钥派生（PBKDF2）
- 所有数据本地加密存储

### 🚀 核心功能
- **自动检测** - 智能识别登录表单
- **自动填充** - 一键填充用户名和密码
- **密码管理** - 添加、编辑、删除密码条目
- **密码生成** - 生成强密码并评估密码强度
- **多账户支持** - 同一网站支持多个账户

### 🛡️ 安全特性
- **会话管理** - 自动锁定和超时保护
- **主密码保护** - 所有操作需要主密码验证
- **数据备份** - 支持导入导出功能
- **安全存储** - Chrome storage API 本地存储

### 🎨 用户界面
- **现代化设计** - React + Tailwind CSS
- **响应式布局** - 适配不同屏幕尺寸
- **暗色模式** - 支持亮色/暗色主题切换
- **直观操作** - 简洁易用的交互界面

## 项目结构

```
AutoPassfiller/
├── manifest.json          # 插件配置文件
├── package.json           # 项目依赖和脚本
├── webpack.config.js      # Webpack 构建配置
├── tailwind.config.js     # Tailwind CSS 配置
├── postcss.config.js      # PostCSS 配置
├── src/
│   ├── background.js      # 后台脚本
│   ├── content.js         # 内容脚本
│   ├── utils/
│   │   ├── crypto.js      # 加密工具
│   │   └── storage.js     # 存储工具
│   ├── popup/
│   │   ├── popup.html     # 弹窗HTML模板
│   │   ├── index.jsx      # 弹窗入口文件
│   │   ├── App.jsx        # 主应用组件
│   │   ├── styles.css     # 样式文件
│   │   ├── utils/
│   │   │   └── api.js     # API工具函数
│   │   └── components/
│   │       ├── LoginScreen.jsx
│   │       ├── CredentialList.jsx
│   │       ├── AddCredentialModal.jsx
│   │       └── EditCredentialModal.jsx
│   ├── options/
│   │   ├── options.html   # 选项页面HTML
│   │   ├── index.jsx      # 选项页面入口
│   │   └── OptionsApp.jsx # 选项页面组件
│   └── icons/             # 插件图标文件夹
├── dist/                  # 构建输出目录
└── README.md              # 项目说明文档
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 添加图标文件

在 `src/icons/` 目录下添加以下图标文件：
- `icon16.png` (16x16 像素)
- `icon32.png` (32x32 像素)
- `icon48.png` (48x48 像素)
- `icon128.png` (128x128 像素)

图标建议使用盾牌或锁的设计，体现安全特性。

### 3. 开发构建

```bash
# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build

# 清理构建文件
npm run clean
```

### 4. 安装扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 目录

## 使用指南

### 首次使用

1. 安装扩展后会自动打开设置页面
2. 设置一个安全的主密码
3. 主密码用于加密所有存储的密码

### 日常使用

1. **自动保存**：在网站登录成功后，插件会提示保存密码
2. **自动填充**：访问已保存密码的网站时，点击密码字段旁的按钮自动填充
3. **快捷键**：使用 `Ctrl+Shift+F` 快速填充当前页面表单
4. **插件弹窗**：点击浏览器工具栏中的插件图标管理密码

### 设置选项

访问 `chrome://extensions/` → 找到 AutoPassfiller → 点击"详情" → "扩展程序选项"

- **主题设置**：切换亮色/暗色模式
- **自动锁定**：设置闲置锁定时间
- **数据管理**：导入/导出密码数据
- **安全清除**：删除所有数据

## 技术架构

### 加密安全

- **算法**：AES-256-GCM（认证加密）
- **密钥派生**：PBKDF2，100,000 次迭代
- **随机性**：每次加密使用新的盐值和初始化向量
- **内存安全**：敏感数据及时清理

### 数据存储

```javascript
// 凭据存储格式
{
  id: "unique-id",
  domain: "example.com",
  username: "user@example.com",
  encryptedPassword: "base64-encrypted-data",
  createdAt: 1640995200000,
  updatedAt: 1640995200000
}
```

### 通信架构

- **Background Script**：会话管理、数据加密解密
- **Content Script**：表单检测、自动填充
- **Popup**：用户界面、密码管理
- **Options Page**：设置和数据管理

## 安全考虑

### 密码安全

- 主密码永不以明文形式存储
- 使用测试数据验证主密码正确性
- 会话超时自动锁定
- 内存中的敏感数据及时清理

### 数据保护

- 所有密码都使用 AES-256 加密
- 密钥基于用户主密码动态生成
- 数据只存储在本地，不上传服务器
- 支持数据导出备份

### 网络安全

- 插件不连接任何外部服务器
- 不收集用户数据和使用统计
- 所有数据处理都在本地完成

## 开发说明

### 主要依赖

- **React 18**：用户界面框架
- **Tailwind CSS**：样式框架
- **Webpack 5**：构建工具
- **Lucide React**：图标库
- **Web Crypto API**：加密功能

### 代码规范

- 使用 ES6+ 语法
- React Hooks 模式
- 函数式组件
- 异步操作使用 async/await

### 调试技巧

1. **控制台调试**：`F12` → Console 查看错误信息
2. **扩展调试**：`chrome://extensions/` → 点击"背景页" 查看后台脚本日志
3. **存储查看**：`F12` → Application → Storage → Extensions

## 更新日志

### v1.0.0
- ✨ 初始版本发布
- 🔐 AES-256 加密存储
- 🚀 自动表单检测和填充
- 🎨 React + Tailwind CSS 界面
- 🛡️ 会话管理和安全保护
- 📱 响应式设计和暗色模式
- 💾 数据导入导出功能

## 许可证

MIT License

## 支持

如有问题或建议，请通过 GitHub Issues 联系。

---

**注意**：这是一个本地密码管理器，所有数据都存储在您的设备上。请务必记住您的主密码，并定期备份数据。
