import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/bootstrap.min.css';
import '../styles/main.css';
import '../styles/responsive.css';

import Providers from '@/providers/RootProviders';
import { defaultSEO } from '@/config/seoConfig';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar/Navbar';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata = {
  title: defaultSEO.title,
  description: defaultSEO.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ThemeProvider>
            <Navbar />
            <Toaster />
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
