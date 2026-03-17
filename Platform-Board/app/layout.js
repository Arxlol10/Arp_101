import './globals.css';
import NavbarClient from './components/NavbarClient';

export const metadata = {
  title: 'ARP_101 // CTF Platform',
  description: 'Capture The Flag — Scoreboard & Team Registration',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavbarClient>
          {children}
        </NavbarClient>
      </body>
    </html>
  );
}
