// 加密工具模块 - 使用 Web Crypto API 实现 AES-256-GCM 加密

class CryptoUtils {
  /**
   * 从密码生成密钥
   * @param {string} password - 用户密码
   * @param {Uint8Array} salt - 盐值
   * @returns {Promise<CryptoKey>} 生成的密钥
   */
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

  /**
   * 生成随机盐值
   * @returns {Uint8Array} 16字节的随机盐值
   */
  static generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * 生成随机 IV
   * @returns {Uint8Array} 12字节的随机 IV
   */
  static generateIV() {
    return crypto.getRandomValues(new Uint8Array(12));
  }

  /**
   * 加密数据
   * @param {string} plaintext - 要加密的明文
   * @param {string} password - 用户密码
   * @returns {Promise<string>} Base64 编码的加密结果
   */
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

    // 组合 salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // 转换为 Base64
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * 解密数据
   * @param {string} encryptedData - Base64 编码的加密数据
   * @param {string} password - 用户密码
   * @returns {Promise<string>} 解密后的明文
   */
  static async decrypt(encryptedData, password) {
    try {
      // 从 Base64 解码
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // 提取 salt, iv 和 encrypted data
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

  /**
   * 验证密码是否正确
   * @param {string} password - 要验证的密码
   * @param {string} testData - 测试加密数据
   * @returns {Promise<boolean>} 密码是否正确
   */
  static async verifyPassword(password, testData) {
    try {
      await this.decrypt(testData, password);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 生成密码强度分数
   * @param {string} password - 要评估的密码
   * @returns {Object} 包含分数和建议的对象
   */
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

  /**
   * 生成随机密码
   * @param {number} length - 密码长度
   * @param {Object} options - 生成选项
   * @returns {string} 生成的随机密码
   */
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

export default CryptoUtils;
