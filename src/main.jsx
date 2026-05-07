import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AppMediaEnhanced from './AppMediaEnhanced.jsx';
import CoverIntro from './components/CoverIntro.jsx';
import CraftingMaterialsPageSafe from './components/CraftingMaterialsPageSafe.jsx';
import AiRoutePage from './components/AiRoutePage.jsx';
import './styles.css';
import './styles/cover-intro.css';
import './styles/materials-page.css';
import './styles/layout-unify.css';

const TABS = [
  ['overview', '总览'],
  ['character', '角色'],
  ['ai', 'AI路线'],
  ['maps', '地图'],
  ['materials', '材料'],
];

function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash === 'materials' || hash === 'ai' ? hash : '';
}

function replaceHash(tab) {
  const nextUrl = tab === 'overview'
    ? `${window.location.pathname}${window.location.search}`
    : `${window.location.pathname}${window.location.search}#${tab}`;
  window.history.replaceState(null, '', nextUrl);
}

function GuidebookNav({ activeRoute, openTab }) {
  return (
    <nav className="top-tabs">
      {TABS.map(([id, name]) => (
        <button
          key={id}
          className={activeRoute === id ? 'top-tab active' : 'top-tab'}
          onClick={() => openTab(id)}
        >
          {name}
        </button>
      ))}
    </nav>
  );
}

function GuidebookRouter() {
  const [activeRoute, setActiveRoute] = useState(() => getRouteFromHash());

  useEffect(() => {
    const sync = () => setActiveRoute(getRouteFromHash());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const openTab = (tab) => {
    replaceHash(tab);
    setActiveRoute(tab === 'materials' || tab === 'ai' ? tab : '');
  };

  if (activeRoute === 'materials') {
    return (
      <main className="app-shell">
        <GuidebookNav activeRoute="materials" openTab={openTab} />
        <CraftingMaterialsPageSafe />
      </main>
    );
  }

  if (activeRoute === 'ai') {
    return (
      <main className="app-shell">
        <GuidebookNav activeRoute="ai" openTab={openTab} />
        <AiRoutePage />
      </main>
    );
  }

  return (
    <>
      <main className="app-shell" style={{ paddingBottom: 0 }}>
        <nav className="top-tabs" aria-label="AI guidebook shortcut">
          <button className="top-tab" onClick={() => openTab('ai')}>AI路线</button>
        </nav>
      </main>
      <div onClickCapture={(event) => {
        const button = event.target?.closest?.('button');
        const label = button?.textContent?.trim();
        if (label === '材料') {
          event.preventDefault();
          event.stopPropagation();
          openTab('materials');
        }
        if (label === 'AI路线') {
          event.preventDefault();
          event.stopPropagation();
          openTab('ai');
        }
      }}>
        <AppMediaEnhanced />
      </div>
    </>
  );
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
