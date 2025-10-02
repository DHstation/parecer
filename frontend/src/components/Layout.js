import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Head from 'next/head';

export default function Layout({ children, title = 'Parecer' }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && router.pathname !== '/login') {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Páginas que não devem ter o layout (login, etc)
  const noLayoutPages = ['/login', '/'];

  if (noLayoutPages.includes(router.pathname) || !isAuthenticated) {
    return (
      <>
        <Head>
          <title>{title}</title>
        </Head>
        {children}
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 ml-64 overflow-auto">
          {children}
        </div>
      </div>
    </>
  );
}
