'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRemoteStore } from '@/lib/store';
import ConnectionPage from '@/components/remote/ConnectionPage';
import MainLayout from '@/components/remote/MainLayout';

export default function Home() {
  const isConnected = useRemoteStore((s) => s.isConnected);

  return (
    <AnimatePresence mode="wait">
      {isConnected ? (
        <motion.div
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MainLayout />
        </motion.div>
      ) : (
        <motion.div
          key="connection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ConnectionPage />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
