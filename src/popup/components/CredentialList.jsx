import React from 'react';
import { Globe, Copy, Edit, Trash2, LogIn } from 'lucide-react';

const CredentialItem = ({ credential, onCopy, onFill, onEdit, onDelete }) => {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  return (
    <div className="credential-item dark:border-gray-700 dark:hover:bg-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center dark:bg-gray-600">
              <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                {credential.username}
              </p>
              <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                {credential.domain}
              </p>
            </div>
          </div>
          {credential.updatedAt && (
            <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
              更新于 {formatDate(credential.updatedAt)}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => onFill(credential)}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-gray-100 rounded-md transition-colors dark:hover:bg-gray-600"
            title="自动填充"
          >
            <LogIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => onCopy(credential)}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-gray-100 rounded-md transition-colors dark:hover:bg-gray-600"
            title="复制密码"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(credential)}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-gray-100 rounded-md transition-colors dark:hover:bg-gray-600"
            title="编辑"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(credential.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md transition-colors dark:hover:bg-gray-600"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const CredentialSection = ({ title, credentials, onCopy, onFill, onEdit, onDelete }) => {
  if (credentials.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 px-4 py-2 bg-gray-50 sticky top-0 dark:bg-gray-800 dark:text-gray-300">
        {title} ({credentials.length})
      </h3>
      <div className="bg-white dark:bg-gray-900">
        {credentials.map((credential) => (
          <CredentialItem
            key={credential.id}
            credential={credential}
            onCopy={onCopy}
            onFill={onFill}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 dark:bg-gray-900">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 dark:bg-gray-700">
      <Globe className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-white">暂无保存的密码</h3>
    <p className="text-sm text-gray-500 text-center max-w-xs dark:text-gray-400">
      点击右上角的 + 按钮添加第一个密码，或者在网站登录后自动保存
    </p>
  </div>
);

const CredentialList = ({
  currentDomainCredentials,
  otherCredentials,
  currentDomain,
  onCopy,
  onFill,
  onEdit,
  onDelete
}) => {
  const totalCredentials = currentDomainCredentials.length + otherCredentials.length;

  if (totalCredentials === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin dark:bg-gray-900">
      <CredentialSection
        title={`当前网站 (${currentDomain})`}
        credentials={currentDomainCredentials}
        onCopy={onCopy}
        onFill={onFill}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <CredentialSection
        title="其他网站"
        credentials={otherCredentials}
        onCopy={onCopy}
        onFill={onFill}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* 统计信息 */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <p className="text-xs text-gray-500 text-center dark:text-gray-400">
          共 {totalCredentials} 个密码
        </p>
      </div>
    </div>
  );
};

export default CredentialList;
