import React, { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';

const LoginScreen = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await onLogin(password);
      
      if (!result.success) {
        setError(result.error || '登录失败');
      }
    } catch (error) {
      setError('登录失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-popup h-popup bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AutoPassfiller</h1>
            <p className="text-sm text-gray-600 mt-1">安全密码管理器</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                主密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入主密码"
                  className={`input ${error ? 'input-error' : ''}`}
                  disabled={loading}
                  autoFocus
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
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  登录中...
                </div>
              ) : (
                '解锁'
              )}
            </button>
          </form>

          {/* Help */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              首次使用？输入一个安全的主密码来开始使用
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            所有密码均在本地加密存储
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
