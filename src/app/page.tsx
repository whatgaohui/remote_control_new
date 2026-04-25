'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRemoteStore } from '@/lib/store';
import ConnectionPage from '@/components/remote/ConnectionPage';
import MainLayout from '@/components/remote/MainLayout';
import { Zap, Wifi } from 'lucide-react';

function ConnectingOverlay() {
  const connectedDevice = useRemoteStore((s) => s.connectedDevice);

  return (
    <motion.div
      key="connecting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated radar icon */}
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-500/20"
            animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-500/10"
            animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 backdrop-blur-sm">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Wifi className="h-8 w-8 text-emerald-400" />
            </motion.div>
          </div>
        </div>

        {/* Connection text */}
        <div className="text-center">
          <motion.h2
            className="text-xl font-semibold text-white"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            正在连接...
          </motion.h2>
          {connectedDevice && (
            <p className="mt-2 text-sm text-slate-400">
              正在建立与 <span className="text-emerald-400">{connectedDevice.name}</span> 的安全连接
            </p>
          )}
        </div>

        {/* Progress steps */}
        <div className="flex flex-col gap-2 w-64">
          {[
            { label: '建立连接', delay: 0 },
            { label: '验证身份', delay: 0.5 },
            { label: '加密通道', delay: 1.0 },
          ].map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: step.delay, duration: 0.4 }}
              className="flex items-center gap-2 text-xs"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: step.delay + 0.2, duration: 0.3 }}
              >
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
              </motion.div>
              <span className="text-slate-300">{step.label}</span>
              <motion.span
                className="ml-auto text-emerald-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: step.delay + 0.3, duration: 0.3 }}
              >
                ✓
              </motion.span>
            </motion.div>
          ))}
        </div>

        {/* Spinning loader */}
        <motion.div
          className="mt-2 h-1 w-48 rounded-full bg-slate-800 overflow-hidden"
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '40%' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const isConnected = useRemoteStore((s) => s.isConnected);
  const isConnecting = useRemoteStore((s) => s.isConnecting);

  return (
    <AnimatePresence mode="wait">
      {isConnecting ? (
        <ConnectingOverlay />
      ) : isConnected ? (
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
