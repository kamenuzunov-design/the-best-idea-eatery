export const resizeImage = (file, maxSize = 800) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height *= maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width *= maxSize / height));
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type || 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          file.type || 'image/jpeg',
          0.85 // quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const getRecipeImageUrl = (recipe) => {
  if (!recipe) return '/images/recipe-placeholder.png';

  if (typeof recipe === 'string') return recipe;

  // Real original uploaded recipe photos from Firestore
  if (recipe.images?.main) return recipe.images.main;
  if (recipe.images?.extra1) return recipe.images.extra1;
  if (recipe.images?.extra2) return recipe.images.extra2;
  if (recipe.image_url) return recipe.image_url;
  if (recipe.imageUrl) return recipe.imageUrl;
  if (recipe.image) return recipe.image;
  if (recipe.cover_image) return recipe.cover_image;
  if (Array.isArray(recipe.photos) && recipe.photos.length > 0 && recipe.photos[0]) return recipe.photos[0];
  if (Array.isArray(recipe.images) && recipe.images.length > 0 && typeof recipe.images[0] === 'string') return recipe.images[0];
  if (recipe.media?.image_url) return recipe.media.image_url;
  if (recipe.media?.url) return recipe.media.url;

  // Project default placeholder when no media was uploaded from "Add Recipe"
  return '/images/recipe-placeholder.png';
};
