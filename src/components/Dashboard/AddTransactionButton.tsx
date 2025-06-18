import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { AddTransactionModal } from './AddTransactionModal';
import { CustomCategory, Tag } from '../../types';
import { supabase } from '../../lib/supabase';
import { getStoredUser } from '../../lib/auth';

interface AddTransactionButtonProps {
  onTransactionAdded?: () => void;
}

export function AddTransactionButton({ onTransactionAdded }: AddTransactionButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar categorías y tags cuando se abre el modal
  useEffect(() => {
    if (isModalOpen) {
      fetchCategories();
      fetchTags();
    }
  }, [isModalOpen]);

  const fetchCategories = async () => {
    try {
      const user = getStoredUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const user = getStoredUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error al cargar tags:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleTransactionSuccess = () => {
    setIsModalOpen(false);
    if (onTransactionAdded) {
      onTransactionAdded();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40 group"
        title="Agregar nueva transacción"
      >
        <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-200" />
      </button>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleTransactionSuccess}
        categories={categories}
        tags={tags}
        refreshCategories={fetchCategories}
        refreshTags={fetchTags}
      />
    </>
  );
}