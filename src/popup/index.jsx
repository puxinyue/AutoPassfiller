import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// 创建 React 应用根节点
const container = document.getElementById('root');
const root = createRoot(container);

// 渲染应用
root.render(<App />);
