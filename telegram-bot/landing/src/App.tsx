import { ObsidianBackground } from './ObsidianBackground';
import { KofiButton } from './KofiButton';
import { ThemeSwitcher } from './ThemeSwitcher';
import './App.css';

const DEFAULT_PUBLICATION_WEBSITE_URL = 'https://dancingteeth.substack.com';

const publicationWebsiteUrl =
	import.meta.env.VITE_PUBLICATION_WEBSITE_URL?.trim() || DEFAULT_PUBLICATION_WEBSITE_URL;

function publicationWebsiteLabel(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return 'the publication';
	}
}

function App() {
  return (
    <>
      <ObsidianBackground />
      <div className="theme-switcher-wrap">
        <ThemeSwitcher />
      </div>
      <KofiButton />
      <main className="content-overlay">
        <div className="card card-hero">
          <h1>Obsidigram</h1>
          <p className="subtitle">Turn Obsidian into a headless CMS for multiple platforms.</p>
        </div>

        <div className="card card-intro">
          <p>Schedule and publish your notes from Obsidian to Telegram, X/Twitter, and more.</p>
          <p>
            <a href="/obsidigram-plugin.zip" className="plugin-download" download>
              Download Obsidigram plugin (ZIP)
            </a>{' '}
            — drop into your vault's <code>.obsidian/plugins/obsidigram/</code> and enable in Settings.
          </p>
          <p className="community-note">
            Submitting to Community Plugins soon. Found a bug? Send it my way — the plugin is ready for testing.
          </p>
          <p className="story">
            Built this for my own workflow — I publish{' '}
            <a href="https://t.me/thevacuumcleanergetssmart" target="_blank" rel="noopener noreferrer">
              The Vacuum Cleaner Gets Smart
            </a>
            , a Telegram channel on AI and tech, straight from Obsidian. Also at{' '}
            <a href={publicationWebsiteUrl} target="_blank" rel="noopener noreferrer">
              {publicationWebsiteLabel(publicationWebsiteUrl)}
            </a>
            .
          </p>
        </div>

        <div className="card card-video">
          <div className="video-wrapper">
            <iframe
              src="https://www.youtube.com/embed/mBc9yNb8XT8"
              title="Obsidigram demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
        <div className="card card-steps">
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
            <li>Tag notes with <code>#cms_ready</code> <code>#cms_unpublished</code>, pick a slot, schedule</li>
          </ol>
        </div>

        <section className="card card-features">
          <h2>✨ Features</h2>
          
          <div className="feature-group">
            <h3>📡 Multi-Platform Publishing</h3>
            <ul>
              <li><strong>Telegram</strong> — Always available, native HTML formatting</li>
              <li><strong>X/Twitter</strong> — BYOK credentials, plan-aware char limits (280 / 25k), AI-powered shortening</li>
              <li><strong>Facebook</strong> — Post to Pages (coming soon)</li>
              <li><strong>Threads</strong> — Meta's text platform (coming soon)</li>
            </ul>
          </div>

          <div className="feature-group">
            <h3>📅 Smart Scheduling</h3>
            <ul>
              <li>Visual calendar with time slots</li>
              <li>Quick timer — "Post in X minutes"</li>
              <li>Publish immediately or schedule for later</li>
              <li>Per-platform scheduling with <code>#tw_unpublished</code>, <code>#fb_unpublished</code>, etc.</li>
              <li>Category-based organization with color badges</li>
            </ul>
          </div>

          <div className="feature-group">
            <h3>🤖 AI-Powered (BYOK)</h3>
            <ul>
              <li><strong>Proofreading</strong> — Grammar and clarity improvements</li>
              <li><strong>Translation</strong> — Multi-language support (EN, RU, ES)</li>
              <li><strong>Smart Shortening</strong> — Auto-fit content to X/Twitter char limits</li>
              <li>Multiple providers: Gemini, Groq, Mistral</li>
              <li>Bring Your Own Key — your data, your API</li>
            </ul>
          </div>

          <div className="feature-group">
            <h3>🔐 Privacy & Control</h3>
            <ul>
              <li>BYOK for X/Twitter — credentials stay in your vault</li>
              <li>Multi-tenant — each channel has isolated scheduling</li>
            </ul>
          </div>

          <div className="feature-group coming-soon">
            <h3>🚧 Coming Soon</h3>
            <ul>
              <li>Meta channels (Facebook Pages, Threads)</li>
              <li>LinkedIn publishing</li>
              <li>Bluesky integration</li>
              <li>RSS feed generation</li>
            </ul>
          </div>
        </section>

        <div className="card support-section">
          <p>
            ☕ Enjoying Obsidigram? <a href="https://ko-fi.com/dancingteeth" target="_blank" rel="noopener noreferrer" className="support-link">Support the project on Ko-fi</a>
          </p>
        </div>

        <footer className="card card-footer">
          dancingteeth · MIT · v{__OBSIDIGRAM_LANDING_VERSION__}
        </footer>
      </main>
    </>
  );
}

export default App;
