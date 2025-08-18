# 数据导入问题修复说明

## 问题描述

导入JSON数据时出现"解密失败：密码错误或数据损坏3"错误，原因是导入的数据包含明文密码，但系统期望的是加密后的密码。

## 原始问题数据格式

```json
{
  "credentials": [
    {
      "domain": "c.youdao.com",
      "password": "111",  // ❌ 明文密码
      "id": "1",
      "updatedAt": 1755332971158,
      "username": "xinyu1"
    }
  ]
}
```

## 修复方案

### 1. 后台脚本修复 (background.js)

**修改了 `importData` 方法**：
- 检测导入数据中的明文密码字段
- 如果发现明文密码，使用主密码进行加密
- 将明文密码转换为 `encryptedPassword` 字段
- 删除原始的明文 `password` 字段

**修改了消息处理**：
- `IMPORT_DATA` 消息现在接收 `masterPassword` 参数
- 支持加密明文密码后再存储

### 2. 选项页面修复 (OptionsApp.jsx)

**智能检测明文密码**：
```javascript
// 检查是否包含明文密码
if (data.credentials && data.credentials.some(cred => cred.password && !cred.encryptedPassword)) {
  masterPassword = prompt("检测到明文密码，请输入主密码以加密导入的数据:")
}
```

**改进的导入流程**：
1. 解析JSON文件
2. 检测是否包含明文密码
3. 如果有明文密码，提示用户输入主密码
4. 发送数据和主密码到后台进行处理

## 使用方法

### 导入包含明文密码的数据

1. 打开扩展的选项页面
2. 点击"导入数据"按钮
3. 选择包含明文密码的JSON文件
4. 系统会自动检测到明文密码
5. 输入你的主密码（用于加密导入的明文密码）
6. 数据将被正确加密并导入

### 支持的数据格式

**明文密码格式**（会自动加密）：
```json
{
  "credentials": [
    {
      "domain": "example.com",
      "username": "user1",
      "password": "plaintext_password"  // 明文密码
    }
  ]
}
```

**已加密格式**（直接导入）：
```json
{
  "credentials": [
    {
      "domain": "example.com", 
      "username": "user1",
      "encryptedPassword": "base64_encrypted_data"  // 已加密的密码
    }
  ]
}
```

## 技术细节

### 加密流程
1. 检测 `password` 字段且无 `encryptedPassword` 字段
2. 使用 `CryptoUtils.encrypt(plainPassword, masterPassword)` 加密
3. 存储为 `encryptedPassword` 字段
4. 删除原始 `password` 字段

### 错误处理
- 如果用户取消输入主密码，导入会被取消
- 如果主密码错误，会显示相应错误信息
- 如果JSON格式错误，会显示解析错误

## 测试步骤

1. 准备包含明文密码的JSON文件
2. 在选项页面导入该文件
3. 输入正确的主密码
4. 验证数据是否正确导入和加密
5. 测试导入的密码是否能正常使用

修复后，你现在可以成功导入包含明文密码的JSON数据了！