// 存储工具模块 - 封装 Chrome Storage API

class StorageUtils {
  /**
   * 保存数据到本地存储
   * @param {string} key - 存储键
   * @param {any} value - 存储值
   * @returns {Promise<void>}
   */
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

  /**
   * 从本地存储获取数据
   * @param {string|string[]} key - 存储键或键数组
   * @returns {Promise<any>} 存储的值
   */
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

  /**
   * 从本地存储删除数据
   * @param {string|string[]} key - 要删除的键或键数组
   * @returns {Promise<void>}
   */
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

  /**
   * 清空所有本地存储
   * @returns {Promise<void>}
   */
  static async clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 获取存储使用量
   * @returns {Promise<number>} 字节数
   */
  static async getBytesInUse() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(bytes);
        }
      });
    });
  }

  /**
   * 保存密码条目
   * @param {Object} credential - 密码条目
   * @returns {Promise<void>}
   */
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

  /**
   * 获取所有密码条目
   * @returns {Promise<Array>} 密码条目数组
   */
  static async getCredentials() {
    const credentials = await this.get('credentials');
    return credentials || [];
  }

  /**
   * 根据域名获取密码条目
   * @param {string} domain - 网站域名
   * @returns {Promise<Array>} 匹配的密码条目
   */
  static async getCredentialsByDomain(domain) {
    const credentials = await this.getCredentials();
    return credentials.filter(c => c.domain === domain);
  }

  /**
   * 删除密码条目
   * @param {string} id - 条目ID
   * @returns {Promise<void>}
   */
  static async deleteCredential(id) {
    const credentials = await this.getCredentials();
    const filtered = credentials.filter(c => c.id !== id);
    await this.set('credentials', filtered);
  }

  /**
   * 更新密码条目
   * @param {string} id - 条目ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<void>}
   */
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

  /**
   * 保存应用设置
   * @param {Object} settings - 设置对象
   * @returns {Promise<void>}
   */
  static async saveSettings(settings) {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...settings };
    await this.set('settings', newSettings);
  }

  /**
   * 获取应用设置
   * @returns {Promise<Object>} 设置对象
   */
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

  /**
   * 保存会话信息
   * @param {Object} session - 会话数据
   * @returns {Promise<void>}
   */
  static async saveSession(session) {
    await this.set('session', {
      ...session,
      lastActivity: Date.now()
    });
  }

  /**
   * 获取会话信息
   * @returns {Promise<Object|null>} 会话数据
   */
  static async getSession() {
    return await this.get('session');
  }

  /**
   * 清除会话信息
   * @returns {Promise<void>}
   */
  static async clearSession() {
    await this.remove('session');
  }

  /**
   * 检查会话是否有效
   * @returns {Promise<boolean>} 会话是否有效
   */
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

  /**
   * 导出所有数据
   * @returns {Promise<Object>} 导出数据
   */
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

  /**
   * 导入数据
   * @param {Object} data - 导入数据
   * @returns {Promise<void>}
   */
  static async importData(data) {
    if (data.credentials) {
      await this.set('credentials', data.credentials);
    }
    if (data.settings) {
      await this.saveSettings(data.settings);
    }
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取域名统计信息
   * @returns {Promise<Object>} 统计信息
   */
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

export default StorageUtils;
