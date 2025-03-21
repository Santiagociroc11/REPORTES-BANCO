import React, { useState } from 'react';
import { Plus, Tag as TagIcon, X } from 'lucide-react';
import { Tag } from '../../types';
import { supabase } from '../../lib/supabase';

interface TagManagerProps {
  tags: Tag[];
  onTagsChange: () => void;
}

export function TagManager({ tags, onTagsChange }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState('');

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('tags')
        .insert({ name: newTagName });

      if (insertError) throw insertError;

      setNewTagName('');
      onTagsChange();
    } catch (error) {
      console.error('Error al crear etiqueta:', error);
      setError('Error al crear la etiqueta');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAddTag} className="space-y-4">
        <div>
          <label htmlFor="tag-name" className="block text-sm font-medium text-gray-300 mb-1">
            Nombre de la Etiqueta
          </label>
          <input
            type="text"
            id="tag-name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
            placeholder="Nueva etiqueta"
            required
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-500 p-4 text-sm text-red-400">
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Etiqueta
        </button>
      </form>

      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-lg font-medium text-white mb-4">Etiquetas Existentes</h3>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-700 border border-gray-600"
            >
              <TagIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-200">{tag.name}</span>
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('tags')
                      .delete()
                      .eq('id', tag.id);

                    if (error) throw error;
                    onTagsChange();
                  } catch (error) {
                    console.error('Error al eliminar etiqueta:', error);
                    setError('Error al eliminar la etiqueta');
                  }
                }}
                className="text-red-400 hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}