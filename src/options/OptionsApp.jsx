import React, { useState, useEffect } from 'react';
import { Shield, Settings, Download, Upload, Trash2, Moon, Sun, Clock, Lock } from 'lucide-react';
import { sendMessage } from '../popup/utils/api';

const OptionsApp = () => {
  const [settings, setSettings] = useState({
    theme: 'light',
    autoLock: true,
    lockTimeout: 15,
    autoFill: true
  });
  const [stats, setStats] = useState({
    totalCredentials: 0,
    totalDomains: 0,
    lastUpdated: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await sendMessage({ type: 'GET_STATS' });
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    setSaving(true);
    try {
      const response = await sendMessage({
        type: 'SAVE_SETTINGS',
        data: newSettings
      });
      
      if (response.success) {
        setSettings(newSettings);
        showNotification('设置已保存', 'success');
      } else {
        showNotification('保存失败: ' + response.error, 'error');
      }
    } catch (error) {
      showNotification('保存失败: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const exportData = async () => {
    try {
      const response = await sendMessage({ type: 'EXPORT_DATA' });
      if (response.success) {
        const data = JSON.stringify(response.data, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `autopassfiller-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('数据导出成功', 'success');
      } else {
        showNotification('导出失败: ' + response.error, 'error');
      }
    } catch (error) {
      showNotification('导出失败: ' + error.message, 'error');
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const response = await sendMessage({
        type: 'IMPORT_DATA',
        data: data
      });
      
      if (response.success) {
        showNotification('数据导入成功', 'success');
        await loadStats();
      } else {
        showNotification('导入失败: ' + response.error, 'error');
      }
    } catch (error) {
      showNotification('导入失败: ' + error.message, 'error');
    }
    
    // 清除文件选择
    event.target.value = '';
  };

  const clearAllData = async () => {
    if (!confirm('确定要清除所有数据吗？此操作不可逆！')) {
      return;
    }
    
    if (!confirm('这将删除所有保存的密码和设置。确定继续？')) {
      return;
    }

    try {
      const response = await sendMessage({ type: 'CLEAR_ALL_DATA' });
      if (response.success) {
        showNotification('所有数据已清除', 'success');
        await loadStats();
      } else {
        showNotification('清除失败: ' + response.error, 'error');
      }
    } catch (error) {
      showNotification('清除失败: ' + error.message, 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AutoPassfiller</h1>
              <p className="text-sm text-gray-600">安全密码管理器 - 设置</p>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 设置面板 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本设置 */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                基本设置
              </h2>
              
              <div className="space-y-4">
                {/* 主题设置 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {settings.theme === 'dark' ? 
                      <Moon className="w-5 h-5 text-gray-600" /> : 
                      <Sun className="w-5 h-5 text-gray-600" />
                    }
                    <div>
                      <label className="text-sm font-medium text-gray-700">深色模式</label>
                      <p className="text-xs text-gray-500">切换应用程序外观</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.theme === 'dark'}
                      onChange={(e) => handleSettingChange('theme', e.target.checked ? 'dark' : 'light')}
                      disabled={saving}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* 自动锁定 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-gray-600" />
                    <div>
                      <label className="text-sm font-medium text-gray-700">自动锁定</label>
                      <p className="text-xs text-gray-500">闲置一段时间后自动锁定</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.autoLock}
                      onChange={(e) => handleSettingChange('autoLock', e.target.checked)}
                      disabled={saving}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* 锁定时间 */}
                {settings.autoLock && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <div>
                        <label className="text-sm font-medium text-gray-700">锁定时间</label>
                        <p className="text-xs text-gray-500">闲置多长时间后锁定（分钟）</p>
                      </div>
                    </div>
                    <select
                      value={settings.lockTimeout}
                      onChange={(e) => handleSettingChange('lockTimeout', parseInt(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={saving}
                    >
                      <option value={5}>5 分钟</option>
                      <option value={15}>15 分钟</option>
                      <option value={30}>30 分钟</option>
                      <option value={60}>1 小时</option>
                      <option value={240}>4 小时</option>
                    </select>
                  </div>
                )}

                {/* 自动填充 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Settings className="w-5 h-5 text-gray-600" />
                    <div>
                      <label className="text-sm font-medium text-gray-700">自动填充</label>
                      <p className="text-xs text-gray-500">启用自动表单填充功能</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.autoFill}
                      onChange={(e) => handleSettingChange('autoFill', e.target.checked)}
                      disabled={saving}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 数据管理 */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">数据管理</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Download className="w-5 h-5 text-gray-600" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">导出数据</h3>
                      <p className="text-xs text-gray-500">将所有密码和设置导出为文件</p>
                    </div>
                  </div>
                  <button
                    onClick={exportData}
                    className="btn btn-secondary"
                  >
                    导出
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Upload className="w-5 h-5 text-gray-600" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">导入数据</h3>
                      <p className="text-xs text-gray-500">从备份文件恢复数据</p>
                    </div>
                  </div>
                  <label className="btn btn-secondary cursor-pointer">
                    选择文件
                    <input
                      type="file"
                      accept=".json"
                      onChange={importData}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    <div>
                      <h3 className="text-sm font-medium text-red-700">清除所有数据</h3>
                      <p className="text-xs text-red-600">删除所有密码和设置（不可恢复）</p>
                    </div>
                  </div>
                  <button
                    onClick={clearAllData}
                    className="btn btn-danger"
                  >
                    清除
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 统计信息 */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">统计信息</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">保存的密码</span>
                  <span className="text-sm font-medium text-gray-900">{stats.totalCredentials}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">网站数量</span>
                  <span className="text-sm font-medium text-gray-900">{stats.totalDomains}</span>
                </div>
                {stats.lastUpdated && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">最后更新</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(stats.lastUpdated).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 关于 */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">关于</h2>
              
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>版本:</strong> 1.0.0</p>
                <p><strong>加密:</strong> AES-256-GCM</p>
                <p><strong>存储:</strong> 本地加密存储</p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  AutoPassfiller 使用最先进的加密技术保护您的密码安全，
                  所有数据都在本地加密存储，我们无法访问您的任何信息。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OptionsApp;
