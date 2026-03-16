import './globals.css';

export const metadata = {
  title: 'ARP_101 // CTF Platform',
  description: 'Capture The Flag — Scoreboard & Team Registration',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <a href="/" className="navbar__brand">
            <span className="navbar__logo">ARP_101</span>
            <span className="navbar__tag">CTF</span>
          </a>
          <ul className="navbar__links">
            <li><a href="/" className="navbar__link">Scoreboard</a></li>
            <li><a href="/register" className="navbar__link">Register</a></li>
            <li><a href="/submit" className="navbar__link">Submit Flag</a></li>
          </ul>
        </nav>
        {children}
      </body>
    </html>
  );
}
