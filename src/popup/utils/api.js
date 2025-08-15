// API 工具函数 - 用于与后台脚本通信

/**
 * 发送消息到后台脚本
 * @param {Object} message - 要发送的消息
 * @returns {Promise<Object>} 响应数据
 */
export const sendMessage = (message) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else if (!response) {
          console.error('No response received from background script');
          resolve({ success: false, error: '未收到后台脚本响应' });
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      console.error('Send message error:', error);
      resolve({ success: false, error: error.message });
    }
  });
};

/**
 * 获取当前活动标签页
 * @returns {Promise<Object>} 标签页信息
 */
export const getCurrentTab = () => {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
};

/**
 * 在当前标签页中执行脚本
 * @param {number} tabId - 标签页ID
 * @param {Object} details - 脚本详情
 * @returns {Promise<Array>} 执行结果
 */
export const executeScript = (tabId, details) => {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript({
      target: { tabId },
      ...details
    }, (results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(results);
      }
    });
  });
};

/**
 * 向标签页发送消息
 * @param {number} tabId - 标签页ID
 * @param {Object} message - 消息内容
 * @returns {Promise<Object>} 响应
 */
export const sendTabMessage = (tabId, message) => {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      resolve(response || { success: false, error: '未收到响应' });
    });
  });
};
