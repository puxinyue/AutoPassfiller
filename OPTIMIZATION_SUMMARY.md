# 加密解密方法统一优化总结

## 优化内容

### 1. 统一加密解密模块
- 将 `src/utils/crypto.js` 作为唯一的加密解密工具模块
- 移除了 `background.js` 和 `content.js` 中重复的加密解密代码

### 2. 修改的文件

#### `src/utils/crypto.js`
- 保持原有的完整 CryptoUtils 类
- 修改导出方式，兼容 Service Worker 环境
- 支持多种模块系统（CommonJS、全局变量、Service Worker）

#### `src/background.js`
- 移除了重复的 CryptoUtils 类定义（约120行代码）
- 添加 `importScripts('./utils/crypto.js')` 导入加密工具
- 新增 `DECRYPT_PASSWORD` 消息处理，为 content script 提供解密服务
- 修复 `substr` 弃用警告，改用 `substring`
- 移除未使用的 `sender` 参数

#### `src/content.js`
- 移除了重复的解密方法（约40行代码）
- 修改 `decryptPassword` 方法，通过消息传递调用后台的解密服务
- 保持原有的功能不变

### 3. 优化效果

#### 代码重用
- 消除了约160行重复的加密解密代码
- 统一使用 `crypto.js` 中的方法，确保一致性

#### 维护性提升
- 加密解密逻辑集中在一个文件中
- 修改加密算法时只需更新一个文件
- 减少了代码维护成本

#### 安全性
- 统一的加密实现避免了不同文件中可能的实现差异
- 集中管理加密参数（如迭代次数、算法等）

#### 性能
- 减少了代码重复，降低了扩展包大小
- content script 通过消息传递使用解密功能，避免了重复加载加密代码

### 4. 架构改进

```
原架构：
├── background.js (包含完整 CryptoUtils)
├── content.js (包含部分加密解密代码)
└── utils/crypto.js (独立的加密工具)

优化后架构：
├── background.js (导入并使用 crypto.js)
├── content.js (通过消息调用后台解密服务)
└── utils/crypto.js (统一的加密解密工具)
```

### 5. 兼容性
- 保持了原有的所有功能
- API 接口保持不变
- 支持不同的 JavaScript 环境（浏览器、Service Worker）

## 使用方式

现在所有的加密解密操作都统一使用 `src/utils/crypto.js` 中的方法：

```javascript
// 在 background.js 中
const encrypted = await CryptoUtils.encrypt(plaintext, password)
const decrypted = await CryptoUtils.decrypt(encrypted, password)

// 在 content.js 中（通过消息传递）
const decrypted = await this.decryptPassword(encryptedData, password)
```

这次优化大大提高了代码的可维护性和一致性，同时保持了原有功能的完整性。