# 解密错误修复说明

## 问题分析

"解密失败：密码错误或数据损坏3" 错误的根本原因是**会话管理问题**：

1. **主密码丢失**：弹窗刷新后，`masterPassword` 状态丢失
2. **会话不一致**：后台脚本没有持久化存储主密码
3. **解密参数错误**：解密时使用了错误的密码参数

## 修复方案

### 1. 会话管理改进

**后台脚本 (background.js)**：
- 在用户登录时，将主密码存储在会话中
- 解密时直接使用会话中的主密码，不依赖前端传递

```javascript
// 登录时存储主密码
await StorageUtils.saveSession({
  isUnlocked: true,
  lastActivity: Date.now(),
  masterPassword: password, // 关键修复：存储主密码
})

// 解密时使用会话中的主密码
case "DECRYPT_PASSWORD":
  const session = await StorageUtils.getSession()
  if (!session || !session.isUnlocked || !session.masterPassword) {
    throw new Error("会话已过期，请重新登录")
  }
  const decryptedPassword = await CryptoUtils.decrypt(data.encryptedData, session.masterPassword)
```

### 2. 弹窗状态恢复

**弹窗 (App.jsx)**：
- 检查会话时同时获取主密码
- 恢复弹窗的 `masterPassword` 状态

```javascript
// 会话检查时恢复主密码状态
const response = await sendMessage({ type: "CHECK_SESSION" })
if (response.success && response.data.isValid) {
  setIsAuthenticated(true)
  if (response.data.masterPassword) {
    setMasterPassword(response.data.masterPassword) // 恢复主密码状态
  }
}
```

### 3. 解密调用简化

**弹窗解密调用**：
- 不再需要传递主密码参数
- 后台自动使用会话中的主密码

```javascript
// 简化的解密调用
const response = await sendMessage({
  type: "DECRYPT_PASSWORD",
  data: {
    encryptedData: credential.encryptedPassword
    // 不再需要传递 password 参数
  }
})
```

## 测试步骤

### 1. 基本功能测试
1. 重新加载扩展
2. 设置主密码并登录
3. 添加一个测试密码
4. 验证密码能正确保存和显示

### 2. 会话持久性测试
1. 添加密码后，刷新弹窗
2. 验证密码列表仍然显示
3. 测试复制密码功能
4. 测试自动填充功能

### 3. 导入功能测试
1. 准备包含明文密码的JSON文件
2. 在选项页面导入
3. 输入主密码进行加密
4. 验证导入的密码能正常使用

## 调试方法

如果仍然遇到问题：

### 1. 检查会话状态
在浏览器控制台中运行：
```javascript
chrome.storage.local.get('session', (result) => {
  console.log('Session:', result.session)
})
```

### 2. 检查存储的凭据
```javascript
chrome.storage.local.get('credentials', (result) => {
  console.log('Credentials:', result.credentials)
})
```

### 3. 检查主密码哈希
```javascript
chrome.storage.local.get('masterPasswordHash', (result) => {
  console.log('Master Password Hash:', result.masterPasswordHash)
})
```

### 4. 清除所有数据重新开始
如果问题持续，可以清除所有数据：
```javascript
chrome.storage.local.clear(() => {
  console.log('All data cleared')
})
```

## 预期结果

修复后应该实现：
- ✅ 手动添加的密码能正确保存和解密
- ✅ 弹窗刷新后密码功能仍然正常
- ✅ 导入的明文密码能正确加密和使用
- ✅ 自动填充功能正常工作
- ✅ 不再出现"解密失败"错误

这次修复解决了会话管理的根本问题，确保主密码在整个会话期间都能正确保持和使用。