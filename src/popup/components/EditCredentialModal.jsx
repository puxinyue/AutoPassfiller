import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { sendMessage } from '../utils/api';

const EditCredentialModal = ({ credential, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    domain: credential.domain || '',
    username: credential.username || '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setPasswordChanged(true);
      
      // 评估密码强度
      if (value) {
        try {
          const response = await sendMessage({
            type: 'EVALUATE_PASSWORD',
            data: { password: value }
          });
          if (response.success) {
            setPasswordStrength(response.data);
          }
        } catch (error) {
          console.error('评估密码强度失败:', error);
        }
      } else {
        setPasswordStrength(null);
      }
    }
  };

  const generatePassword = async () => {
    try {
      const response = await sendMessage({
        type: 'GENERATE_PASSWORD',
        data: {
          length: 16,
          options: {
            uppercase: true,
            lowercase: true,
            numbers: true,
            symbols: true,
            excludeSimilar: true
          }
        }
      });

      if (response.success) {
        const password = response.data.password;
        setFormData(prev => ({ ...prev, password }));
        setShowPassword(true);
        setPasswordChanged(true);
        
        // 评估生成密码的强度
        const strengthResponse = await sendMessage({
          type: 'EVALUATE_PASSWORD',
          data: { password }
        });
        if (strengthResponse.success) {
          setPasswordStrength(strengthResponse.data);
        }
      }
    } catch (error) {
      console.error('生成密码失败:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.domain.trim()) {
      setError('请输入网站域名');
      return;
    }
    
    if (!formData.username.trim()) {
      setError('请输入用户名');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updates = {
        domain: formData.domain.trim(),
        username: formData.username.trim()
      };

      // 只有在密码被修改时才包含密码更新
      if (passwordChanged && formData.password.trim()) {
        updates.password = formData.password;
      }

      const result = await onSave(updates);

      if (!result.success) {
        setError(result.error || '更新失败');
      }
    } catch (error) {
      setError('更新失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (level) => {
    switch (level) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthText = (level) => {
    switch (level) {
      case 'weak': return '弱';
      case 'medium': return '中';
      case 'strong': return '强';
      default: return '';
    }
  };

  return (
    <div className="modal-backdrop fade-in">
      <div className="modal slide-up">
        <div className="modal-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">编辑密码</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                网站域名
              </label>
              <input
                id="domain"
                name="domain"
                type="text"
                value={formData.domain}
                onChange={handleChange}
                placeholder="例如: google.com"
                className="input"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                用户名/邮箱
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="用户名或邮箱地址"
                className="input"
                disabled={loading}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  新密码 <span className="text-xs text-gray-500">(留空保持不变)</span>
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-xs text-primary-500 hover:text-primary-600 flex items-center space-x-1"
                  disabled={loading}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>生成新密码</span>
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="输入新密码或保持为空"
                  className="input"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {passwordStrength && passwordChanged && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">密码强度</span>
                    <span className={`font-medium ${
                      passwordStrength.level === 'strong' ? 'text-green-600' : 
                      passwordStrength.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {getStrengthText(passwordStrength.level)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength.level)}`}
                      style={{ width: `${passwordStrength.score}%` }}
                    ></div>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-500">建议:</p>
                      <ul className="text-xs text-gray-500 list-disc list-inside">
                        {passwordStrength.feedback.map((feedback, index) => (
                          <li key={index}>{feedback}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>提示:</strong> 如果不需要更改密码，请将密码字段留空。
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={loading || !formData.domain.trim() || !formData.username.trim()}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                更新中...
              </div>
            ) : (
              '更新'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCredentialModal;
