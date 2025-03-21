import React, { useState, useEffect } from 'react';
import { Settings, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getStoredUser } from '../lib/auth';

interface TelegramConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TelegramConfig {
  id: string;
  chat_id: string;
  enabled: boolean;
}

export function TelegramConfig({ isOpen, onClose }: TelegramConfigProps) {
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  async function fetchConfig() {
    try {
      setLoading(true);
      setError('');

      const user = getStoredUser();
      if (!user) {
        setError('Usuario no autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('telegram_config')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      
      // If configuration exists, use it
      if (data && data.length > 0) {
        const config = data[0];
        setConfig(config);
        setChatId(config.chat_id);
        setEnabled(config.enabled);
      } else {
        // Reset form if no configuration exists
        setConfig(null);
        setChatId('');
        setEnabled(true);
      }
    } catch (error) {
      console.error('Error al cargar la configuración de Telegram:', error);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      const user = getStoredUser();
      
      if (!user) {
        setError('Usuario no autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('telegram_config')
        .upsert({
          id: config?.id,
          user_id: user.id,
          chat_id: chatId,
          enabled
        })
        .select()
        .single();

      if (error) throw error;
      
      setConfig(data);
      onClose();
    } catch (error) {
      console.error('Error al guardar la configuración de Telegram:', error);
      setError('Error al guardar la configuración');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-900/30 sm:mx-0 sm:h-10 sm:w-10">
                <Settings className="h-6 w-6 text-blue-400" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                  Configuración de Telegram
                </h3>
                <div className="mt-4">
                  {loading ? (
                    <div className="flex justify-center">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="chat-id" className="block text-sm font-medium text-gray-300">
                          Chat ID de Telegram
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Send className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            name="chat-id"
                            id="chat-id"
                            className="block w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ingresa tu Chat ID"
                            value={chatId}
                            onChange={(e) => setChatId(e.target.value)}
                            required
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-400">
                          Para obtener tu Chat ID, inicia una conversación con @FinanceTrackerBot en Telegram.
                        </p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enabled"
                          checked={enabled}
                          onChange={(e) => setEnabled(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                        />
                        <label htmlFor="enabled" className="ml-2 block text-sm text-gray-300">
                          Habilitar notificaciones
                        </label>
                      </div>
                      {error && (
                        <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
                          {error}
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={handleSubmit}
            >
              Guardar
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}