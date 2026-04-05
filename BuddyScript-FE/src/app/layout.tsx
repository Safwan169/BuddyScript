import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/bootstrap.min.css';
import '../styles/common.css';
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
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
