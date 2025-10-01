import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <Head>
      <title>Parecer - Sistema de Análise Jurídica</title>
      <meta name="description" content="Sistema de análise de documentos jurídicos com IA" />
    </Head>
  );
}
