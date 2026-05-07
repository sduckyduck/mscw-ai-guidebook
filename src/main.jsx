import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AppMediaEnhanced from './AppMediaEnhanced.jsx';
import CoverIntro from './components/CoverIntro.jsx';
import CraftingMaterialsPageSafe from './components/CraftingMaterialsPageSafe.jsx';
import './styles.css';
import './styles/cover-intro.css';
import './styles/materials-page.css';
import './styles/layout-unify.css';

const TABS = [['overview', '总览'], ['character', '角色'], ['maps', '地图'], ['materials', '材料']];

function replaceHash(tab) {
  const nextUrl = tab === 'overview'
    ? `${window.location.pathname}${window.location.search}`
    : `${window.location.pathname}${window.location.search}#${tab}`;
  window.history.replaceState(null, '', nextUrl);
}

function GuidebookRouter() {
  const [materialsOpen, setMaterialsOpen] = useState(() => window.location.hash === '#materials');

  useEffect(() => {
    const sync = () => setMaterialsOpen(window.location.hash === '#materials');
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const openTab = (tab) => {
    replaceHash(tab);
    setMaterialsOpen(tab === 'materials');
  };

  if (materialsOpen) {
    return <main className="app-shell">
      <nav className="top-tabs">
        {TABS.map(([id, name]) => <button key={id} className={id === 'materials' ? 'top-tab active' : 'top-tab'} onClick={() => openTab(id)}>{name}</button>)}
      </nav>
      <CraftingMaterialsPageSafe />
    </main>;
  }

  return <div onClickCapture={(event) => {
    const button = event.target?.closest?.('button');
    if (button?.textContent?.trim() === '材料') {
      event.preventDefault();
      event.stopPropagation();
      openTab('materials');
    }
  }}>
    <AppMediaEnhanced />
  </div>;
}

function AppWithIntro() {
  const [entered, setEntered] = useState(false);
  return entered ? <GuidebookRouter /> : <CoverIntro onEnter={() => setEntered(true)} />;
}

const container = document.querySelector('#root');
const app = createRoot(container);

app.render(
  <React.StrictMode>
    <AppWithIntro />
  </React.StrictMode>,
);
