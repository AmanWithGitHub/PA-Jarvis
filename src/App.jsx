import { useEffect, useRef, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, Plus, Trash2, UserRound, Settings2, Copy, Check, ArrowUp, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const suggestions = ['Tell me about Aman.', 'What projects has Aman worked on?', 'Ask me anything.'];
const storageKey = 'aman-jarvis-conversations-v1';

function readConversations() {
  try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
}

export default function App() {
  const [conversations, setConversations] = useState(readConversations);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  const active = conversations.find(item => item.id === activeId);
  const messages = active?.messages || [];
  const hasMessages = messages.length > 0;

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(conversations)); }, [conversations]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, busy]);
  useEffect(() => {
    const area = textareaRef.current;
    if (area) { area.style.height = 'auto'; area.style.height = `${Math.min(area.scrollHeight, 180)}px`; }
  }, [draft]);
  useEffect(() => {
    function focusComposerOnTyping(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]'))) return;
      const area = textareaRef.current;
      if (!area || area.disabled) return;

      event.preventDefault();
      area.focus();
      const start = area.selectionStart ?? area.value.length;
      const end = area.selectionEnd ?? start;
      setDraft(current => current.slice(0, start) + event.key + current.slice(end));
      requestAnimationFrame(() => area.setSelectionRange(start + event.key.length, start + event.key.length));
    }

    window.addEventListener('keydown', focusComposerOnTyping);
    return () => window.removeEventListener('keydown', focusComposerOnTyping);
  }, []);

  function newChat() { setActiveId(null); setDraft(''); setError(''); setDrawerOpen(false); textareaRef.current?.focus(); }

  async function sendMessage(raw = draft) {
    const message = raw.trim();
    if (!message || busy) return;
    const id = activeId || crypto.randomUUID();
    setActiveId(id); setDraft(''); setError(''); setBusy(true); setDrawerOpen(false);
    const userMessage = { role: 'user', content: message };
    setConversations(current => {
      const found = current.find(item => item.id === id);
      if (found) return current.map(item => item.id === id ? { ...item, updatedAt: Date.now(), messages: [...item.messages, userMessage] } : item);
      return [{ id, title: message.slice(0, 48), updatedAt: Date.now(), messages: [userMessage] }, ...current];
    });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5080'}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId: id })
      });
      if (!response.ok) throw new Error(response.status === 503 ? 'The assistant is temporarily unavailable. Please try again.' : 'Could not reach JARVIS. Check that the backend is running.');
      const data = await response.json();
      setConversations(current => current.map(item => item.id === id ? { ...item, id: data.conversationId || id, updatedAt: Date.now(), messages: [...item.messages, { role: 'assistant', content: data.message, mode: data.mode }] } : item));
      if (data.conversationId && data.conversationId !== id) setActiveId(data.conversationId);
    } catch (err) {
      setError(err.message || 'Could not reach JARVIS. Check that the backend is running.');
      setConversations(current => current.map(item => item.id === id ? { ...item, messages: [...item.messages, { role: 'assistant', content: 'I could not connect to the JARVIS API. Please make sure the backend is running and try again.', mode: 'fallback' }] } : item));
    } finally { setBusy(false); }
  }

  function clearConversation() {
    if (!activeId) return;
    setConversations(current => current.filter(item => item.id !== activeId)); setActiveId(null); setError(''); setDrawerOpen(false);
  }

  async function copyMessage(content, index) {
    try { await navigator.clipboard.writeText(content); setCopied(index); setTimeout(() => setCopied(null), 1500); } catch { setError('Clipboard access is unavailable in this browser.'); }
  }

  function submit(e) { e.preventDefault(); sendMessage(); }
  function handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  return <div className="app-shell">
    {drawerOpen && <button className="drawer-backdrop" aria-label="Close sidebar" onClick={() => setDrawerOpen(false)} />}
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${drawerOpen ? 'drawer-open' : ''}`}>
      <div className="sidebar-top">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); newChat(); }}><span className="brand-mark">J</span><span className="brand-label">JARVIS</span></a>
        <button className="icon-button desktop-collapse" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</button>
        <button className="icon-button mobile-close" title="Close sidebar" onClick={() => setDrawerOpen(false)}><X size={18}/></button>
      </div>
      <button className="new-chat" onClick={newChat}><Plus size={18}/><span>New chat</span></button>
      <div className="conversation-list">
        <div className="section-label">Recent conversations</div>
        {conversations.length === 0 ? <div className="empty-history">Your conversations<br/>will appear here.</div> : conversations.map(item => <button key={item.id} className={`history-item ${item.id === activeId ? 'selected' : ''}`} title={item.title} onClick={() => { setActiveId(item.id); setDrawerOpen(false); setError(''); }}><span>{item.title}</span></button>)}
      </div>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={clearConversation} disabled={!activeId}><Trash2 size={17}/><span>Clear conversation</span></button>
        <button className="nav-item" onClick={() => { setActiveId(null); sendMessage('Tell me about Aman.'); }}><UserRound size={17}/><span>About Aman</span></button>
        <button className="nav-item" onClick={() => setError('JARVIS uses the Groq API when configured. Without a key, it runs in demo mode.')}><Settings2 size={17}/><span>Settings</span></button>
        <div className="profile-chip"><span className="avatar">AS</span><div><strong>Aman Saini</strong><small>Personal assistant</small></div></div>
      </div>
    </aside>

    <main className="main-panel">
      <header className="topbar">
        <button className="icon-button mobile-menu" title="Open sidebar" onClick={() => setDrawerOpen(true)}><PanelLeftOpen size={19}/></button>
        <div className="topbar-brand"><span className="brand-mark small">J</span><span>JARVIS</span></div>
        <div className="identity"><span className="status-dot"/><span>Personal AI of Aman Saini</span></div>
      </header>

      <section className={`conversation ${hasMessages ? 'has-messages' : 'welcome-view'}`}>
        {!hasMessages ? <div className="welcome-content">
          <div className="welcome-monogram">J</div>
          <p className="eyebrow">A personal assistant</p>
          <h1>Hello, I’m JARVIS.</h1>
          <p className="welcome-subtitle">Your personal AI assistant, designed to represent<br className="desktop-break"/> and assist Aman Saini.</p>
          <div className="suggestions">{suggestions.map((suggestion, i) => <button key={suggestion} className="suggestion" onClick={() => sendMessage(suggestion)}><span className="suggestion-index">0{i + 1}</span><span>{suggestion}</span><ArrowUp className="suggestion-arrow" size={15}/></button>)}</div>
        </div> : <div className="message-list">{messages.map((message, i) => <article key={`${activeId}-${i}`} className={`message-row ${message.role}`}>
          <div className="message-content">
            {message.role === 'assistant' && <div className="assistant-label"><span className="brand-mark tiny">J</span><span>JARVIS</span>{message.mode && message.mode !== 'personal' && message.mode !== 'general' && <span className="mode-label">{message.mode}</span>}</div>}
            <div className="markdown-body">{message.role === 'assistant' ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown> : <p>{message.content}</p>}</div>
            {message.role === 'assistant' && <button className="copy-button" aria-label="Copy response" onClick={() => copyMessage(message.content, i)}>{copied === i ? <Check size={14}/> : <Copy size={14}/>}<span>{copied === i ? 'Copied' : 'Copy'}</span></button>}
          </div>
        </article>)}
          {busy && <div className="message-row assistant"><div className="message-content"><div className="assistant-label"><span className="brand-mark tiny">J</span><span>JARVIS</span></div><div className="typing"><i/><i/><i/></div></div></div>}
          <div ref={endRef}/>
        </div>}
      </section>

      <div className="composer-wrap">
        {error && <div className="notice" role="status">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={14}/></button></div>}
        <form className="composer" onSubmit={submit}>
          <textarea ref={textareaRef} rows="1" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={handleKeyDown} placeholder="Message JARVIS..." aria-label="Message JARVIS" disabled={busy}/>
          <button type="submit" className="send-button" disabled={!draft.trim() || busy} aria-label="Send message"><ArrowUp size={19}/></button>
        </form>
        <p className="composer-hint">JARVIS can make mistakes. Verify important information.</p>
      </div>
    </main>
  </div>;
}
