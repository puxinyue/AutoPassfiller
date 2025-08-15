// 后台脚本 (Service Worker) - 处理会话管理、存储管理和消息通信

// 内联加密工具函数
class CryptoUtils {
  static generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  static generateIV() {
    return crypto.getRandomValues(new Uint8Array(12));
  }

  static async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(plaintext, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    const salt = this.generateSalt();
    const iv = this.generateIV();
    const key = await this.deriveKey(password, salt);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(encryptedData, password) {
    try {
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encrypted = combined.slice(28);

      const key = await this.deriveKey(password, salt);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      throw new Error('解密失败：密码错误或数据损坏');
    }
  }

  static async verifyPassword(password, testData) {
    try {
      await this.decrypt(testData, password);
      return true;
    } catch {
      return false;
    }
  }

  static evaluatePasswordStrength(password) {
    let score = 0;
    const feedback = [];

    if (password.length >= 8) {
      score += 20;
    } else {
      feedback.push('密码至少需要8个字符');
    }

    if (password.length >= 12) {
      score += 10;
    }

    if (/[a-z]/.test(password)) {
      score += 10;
    } else {
      feedback.push('包含小写字母');
    }

    if (/[A-Z]/.test(password)) {
      score += 10;
    } else {
      feedback.push('包含大写字母');
    }

    if (/\d/.test(password)) {
      score += 10;
    } else {
      feedback.push('包含数字');
    }

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 20;
    } else {
      feedback.push('包含特殊字符');
    }

    if (password.length >= 16) {
      score += 20;
    }

    let level = 'weak';
    if (score >= 80) level = 'strong';
    else if (score >= 60) level = 'medium';

    return {
      score: Math.min(score, 100),
      level,
      feedback
    };
  }

  static generatePassword(length = 16, options = {}) {
    const {
      uppercase = true,
      lowercase = true,
      numbers = true,
      symbols = true,
      excludeSimilar = true
    } = options;

    let charset = '';
    if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (numbers) charset += '0123456789';
    if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (excludeSimilar) {
      charset = charset.replace(/[il1Lo0O]/g, '');
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    return password;
  }
}

// 内联存储工具函数
class StorageUtils {
  static async set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  static async get(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(typeof key === 'string' ? result[key] : result);
        }
      });
    });
  }

  static async remove(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  static async saveCredential(credential) {
    const credentials = await this.getCredentials();
    const existingIndex = credentials.findIndex(
      c => c.domain === credential.domain && c.username === credential.username
    );

    if (existingIndex >= 0) {
      credentials[existingIndex] = {
        ...credentials[existingIndex],
        ...credential,
        updatedAt: Date.now()
      };
    } else {
      credential.id = this.generateId();
      credential.createdAt = Date.now();
      credential.updatedAt = Date.now();
      credentials.push(credential);
    }

    await this.set('credentials', credentials);
  }

  static async getCredentials() {
    const credentials = await this.get('credentials');
    return credentials || [];
  }

  static async getCredentialsByDomain(domain) {
    const credentials = await this.getCredentials();
    return credentials.filter(c => c.domain === domain);
  }

  static async deleteCredential(id) {
    const credentials = await this.getCredentials();
    const filtered = credentials.filter(c => c.id !== id);
    await this.set('credentials', filtered);
  }

  static async updateCredential(id, updates) {
    const credentials = await this.getCredentials();
    const index = credentials.findIndex(c => c.id === id);
    
    if (index >= 0) {
      credentials[index] = {
        ...credentials[index],
        ...updates,
        updatedAt: Date.now()
      };
      await this.set('credentials', credentials);
    }
  }

  static async saveSettings(settings) {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...settings };
    await this.set('settings', newSettings);
  }

  static async getSettings() {
    const settings = await this.get('settings');
    return {
      theme: 'light',
      autoLock: true,
      lockTimeout: 15,
      autoFill: true,
      ...settings
    };
  }

  static async saveSession(session) {
    await this.set('session', {
      ...session,
      lastActivity: Date.now()
    });
  }

  static async getSession() {
    return await this.get('session');
  }

  static async clearSession() {
    await this.remove('session');
  }

  static async isSessionValid() {
    const session = await this.getSession();
    if (!session || !session.isUnlocked) {
      return false;
    }

    const settings = await this.getSettings();
    if (!settings.autoLock) {
      return true;
    }

    const timeoutMs = settings.lockTimeout * 60 * 1000;
    const isExpired = (Date.now() - session.lastActivity) > timeoutMs;
    
    if (isExpired) {
      await this.clearSession();
      return false;
    }

    return true;
  }

  static async exportData() {
    const [credentials, settings] = await Promise.all([
      this.getCredentials(),
      this.getSettings()
    ]);

    return {
      credentials,
      settings,
      exportedAt: Date.now(),
      version: '1.0.0'
    };
  }

  static async importData(data) {
    if (data.credentials) {
      await this.set('credentials', data.credentials);
    }
    if (data.settings) {
      await this.saveSettings(data.settings);
    }
  }

  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  static async getStats() {
    const credentials = await this.getCredentials();
    const domains = [...new Set(credentials.map(c => c.domain))];
    
    return {
      totalCredentials: credentials.length,
      totalDomains: domains.length,
      lastUpdated: credentials.length > 0 
        ? Math.max(...credentials.map(c => c.updatedAt || c.createdAt))
        : null
    };
  }
}

class BackgroundService {
  constructor() {
    this.sessionTimeout = null;
    this.moduleLoaded = false;
    this.init();
  }

  init() {
    // 监听消息
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // 监听标签页更新
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // 监听扩展安装
    chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));
    
    // 设置会话超时检查
    this.setupSessionTimeout();
  }

  /**
   * 处理消息
   */
  handleMessage(message, sender, sendResponse) {
    const handleAsync = async () => {
      try {
        const { type, data } = message;
        
        switch (type) {
          case 'CHECK_SESSION':
            const isValid = await StorageUtils.isSessionValid();
            return { success: true, data: { isValid } };
            
          case 'LOGIN':
            return await this.handleLogin(data);
            
          case 'LOGOUT':
            await this.handleLogout();
            return { success: true };
            
          case 'GET_CREDENTIALS':
            const credentials = await this.getCredentials(data?.domain);
            return { success: true, data: credentials };
            
          case 'SAVE_CREDENTIAL':
            await this.saveCredential(data);
            return { success: true };
            
          case 'UPDATE_CREDENTIAL':
            await this.updateCredential(data);
            return { success: true };
            
          case 'DELETE_CREDENTIAL':
            await StorageUtils.deleteCredential(data.id);
            return { success: true };
            
          case 'GENERATE_PASSWORD':
            const password = CryptoUtils.generatePassword(data?.length, data?.options);
            return { success: true, data: { password } };
            
          case 'EVALUATE_PASSWORD':
            const evaluation = CryptoUtils.evaluatePasswordStrength(data.password);
            return { success: true, data: evaluation };
            
          case 'UPDATE_ACTIVITY':
            await this.updateActivity();
            return { success: true };
            
          case 'GET_STATS':
            const stats = await StorageUtils.getStats();
            return { success: true, data: stats };
            
          case 'EXPORT_DATA':
            const exportData = await StorageUtils.exportData();
            return { success: true, data: exportData };
            
          case 'IMPORT_DATA':
            await StorageUtils.importData(data);
            return { success: true };
            
          case 'GET_SETTINGS':
            const settings = await StorageUtils.getSettings();
            return { success: true, data: settings };
            
          case 'SAVE_SETTINGS':
            await StorageUtils.saveSettings(data);
            return { success: true };
            
          case 'CLEAR_ALL_DATA':
            await StorageUtils.set('credentials', []);
            await StorageUtils.set('settings', {});
            await StorageUtils.remove('masterPasswordHash');
            await StorageUtils.clearSession();
            return { success: true };
            
          default:
            return { success: false, error: 'Unknown message type: ' + type };
        }
      } catch (error) {
        console.error('Background script error:', error);
        return { success: false, error: error.message };
      }
    };

    // 立即执行异步处理
    handleAsync().then(response => {
      sendResponse(response);
    }).catch(error => {
      console.error('Async handler error:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // 保持消息通道开放
  }

  /**
   * 处理登录
   */
  async handleLogin(data) {
    const { password } = data;
    
    try {
      // 检查是否已设置主密码
      const settings = await StorageUtils.get('masterPasswordHash');
      
      if (!settings) {
        // 首次设置主密码
        const testData = await CryptoUtils.encrypt('test', password);
        await StorageUtils.set('masterPasswordHash', testData);
        
        await StorageUtils.saveSession({
          isUnlocked: true,
          lastActivity: Date.now()
        });
        
        return { success: true, data: { isFirstTime: true } };
      } else {
        // 验证密码
        const isValid = await CryptoUtils.verifyPassword(password, settings);
        
        if (isValid) {
          await StorageUtils.saveSession({
            isUnlocked: true,
            lastActivity: Date.now()
          });
          
          return { success: true, data: { isFirstTime: false } };
        } else {
          return { success: false, error: '密码错误' };
        }
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 处理登出
   */
  async handleLogout() {
    await StorageUtils.clearSession();
    this.clearSessionTimeout();
  }

  /**
   * 获取凭据
   */
  async getCredentials(domain) {
    const session = await StorageUtils.getSession();
    if (!session || !session.isUnlocked) {
      throw new Error('会话已过期，请重新登录');
    }
    
    if (domain) {
      return await StorageUtils.getCredentialsByDomain(domain);
    } else {
      return await StorageUtils.getCredentials();
    }
  }

  /**
   * 保存凭据
   */
  async saveCredential(data) {
    const session = await StorageUtils.getSession();
    if (!session || !session.isUnlocked) {
      throw new Error('会话已过期，请重新登录');
    }
    
    const { credential, masterPassword } = data;
    
    // 加密密码
    const encryptedPassword = await CryptoUtils.encrypt(credential.password, masterPassword);
    
    const credentialToSave = {
      ...credential,
      encryptedPassword,
      password: undefined // 不保存明文密码
    };
    
    await StorageUtils.saveCredential(credentialToSave);
  }

  /**
   * 更新凭据
   */
  async updateCredential(data) {
    const session = await StorageUtils.getSession();
    if (!session || !session.isUnlocked) {
      throw new Error('会话已过期，请重新登录');
    }
    
    const { id, updates, masterPassword } = data;
    
    // 如果更新了密码，需要重新加密
    if (updates.password) {
      updates.encryptedPassword = await CryptoUtils.encrypt(updates.password, masterPassword);
      delete updates.password; // 删除明文密码
    }
    
    await StorageUtils.updateCredential(id, updates);
  }

  /**
   * 处理标签页更新
   */
  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const domain = new URL(tab.url).hostname;
        const credentials = await StorageUtils.getCredentialsByDomain(domain);
        
        if (credentials.length > 0) {
          // 设置扩展图标徽章，显示可用凭据数量
          chrome.action.setBadgeText({
            tabId: tabId,
            text: credentials.length.toString()
          });
          
          chrome.action.setBadgeBackgroundColor({
            tabId: tabId,
            color: '#22c55e'
          });
        } else {
          chrome.action.setBadgeText({
            tabId: tabId,
            text: ''
          });
        }
      } catch (error) {
        // URL 解析失败或其他错误
        chrome.action.setBadgeText({
          tabId: tabId,
          text: ''
        });
      }
    }
  }

  /**
   * 处理扩展安装
   */
  async handleInstall(details) {
    if (details.reason === 'install') {
      // 首次安装，打开选项页面进行初始设置
      chrome.runtime.openOptionsPage();
    }
  }

  /**
   * 设置会话超时
   */
  async setupSessionTimeout() {
    const settings = await StorageUtils.getSettings();
    if (settings.autoLock) {
      const timeoutMs = settings.lockTimeout * 60 * 1000;
      
      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
      }
      
      this.sessionTimeout = setTimeout(async () => {
        await StorageUtils.clearSession();
      }, timeoutMs);
    }
  }

  /**
   * 清除会话超时
   */
  clearSessionTimeout() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }

  /**
   * 更新活动时间
   */
  async updateActivity() {
    const session = await StorageUtils.getSession();
    if (session && session.isUnlocked) {
      await StorageUtils.saveSession({
        ...session,
        lastActivity: Date.now()
      });
      
      // 重新设置超时
      this.setupSessionTimeout();
    }
  }
}

// 初始化后台服务
new BackgroundService();
