'use client';

import { useState } from 'react';

interface WalletButtonProps {
  onConnect: (wallet: string) => void;
}

export default function WalletButton({ onConnect }: WalletButtonProps) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).solana) {
        const resp = await (window as any).solana.connect();
        const publicKey = resp.publicKey.toString();
        setAddress(publicKey);
        setConnected(true);
        onConnect(publicKey);
      } else {
        alert('Please install a Solana wallet like Phantom or Backpack');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  const handleDisconnect = () => {
    if (typeof window !== 'undefined' && (window as any).solana) {
      (window as any).solana.disconnect();
    }
    setConnected(false);
    setAddress(null);
    onConnect('');
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <button
      onClick={connected ? handleDisconnect : handleConnect}
      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-yellow-500 rounded-lg font-semibold hover:opacity-90 transition-opacity"
    >
      {connected && address ? formatAddress(address) : 'Connect Wallet'}
    </button>
  );
}