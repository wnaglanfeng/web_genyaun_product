import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import products from './data/products.js'
import './App.css'

// 判断 icon 是否是图片（URL 或本地路径，排除 emoji 和纯文本）
function isImageUrl(icon) {
  if (!icon) return false
  if (icon.startsWith('http://') || icon.startsWith('https://')) return true
  // 本地图片路径（以 / 开头，且包含图片扩展名）
  if (icon.startsWith('/') && /\.(png|jpg|jpeg|gif|svg|webp|ico)(\?.*)?$/i.test(icon)) return true
  return false
}

// 产品图标组件
function ProductIcon({ product, size = 36 }) {
  if (isImageUrl(product.icon)) {
    return <img src={product.icon} alt={product.name} className="icon-img" style={{ width: size, height: size }} />
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill={product.color} fillOpacity="0.2" />
      <text x="20" y="28" textAnchor="middle" fontSize={size * 0.55} fill={product.color} opacity="0.5">◆</text>
    </svg>
  )
}

function App() {
  const [selectedId, setSelectedId] = useState(products[0].id)
  const selectedProduct = products.find(p => p.id === selectedId)

  return (
    <div className="app">
      <Helmet>
        <title>{selectedProduct.name} - 河北亘元网络科技</title>
        <meta name="description" content={selectedProduct.subtitle} />
        <meta name="keywords" content={`${selectedProduct.name},${selectedProduct.category},亘元网络,河北亘元`} />
      </Helmet>

      {/* 顶部栏 */}
      <header className="topbar">
        <div className="topbar-logo">
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <defs>
              <linearGradient id="brand-grad" x1="0" y1="0" x2="34" y2="34">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="50%" stopColor="#8b5cf6"/>
                <stop offset="100%" stopColor="#a78bfa"/>
              </linearGradient>
              <filter id="brand-glow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <rect width="34" height="34" rx="9" fill="url(#brand-grad)" filter="url(#brand-glow)"/>
            <circle cx="10" cy="17" r="2.2" fill="#fff" opacity="0.9"/>
            <circle cx="17" cy="17" r="2.2" fill="#fff" opacity="0.9"/>
            <circle cx="24" cy="17" r="2.2" fill="#fff" opacity="0.9"/>
            <path d="M9.5 22.5l3.5-3.5 3 3 8.5-8.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0"/>
          </svg>
        </div>
        <div className="topbar-brand-group">
          <span className="topbar-brand">河北亘元网络科技</span>
          <span className="topbar-sub">Hebei Genyuan Network Technology Co., Ltd.</span>
        </div>
        <span className="topbar-tag">产品中心</span>
        <div className="topbar-actions">
          <span className="topbar-dot" />
        </div>
      </header>

      {/* 满屏内容区 */}
      <div className="main-area">
        {/* 左侧网格 */}
        <div className="left-panel">
          <div className="products-grid">
            {products.map((product) => (
              <div
                key={product.id}
                className={`product-card ${selectedId === product.id ? 'active' : ''}`}
                onClick={() => setSelectedId(product.id)}
              >
                <ProductIcon product={product} size={56} />
                <div className="card-info">
                  <h3>{product.name}</h3>
                  <span>{product.category}</span>
                </div>
              </div>
            ))}
            {/* 填充空位，保持网格整齐 */}
            {products.length % 3 !== 0 && Array.from({ length: 3 - (products.length % 3) }).map((_, i) => (
              <div key={`empty-${i}`} className="grid-empty" />
            ))}
          </div>
        </div>

        {/* 右侧详情 */}
        <div className="right-panel">
          <div className="detail-scroll">
            {/* 移动端产品网格 */}
            <div className="mobile-grid">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`mobile-card ${selectedId === product.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(product.id)}
                >
                  <div className="mobile-card-icon" style={{ background: isImageUrl(product.icon) ? 'transparent' : `${product.color}12`, borderColor: isImageUrl(product.icon) ? 'transparent' : `${product.color}30` }}>
                    <ProductIcon product={product} size={36} />
                  </div>
                  <span>{product.name}</span>
                </div>
              ))}
            </div>

            <div className="detail-hero" style={{ background: `linear-gradient(135deg, ${selectedProduct.color}06, ${selectedProduct.color}15)` }}>
              <div className="detail-app-icon" style={{ background: isImageUrl(selectedProduct.icon) ? 'transparent' : `${selectedProduct.color}12` }}>
                <ProductIcon product={selectedProduct} size={96} />
              </div>
              <span className="detail-category">{selectedProduct.category}</span>
              <h2>{selectedProduct.name}</h2>
              <p className="detail-subtitle">{selectedProduct.subtitle}</p>
            </div>

            <div className="detail-body">
              <div className="detail-block">
                <h4>产品介绍</h4>
                <p>{selectedProduct.description}</p>
              </div>

              <div className="detail-block">
                <h4>功能描述</h4>
                <div className="feature-list">
                  {selectedProduct.features.map((f, i) => (
                    <div key={i} className="feature-item">
                      <h5 className="feature-title">{f.title}</h5>
                      <p className="feature-desc">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-block">
                <h4>支持平台</h4>
                <div className="platform-tags">
                  {selectedProduct.platforms.map(p => (
                    <span key={p} className="platform-tag">{p}</span>
                  ))}
                </div>
              </div>

              <div className="detail-block">
                <h4>下载</h4>
                <div className="download-list">
                  {selectedProduct.downloads.map((dl, i) => (
                    <a key={i} href={dl.url} className="download-item">
                      <span>{dl.label}</span>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8l4-4M8 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部 */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span>河北亘元网络科技有限公司</span>
          </div>
          <div className="footer-info">
            <span>冀ICP备2022012649号-2</span>
            <span className="footer-sep">|</span>
            <span>Copyright © {new Date().getFullYear()} Genyuan Network. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
