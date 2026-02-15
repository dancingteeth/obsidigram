import { ObsidianBackground } from './ObsidianBackground';
import './App.css';

function App() {
  return (
    <>
      <header className="hero">
        <ObsidianBackground />
        <div className="hero-content">
          <h1>Obsidigram</h1>
          <p className="subtitle">Turn Obsidian into a headless CMS for Telegram.</p>
        </div>
      </header>
      <main className="content">
        <p>Schedule and publish your notes from Obsidian to Telegram.</p>
        <div className="steps">
          <strong>Quick start</strong>
          <ol>
            <li>
              <a href="https://t.me/obsidigram_cms_bot" className="bot-link">
                Open @obsidigram_cms_bot
              </a>{' '}
              in Telegram
            </li>
            <li>Forward a message from your channel, add the bot as admin, send /verify</li>
            <li>Copy your API key into Obsidian → Settings → Obsidigram</li>
            <li>Tag notes with #tg_ready #tg_unpublished, pick a slot, schedule</li>
          </ol>
        </div>
        <div className="video-wrapper">
          <iframe
            src="https://www.youtube.com/embed/mBc9yNb8XT8"
            title="Obsidigram demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="support">
          <a href="https://ko-fi.com/dancingteeth">Enjoying the plugin? Support me!</a>
        </p>
        <footer>dancingteeth · MIT</footer>
      </main>
    </>
  );
}

export default App;
