import React, { useState, useEffect } from 'react';
import { Shield, Lock, Plus, Settings, Search, Eye, EyeOff, Copy, Edit, Trash2 } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import CredentialList from './components/CredentialList';
import AddCredentialModal from './components/AddCredentialModal';
import EditCredentialModal from './components/EditCredentialModal';
import { sendMessage, getCurrentTab } from './utils/api';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState([]);
  const [currentDomain, setCurrentDomain] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [masterPassword, setMasterPassword] = useState('');

  useEffect(() => {
    checkAuthStatus();
    getCurrentDomainAndCredentials();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await sendMessage({ type: 'CHECK_SESSION' });
      if (response.success && response.data.isValid) {
        setIsAuthenticated(true);
        await loadCredentials();
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDomainAndCredentials = async () => {
    try {
      const tab = await getCurrentTab();
      if (tab?.url) {
        const domain = new URL(tab.url).hostname;
        setCurrentDomain(domain);
      }
    } catch (error) {
      console.error('获取当前域名失败:', error);
    }
  };

  const loadCredentials = async () => {
    try {
      const response = await sendMessage({ type: 'GET_CREDENTIALS', data: {} });
      if (response.success) {
        setCredentials(response.data);
      }
    } catch (error) {
      console.error('加载凭据失败:', error);
    }
  };

  const handleLogin = async (password) => {
    try {
      const response = await sendMessage({ 
        type: 'LOGIN', 
        data: { password } 
      });

      if (response.success) {
        setIsAuthenticated(true);
        setMasterPassword(password);
        await loadCredentials();
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleLogout = async () => {
    try {
      await sendMessage({ type: 'LOGOUT' });
      setIsAuthenticated(false);
      setMasterPassword('');
      setCredentials([]);
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const handleAddCredential = async (credentialData) => {
    try {
      const response = await sendMessage({
        type: 'SAVE_CREDENTIAL',
        data: {
          credential: credentialData,
          masterPassword
        }
      });

      if (response.success) {
        await loadCredentials();
        setShowAddModal(false);
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleEditCredential = async (credentialData) => {
    try {
      const response = await sendMessage({
        type: 'UPDATE_CREDENTIAL',
        data: {
          id: editingCredential.id,
          updates: credentialData,
          masterPassword
        }
      });

      if (response.success) {
        await loadCredentials();
        setEditingCredential(null);
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleDeleteCredential = async (id) => {
    if (!confirm('确定要删除这个密码吗？')) {
      return;
    }

    try {
      const response = await sendMessage({
        type: 'DELETE_CREDENTIAL',
        data: { id }
      });

      if (response.success) {
        await loadCredentials();
      }
    } catch (error) {
      console.error('删除凭据失败:', error);
    }
  };

  const handleCopyPassword = async (credential) => {
    try {
      // 解密密码
      const CryptoUtils = (await import('../utils/crypto.js')).default;
      const password = await CryptoUtils.decrypt(credential.encryptedPassword, masterPassword);
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(password);
      
      // 显示成功提示
      showNotification('密码已复制到剪贴板');
    } catch (error) {
      console.error('复制密码失败:', error);
      showNotification('复制失败', 'error');
    }
  };

  const handleFillForm = async (credential) => {
    try {
      const tab = await getCurrentTab();
      if (!tab?.id) {
        showNotification('无法获取当前标签页', 'error');
        return;
      }

      // 发送消息到内容脚本
      chrome.tabs.sendMessage(tab.id, {
        type: 'FILL_FORM',
        data: {
          credential,
          masterPassword
        }
      });

      // 关闭弹窗
      window.close();
    } catch (error) {
      console.error('填充表单失败:', error);
      showNotification('填充失败', 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    // 这里可以实现通知组件
    console.log(`${type}: ${message}`);
  };

  const filteredCredentials = credentials.filter(cred => {
    const searchLower = searchTerm.toLowerCase();
    return (
      cred.domain.toLowerCase().includes(searchLower) ||
      cred.username.toLowerCase().includes(searchLower)
    );
  });

  const currentDomainCredentials = filteredCredentials.filter(cred => 
    cred.domain === currentDomain
  );

  const otherCredentials = filteredCredentials.filter(cred => 
    cred.domain !== currentDomain
  );

  if (loading) {
    return (
      <div className="w-popup h-popup flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="text-sm text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="w-popup h-popup bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary-500" />
            <h1 className="text-lg font-semibold text-gray-900">AutoPassfiller</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 text-gray-500 hover:text-primary-500 hover:bg-gray-100 rounded-md transition-colors"
              title="添加密码"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="p-2 text-gray-500 hover:text-primary-500 hover:bg-gray-100 rounded-md transition-colors"
              title="设置"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-md transition-colors"
              title="锁定"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索密码..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <CredentialList
          currentDomainCredentials={currentDomainCredentials}
          otherCredentials={otherCredentials}
          currentDomain={currentDomain}
          onCopy={handleCopyPassword}
          onFill={handleFillForm}
          onEdit={setEditingCredential}
          onDelete={handleDeleteCredential}
        />
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddCredentialModal
          defaultDomain={currentDomain}
          onSave={handleAddCredential}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingCredential && (
        <EditCredentialModal
          credential={editingCredential}
          onSave={handleEditCredential}
          onClose={() => setEditingCredential(null)}
        />
      )}
    </div>
  );
};

export default App;
