// 内容脚本 - 检测表单和自动填充

class FormDetector {
  constructor() {
    this.forms = new Map();
    this.domain = window.location.hostname;
    this.init();
  }

  init() {
    // 页面加载完成后检测表单
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.detectForms());
    } else {
      this.detectForms();
    }

    // 监听动态添加的表单
    this.observeFormChanges();

    // 监听来自后台的消息
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // 监听表单提交，提示保存密码
    this.observeFormSubmissions();

    // 添加快捷键支持
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  /**
   * 检测页面中的登录表单
   */
  detectForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const formData = this.analyzeForm(form);
      if (formData.isLoginForm) {
        this.forms.set(form, formData);
        this.addFillButton(form, formData);
      }
    });
  }

  /**
   * 分析表单结构
   */
  analyzeForm(form) {
    const inputs = form.querySelectorAll('input');
    let usernameField = null;
    let passwordField = null;
    let emailField = null;

    inputs.forEach(input => {
      const type = input.type.toLowerCase();
      const name = input.name.toLowerCase();
      const id = input.id.toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

      // 检测密码字段
      if (type === 'password') {
        passwordField = input;
      }
      // 检测邮箱字段
      else if (type === 'email' || 
               name.includes('email') || 
               id.includes('email') ||
               placeholder.includes('email') ||
               ariaLabel.includes('email')) {
        emailField = input;
      }
      // 检测用户名字段
      else if ((type === 'text' || type === '') && 
               (name.includes('user') || 
                name.includes('login') ||
                name.includes('account') ||
                id.includes('user') ||
                id.includes('login') ||
                id.includes('account') ||
                placeholder.includes('user') ||
                placeholder.includes('login') ||
                placeholder.includes('account') ||
                ariaLabel.includes('user') ||
                ariaLabel.includes('login'))) {
        usernameField = input;
      }
    });

    // 如果有邮箱字段但没有用户名字段，将邮箱字段作为用户名字段
    if (emailField && !usernameField) {
      usernameField = emailField;
    }

    const isLoginForm = !!(passwordField && (usernameField || emailField));

    return {
      isLoginForm,
      form,
      usernameField: usernameField || emailField,
      passwordField,
      submitButton: form.querySelector('input[type="submit"], button[type="submit"], button:not([type])')
    };
  }

  /**
   * 添加填充按钮
   */
  addFillButton(form, formData) {
    // 避免重复添加
    if (form.querySelector('.autopassfiller-button')) {
      return;
    }

    const button = document.createElement('div');
    button.className = 'autopassfiller-button';
    button.innerHTML = `
      <div style="
        position: absolute;
        top: -5px;
        right: -5px;
        width: 24px;
        height: 24px;
        background: #3b82f6;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        transition: all 0.2s ease;
      " title="AutoPassfiller - 点击填充密码">
        <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
      </div>
    `;

    // 设置相对定位
    const passwordField = formData.passwordField;
    const parentElement = passwordField.parentElement;
    
    if (getComputedStyle(parentElement).position === 'static') {
      parentElement.style.position = 'relative';
    }

    parentElement.appendChild(button);

    // 添加点击事件
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this.fillForm(formData);
    });

    // 添加悬停效果
    button.addEventListener('mouseenter', () => {
      button.firstElementChild.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.firstElementChild.style.transform = 'scale(1)';
    });
  }

  /**
   * 填充表单
   */
  async fillForm(formData) {
    try {
      // 获取当前域名的凭据
      const response = await this.sendMessage({
        type: 'GET_CREDENTIALS',
        data: { domain: this.domain }
      });

      if (!response.success) {
        this.showNotification('获取凭据失败: ' + response.error, 'error');
        return;
      }

      const credentials = response.data;
      
      if (credentials.length === 0) {
        this.showNotification('当前网站没有保存的密码', 'info');
        return;
      }

      if (credentials.length === 1) {
        // 只有一个凭据，直接填充
        await this.fillFormWithCredential(formData, credentials[0]);
      } else {
        // 多个凭据，显示选择菜单
        this.showCredentialSelector(formData, credentials);
      }
    } catch (error) {
      console.error('填充表单失败:', error);
      this.showNotification('填充失败: ' + error.message, 'error');
    }
  }

  /**
   * 使用凭据填充表单
   */
  async fillFormWithCredential(formData, credential) {
    try {
      // 解密密码（这里需要主密码，可能需要弹出输入框）
      const masterPassword = await this.getMasterPassword();
      if (!masterPassword) return;

      const decryptResponse = await this.sendMessage({
        type: 'DECRYPT_PASSWORD',
        data: { 
          encryptedPassword: credential.encryptedPassword,
          masterPassword 
        }
      });

      if (!decryptResponse.success) {
        this.showNotification('密码解密失败', 'error');
        return;
      }

      // 填充用户名
      if (formData.usernameField && credential.username) {
        this.fillField(formData.usernameField, credential.username);
      }

      // 填充密码
      if (formData.passwordField) {
        this.fillField(formData.passwordField, decryptResponse.data.password);
      }

      this.showNotification('密码已填充', 'success');
      
      // 更新活动时间
      this.sendMessage({ type: 'UPDATE_ACTIVITY' });

    } catch (error) {
      console.error('填充凭据失败:', error);
      this.showNotification('填充失败', 'error');
    }
  }

  /**
   * 填充输入字段
   */
  fillField(field, value) {
    // 模拟用户输入
    field.focus();
    field.value = value;
    
    // 触发输入事件
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  }

  /**
   * 显示凭据选择器
   */
  showCredentialSelector(formData, credentials) {
    // 创建选择菜单
    const selector = document.createElement('div');
    selector.className = 'autopassfiller-selector';
    selector.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10001;
        min-width: 300px;
        max-width: 400px;
      ">
        <div style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">选择账户</h3>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${credentials.map((cred, index) => `
            <div class="credential-item" data-index="${index}" style="
              padding: 12px 16px;
              cursor: pointer;
              border-bottom: 1px solid #f3f4f6;
              transition: background-color 0.2s;
            ">
              <div style="font-weight: 500;">${cred.username}</div>
              <div style="font-size: 12px; color: #6b7280;">${cred.domain}</div>
            </div>
          `).join('')}
        </div>
        <div style="padding: 12px 16px; text-align: right; border-top: 1px solid #e5e7eb;">
          <button class="cancel-btn" style="
            padding: 6px 12px;
            margin-right: 8px;
            border: 1px solid #d1d5db;
            background: white;
            border-radius: 4px;
            cursor: pointer;
          ">取消</button>
        </div>
      </div>
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
      "></div>
    `;

    document.body.appendChild(selector);

    // 添加事件监听
    selector.addEventListener('click', async (e) => {
      if (e.target.closest('.credential-item')) {
        const index = parseInt(e.target.closest('.credential-item').dataset.index);
        await this.fillFormWithCredential(formData, credentials[index]);
        document.body.removeChild(selector);
      } else if (e.target.classList.contains('cancel-btn') || 
                 !e.target.closest('.autopassfiller-selector > div')) {
        document.body.removeChild(selector);
      }
    });

    // 添加样式悬停效果
    selector.querySelectorAll('.credential-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f9fafb';
      });
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });
    });
  }

  /**
   * 监听表单提交
   */
  observeFormSubmissions() {
    document.addEventListener('submit', async (e) => {
      const form = e.target;
      if (!form || form.tagName !== 'FORM') return;

      const formData = this.analyzeForm(form);
      if (!formData.isLoginForm) return;

      // 延迟检查是否登录成功
      setTimeout(async () => {
        await this.checkAndSaveCredentials(formData);
      }, 1000);
    });
  }

  /**
   * 检查并保存凭据
   */
  async checkAndSaveCredentials(formData) {
    try {
      const username = formData.usernameField?.value;
      const password = formData.passwordField?.value;

      if (!username || !password) return;

      // 检查是否已存在相同凭据
      const response = await this.sendMessage({
        type: 'GET_CREDENTIALS',
        data: { domain: this.domain }
      });

      if (response.success) {
        const existingCredentials = response.data;
        const exists = existingCredentials.some(cred => cred.username === username);

        if (!exists) {
          // 显示保存提示
          this.showSavePrompt({
            domain: this.domain,
            username,
            password
          });
        }
      }
    } catch (error) {
      console.error('检查凭据失败:', error);
    }
  }

  /**
   * 显示保存提示
   */
  showSavePrompt(credential) {
    const prompt = document.createElement('div');
    prompt.className = 'autopassfiller-save-prompt';
    prompt.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10001;
        width: 320px;
        animation: slideIn 0.3s ease-out;
      ">
        <div style="padding: 16px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <svg width="20" height="20" fill="#3b82f6" viewBox="0 0 24 24" style="margin-right: 8px;">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span style="font-weight: 600; font-size: 16px;">保存密码？</span>
          </div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 12px;">
            为 ${credential.domain} 保存登录信息
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="save-btn" style="
              flex: 1;
              padding: 8px 16px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            ">保存</button>
            <button class="cancel-btn" style="
              flex: 1;
              padding: 8px 16px;
              background: white;
              color: #6b7280;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            ">取消</button>
          </div>
        </div>
      </div>
    `;

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(prompt);

    // 添加事件监听
    prompt.querySelector('.save-btn').addEventListener('click', async () => {
      await this.saveCredential(credential);
      document.body.removeChild(prompt);
      document.head.removeChild(style);
    });

    prompt.querySelector('.cancel-btn').addEventListener('click', () => {
      document.body.removeChild(prompt);
      document.head.removeChild(style);
    });

    // 5秒后自动消失
    setTimeout(() => {
      if (document.body.contains(prompt)) {
        document.body.removeChild(prompt);
        document.head.removeChild(style);
      }
    }, 5000);
  }

  /**
   * 保存凭据
   */
  async saveCredential(credential) {
    try {
      const masterPassword = await this.getMasterPassword();
      if (!masterPassword) return;

      const response = await this.sendMessage({
        type: 'SAVE_CREDENTIAL',
        data: { credential, masterPassword }
      });

      if (response.success) {
        this.showNotification('密码已保存', 'success');
      } else {
        this.showNotification('保存失败: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('保存凭据失败:', error);
      this.showNotification('保存失败', 'error');
    }
  }

  /**
   * 获取主密码
   */
  async getMasterPassword() {
    return new Promise((resolve) => {
      // 这里应该弹出一个密码输入对话框
      // 为简化，暂时使用 prompt
      const password = prompt('请输入主密码:');
      resolve(password);
    });
  }

  /**
   * 观察表单变化
   */
  observeFormChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const forms = node.tagName === 'FORM' ? [node] : node.querySelectorAll('form');
              forms.forEach(form => {
                const formData = this.analyzeForm(form);
                if (formData.isLoginForm && !this.forms.has(form)) {
                  this.forms.set(form, formData);
                  this.addFillButton(form, formData);
                }
              });
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 处理快捷键
   */
  handleKeydown(e) {
    // Ctrl+Shift+F 快速填充
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      const activeElement = document.activeElement;
      
      // 查找最近的表单
      let form = activeElement.closest('form');
      if (!form && this.forms.size > 0) {
        form = Array.from(this.forms.keys())[0];
      }
      
      if (form && this.forms.has(form)) {
        this.fillForm(this.forms.get(form));
      }
    }
  }

  /**
   * 处理来自后台的消息
   */
  handleMessage(message, sender, sendResponse) {
    const { type, data } = message;
    
    switch (type) {
      case 'FILL_FORM':
        // 从弹窗触发的填充
        this.fillFormById(data.formId, data.credential);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
    
    return true;
  }

  /**
   * 发送消息到后台
   */
  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  /**
   * 显示通知
   */
  showNotification(message, type = 'info') {
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10002;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }
}

// 初始化表单检测器
if (document.location.protocol !== 'chrome-extension:') {
  new FormDetector();
}
