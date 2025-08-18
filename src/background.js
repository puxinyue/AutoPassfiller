// 后台脚本 (Service Worker) - 处理会话管理、存储管理和消息通信

// 导入加密工具
import CryptoUtils from './utils/crypto.js'

// 内联存储工具函数
class StorageUtils {
  static async set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }

  static async get(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(typeof key === "string" ? result[key] : result)
        }
      })
    })
  }

  static async remove(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }

  static async saveCredential(credential) {
    const credentials = await this.getCredentials()
    const existingIndex = credentials.findIndex(
      (c) =>
        c.domain === credential.domain && c.username === credential.username
    )

    if (existingIndex >= 0) {
      credentials[existingIndex] = {
        ...credentials[existingIndex],
        ...credential,
        updatedAt: Date.now(),
      }
    } else {
      credential.id = this.generateId()
      credential.createdAt = Date.now()
      credential.updatedAt = Date.now()
      credentials.push(credential)
    }

    await this.set("credentials", credentials)
  }

  static async getCredentials() {
    const credentials = await this.get("credentials")
    return credentials || []
  }

  static async getCredentialsByDomain(domain) {
    const credentials = await this.getCredentials()
    return credentials.filter((c) => c.domain === domain)
  }

  static async deleteCredential(id) {
    const credentials = await this.getCredentials()
    const filtered = credentials.filter((c) => c.id !== id)
    await this.set("credentials", filtered)
  }

  static async updateCredential(id, updates) {
    const credentials = await this.getCredentials()
    const index = credentials.findIndex((c) => c.id === id)

    if (index >= 0) {
      credentials[index] = {
        ...credentials[index],
        ...updates,
        updatedAt: Date.now(),
      }
      await this.set("credentials", credentials)
    }
  }

  static async saveSettings(settings) {
    const currentSettings = await this.getSettings()
    const newSettings = { ...currentSettings, ...settings }
    await this.set("settings", newSettings)
  }

  static async getSettings() {
    const settings = await this.get("settings")
    return {
      theme: "light",
      autoLock: true,
      lockTimeout: 15,
      autoFill: true,
      ...settings,
    }
  }

  static async saveSession(session) {
    await this.set("session", {
      ...session,
      lastActivity: Date.now(),
    })
  }

  static async getSession() {
    return await this.get("session")
  }

  static async clearSession() {
    await this.remove("session")
  }

  static async isSessionValid() {
    const session = await this.getSession()
    if (!session || !session.isUnlocked) {
      return false
    }

    const settings = await this.getSettings()
    if (!settings.autoLock) {
      return true
    }

    const timeoutMs = settings.lockTimeout * 60 * 1000
    const isExpired = Date.now() - session.lastActivity > timeoutMs

    if (isExpired) {
      await this.clearSession()
      return false
    }

    return true
  }

  static async exportData() {
    const [credentials, settings] = await Promise.all([
      this.getCredentials(),
      this.getSettings(),
    ])

    return {
      credentials,
      settings,
      exportedAt: Date.now(),
      version: "1.0.0",
    }
  }

  static async importData(data, masterPassword = null) {
    if (data.credentials) {
      // 获取现有凭据
      const existingCredentials = await this.getCredentials()

      // 处理导入的凭据
      const importedCredentials = []
      
      for (const credential of data.credentials) {
        const processedCredential = {
          ...credential,
          id: this.generateId(),
          importedAt: Date.now(),
        }

        // 如果凭据包含明文密码，需要加密
        if (credential.password && !credential.encryptedPassword) {
          if (!masterPassword) {
            throw new Error('导入包含明文密码的数据需要提供主密码')
          }
          // 加密明文密码
          processedCredential.encryptedPassword = await CryptoUtils.encrypt(
            credential.password,
            masterPassword
          )
          // 删除明文密码
          delete processedCredential.password
        }

        importedCredentials.push(processedCredential)
      }

      // 合并现有凭据和导入的凭据
      const mergedCredentials = [...existingCredentials, ...importedCredentials]

      // 保存合并后的凭据
      await this.set("credentials", mergedCredentials)
    }
    if (data.settings) {
      await this.saveSettings(data.settings)
    }
  }

  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 11)
  }

  static async getStats() {
    const credentials = await this.getCredentials()
    const domains = [...new Set(credentials.map((c) => c.domain))]

    return {
      totalCredentials: credentials.length,
      totalDomains: domains.length,
      lastUpdated:
        credentials.length > 0
          ? Math.max(...credentials.map((c) => c.updatedAt || c.createdAt))
          : null,
    }
  }
}

class BackgroundService {
  constructor() {
    this.sessionTimeout = null
    this.moduleLoaded = false
    this.init()
  }

  init() {
    // 监听消息
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this))

    // 监听标签页更新
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this))

    // 监听扩展安装
    chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this))

    // 设置会话超时检查
    this.setupSessionTimeout()
  }

  /**
   * 处理消息
   */
  handleMessage(message, _sender, sendResponse) {
    const handleAsync = async () => {
      try {
        const { type, data } = message

        switch (type) {
          case "CHECK_SESSION":
            const isValid = await StorageUtils.isSessionValid()
            const sessionData = await StorageUtils.getSession()
            return { 
              success: true, 
              data: { 
                isValid,
                masterPassword: isValid && sessionData ? sessionData.masterPassword : null
              } 
            }

          case "LOGIN":
            return await this.handleLogin(data)

          case "LOGOUT":
            await this.handleLogout()
            return { success: true }

          case "GET_CREDENTIALS":
            const credentials = await this.getCredentials(data?.domain)
            return { success: true, data: credentials }

          case "SAVE_CREDENTIAL":
            await this.saveCredential(data)
            return { success: true }

          case "UPDATE_CREDENTIAL":
            await this.updateCredential(data)
            return { success: true }

          case "DELETE_CREDENTIAL":
            await StorageUtils.deleteCredential(data.id)
            return { success: true }

          case "GENERATE_PASSWORD":
            const password = CryptoUtils.generatePassword(
              data?.length,
              data?.options
            )
            return { success: true, data: { password } }

          case "EVALUATE_PASSWORD":
            const evaluation = CryptoUtils.evaluatePasswordStrength(
              data.password
            )
            return { success: true, data: evaluation }

          case "UPDATE_ACTIVITY":
            await this.updateActivity()
            return { success: true }

          case "GET_STATS":
            const stats = await StorageUtils.getStats()
            return { success: true, data: stats }

          case "EXPORT_DATA":
            const exportData = await StorageUtils.exportData()
            return { success: true, data: exportData }

          case "IMPORT_DATA":
            await StorageUtils.importData(data.importData, data.masterPassword)
            return { success: true }

          case "GET_SETTINGS":
            const settings = await StorageUtils.getSettings()
            return { success: true, data: settings }

          case "SAVE_SETTINGS":
            await StorageUtils.saveSettings(data)
            return { success: true }

          case "CLEAR_ALL_DATA":
            await StorageUtils.set("credentials", [])
            await StorageUtils.set("settings", {})
            await StorageUtils.remove("masterPasswordHash")
            await StorageUtils.clearSession()
            return { success: true }

          case "DECRYPT_PASSWORD":
            const session = await StorageUtils.getSession()
            if (!session || !session.isUnlocked || !session.masterPassword) {
              throw new Error("会话已过期，请重新登录")
            }
            const decryptedPassword = await CryptoUtils.decrypt(data.encryptedData, session.masterPassword)
            return { success: true, data: decryptedPassword }

          default:
            return { success: false, error: "Unknown message type: " + type }
        }
      } catch (error) {
        console.error("Background script error:", error)
        return { success: false, error: error.message }
      }
    }

    // 立即执行异步处理
    handleAsync()
      .then((response) => {
        sendResponse(response)
      })
      .catch((error) => {
        console.error("Async handler error:", error)
        sendResponse({ success: false, error: error.message })
      })

    return true // 保持消息通道开放
  }

  /**
   * 处理登录
   */
  async handleLogin(data) {
    const { password } = data

    try {
      // 检查是否已设置主密码
      const settings = await StorageUtils.get("masterPasswordHash")

      if (!settings) {
        // 首次设置主密码
        const masterPassword = await CryptoUtils.encrypt(
          "ksjdfsdbfshsd",
          password
        )
        await StorageUtils.set("masterPasswordHash", masterPassword)

        await StorageUtils.saveSession({
          isUnlocked: true,
          lastActivity: Date.now(),
          masterPassword: password, // 存储主密码用于后续解密
        })

        return { success: true, data: { isFirstTime: true } }
      } else {
        // 验证密码
        const isValid = await CryptoUtils.verifyPassword(password, settings)

        if (isValid) {
          await StorageUtils.saveSession({
            isUnlocked: true,
            lastActivity: Date.now(),
            masterPassword: password, // 存储主密码用于后续解密
          })

          return { success: true, data: { isFirstTime: false } }
        } else {
          return { success: false, error: "密码错误" }
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 处理登出
   */
  async handleLogout() {
    await StorageUtils.clearSession()
    this.clearSessionTimeout()
  }

  /**
   * 获取凭据
   */
  async getCredentials(domain) {
    const session = await StorageUtils.getSession()
    if (!session || !session.isUnlocked) {
      throw new Error("会话已过期，请重新登录")
    }

    if (domain) {
      return await StorageUtils.getCredentialsByDomain(domain)
    } else {
      return await StorageUtils.getCredentials()
    }
  }

  /**
   * 保存凭据
   */
  async saveCredential(data) {
    const session = await StorageUtils.getSession()
    if (!session || !session.isUnlocked) {
      throw new Error("会话已过期，请重新登录")
    }

    const { credential, masterPassword } = data

    // 加密密码
    const encryptedPassword = await CryptoUtils.encrypt(
      credential.password,
      masterPassword
    )

    const credentialToSave = {
      ...credential,
      encryptedPassword,
      password: undefined, // 不保存明文密码
    }

    await StorageUtils.saveCredential(credentialToSave)
  }

  /**
   * 更新凭据
   */
  async updateCredential(data) {
    const session = await StorageUtils.getSession()
    if (!session || !session.isUnlocked) {
      throw new Error("会话已过期，请重新登录")
    }

    const { id, updates, masterPassword } = data

    // 如果更新了密码，需要重新加密
    if (updates.password) {
      updates.encryptedPassword = await CryptoUtils.encrypt(
        updates.password,
        masterPassword
      )
      delete updates.password // 删除明文密码
    }

    await StorageUtils.updateCredential(id, updates)
  }

  /**
   * 处理标签页更新
   */
  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === "complete" && tab.url) {
      try {
        const domain = new URL(tab.url).hostname
        const credentials = await StorageUtils.getCredentialsByDomain(domain)

        if (credentials.length > 0) {
          // 设置扩展图标徽章，显示可用凭据数量
          chrome.action.setBadgeText({
            tabId: tabId,
            text: credentials.length.toString(),
          })

          chrome.action.setBadgeBackgroundColor({
            tabId: tabId,
            color: "#22c55e",
          })
        } else {
          chrome.action.setBadgeText({
            tabId: tabId,
            text: "",
          })
        }
      } catch (error) {
        // URL 解析失败或其他错误
        chrome.action.setBadgeText({
          tabId: tabId,
          text: "",
        })
      }
    }
  }

  /**
   * 处理扩展安装
   */
  async handleInstall(details) {
    if (details.reason === "install") {
      // 首次安装，打开选项页面进行初始设置
      chrome.runtime.openOptionsPage()
    }
  }

  /**
   * 设置会话超时
   */
  async setupSessionTimeout() {
    const settings = await StorageUtils.getSettings()
    if (settings.autoLock) {
      const timeoutMs = settings.lockTimeout * 60 * 1000

      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout)
      }

      this.sessionTimeout = setTimeout(async () => {
        await StorageUtils.clearSession()
      }, timeoutMs)
    }
  }

  /**
   * 清除会话超时
   */
  clearSessionTimeout() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout)
      this.sessionTimeout = null
    }
  }

  /**
   * 更新活动时间
   */
  async updateActivity() {
    const session = await StorageUtils.getSession()
    if (session && session.isUnlocked) {
      await StorageUtils.saveSession({
        ...session,
        lastActivity: Date.now(),
      })

      // 重新设置超时
      this.setupSessionTimeout()
    }
  }
}

// 初始化后台服务
new BackgroundService()
