import { CustomCategory } from '../types';

export function buildCategoryHierarchy(categories: CustomCategory[]): CustomCategory[] {
  const categoryMap = new Map<string, CustomCategory>();
  const rootCategories: CustomCategory[] = [];

  // First pass: create map of all categories
  categories.forEach(category => {
    categoryMap.set(category.id, { ...category, subcategories: [] });
  });

  // Second pass: build hierarchy
  categories.forEach(category => {
    const currentCategory = categoryMap.get(category.id)!;
    
    if (category.parent_id && categoryMap.has(category.parent_id)) {
      const parentCategory = categoryMap.get(category.parent_id)!;
      parentCategory.subcategories = parentCategory.subcategories || [];
      parentCategory.subcategories.push(currentCategory);
    } else {
      rootCategories.push(currentCategory);
    }
  });

  return rootCategories;
}

export function getCategoryFullPath(category: CustomCategory, categories: CustomCategory[]): string {
  if (!category || !category.name) return 'Sin categoría';
  
  const parts: string[] = [category.name];
  let currentId = category.parent_id;

  while (currentId) {
    const parent = categories.find(c => c.id === currentId);
    if (parent) {
      parts.unshift(parent.name || 'Categoría');
      currentId = parent.parent_id;
    } else {
      break;
    }
  }

  return parts.join(' > ');
}