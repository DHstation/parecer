import '../styles/globals.css';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MyApp({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout title={pageProps.title || 'Parecer'}>
        <Component {...pageProps} />
      </Layout>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default MyApp;
