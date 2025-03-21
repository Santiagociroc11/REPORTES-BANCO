import React, { useState, useEffect } from 'react';
import { Mail, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EmailConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailConfig({ isOpen, onClose }: EmailConfigProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [bankEmail, setBankEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchConfig();
    }
  }, [isOpen, user]);

  async function fetchConfig() {
    try {
      setLoading(true);
      setError('');

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('users')
        .select('email, bank_notification_email')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setEmail(data.email || '');
        setBankEmail(data.bank_notification_email || '');
      }
    } catch (error) {
      console.error('Error al cargar la configuración de correo:', error);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { error } = await supabase
        .from('users')
        .update({
          email,
          bank_notification_email: bankEmail
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          setError('Este correo de notificaciones bancarias ya está registrado');
          return;
        }
        throw error;
      }
      
      onClose();
    } catch (error) {
      console.error('Error al guardar la configuración de correo:', error);
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
                <Mail className="h-6 w-6 text-blue-400" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                  Configuración de Correo
                </h3>
                <div className="mt-4">
                  {loading ? (
                    <div className="flex justify-center">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                          Correo Principal
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="mt-1 block w-full rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                          placeholder="tu@correo.com"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="bank-email" className="block text-sm font-medium text-gray-300">
                          Correo de Notificaciones Bancarias
                        </label>
                        <input
                          type="email"
                          id="bank-email"
                          value={bankEmail}
                          onChange={(e) => setBankEmail(e.target.value)}
                          className="mt-1 block w-full rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
                          placeholder="notificaciones@tubanco.com"
                          required
                        />
                        <p className="mt-2 text-sm text-gray-400">
                          Este es el correo donde recibes las notificaciones de tu banco
                        </p>
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
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}