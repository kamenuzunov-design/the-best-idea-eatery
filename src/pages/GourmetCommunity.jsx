import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import { resizeImage, getRecipeImageUrl } from '../lib/imageUtils';
import { getLocalizedField } from '../lib/localeUtils';
import { DEFAULT_COMMUNITY_POSTS, DEFAULT_COMMUNITY_OWNER_EMAIL } from '../data/defaultCommunityPosts';
import {
  saveCommunityPosts,
  translatePostTo5Languages,
  translateTextOnDemand
} from '../lib/communityUtils';

const BADGE_OPTIONS = [
  { id: 'masterpiece', icon: 'workspace_premium', color: 'from-primary to-[#b8860b] text-background-dark' },
  { id: 'homemade', icon: 'home_iot_device', color: 'from-emerald-500 to-teal-600 text-white' },
  { id: 'quick', icon: 'bolt', color: 'from-sky-500 to-indigo-600 text-white' },
  { id: 'custom', icon: 'auto_fix_high', color: 'from-purple-500 to-fuchsia-600 text-white' },
  { id: 'new_recipe', icon: 'new_releases', color: 'from-amber-400 to-orange-500 text-background-dark' }
];

const LANG_FLAGS = {
  bg: 'BG',
  en: 'EN',
  it: 'IT',
  fr: 'FR',
  de: 'DE'
};

const CYRILLIC_TO_LATIN_INITIAL = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ж: 'Z', З: 'Z',
  И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P',
  Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'C',
  Ш: 'S', Щ: 'S', Ъ: 'A', Ь: 'Y', Ю: 'Y', Я: 'Y'
};

/**
 * Always returns an uppercase Latin letter (A-Z) for avatar fallbacks.
 */
function getLatinInitial(name = '', email = '') {
  const candidates = `${name || ''} ${email || ''}`.trim();
  for (const ch of candidates) {
    const upper = ch.toUpperCase();
    if (/^[A-Z]$/.test(upper)) return upper;
    if (CYRILLIC_TO_LATIN_INITIAL[upper]) return CYRILLIC_TO_LATIN_INITIAL[upper];
  }
  return 'C';
}

function extractUserProfile(u, currentLang = 'bg') {
  if (!u) return null;
  const email = (u.auth?.email || u.email || '').trim();
  const name =
    u.profile?.nickname ||
    u.name ||
    u.displayName ||
    (email ? email.split('@')[0] : 'Chef');
  const avatar = u.profile?.avatar || u.photoURL || u.avatar || '';
  const score = Number(u.reputation?.score) || 0;
  const loc = u.profile?.location;
  const isLocationPublic = Boolean(loc && loc.show_location !== false);
  const city = isLocationPublic
    ? (getLocalizedField(loc, 'city', currentLang) || loc?.city_bg || loc?.city_en || (typeof loc?.city === 'string' ? loc.city : '') || '')
    : '';
  const country = isLocationPublic
    ? (getLocalizedField(loc, 'country', currentLang) || loc?.country_bg || loc?.country_en || (typeof loc?.country === 'string' ? loc.country : '') || '')
    : '';
  const location = isLocationPublic
    ? [city, country].filter(Boolean).join(', ')
    : '';
  return {
    id: u.id,
    email,
    name,
    avatar,
    score,
    location
  };
}

const GourmetCommunity = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { user, isAdmin, isOwner, awardPoints } = useAuth();

  const currentLang = ['bg', 'en', 'it', 'fr', 'de'].includes(i18n.language) ? i18n.language : 'bg';
  const isGuest = !user || user.role === ROLES.GUEST;
  const currentUserId = user?.uid || '';
  const isModeratorOrPower = isAdmin || isOwner || user?.role === ROLES.MODERATOR;

  const [posts, setPosts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTopChefsExpanded, setIsTopChefsExpanded] = useState(false);
  const [showAllChefs, setShowAllChefs] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'new_recipes' | 'top_liked' | 'mine'
  const [selectedChefId, setSelectedChefId] = useState(null);

  // Post Interactions State
  const [openCommentsMap, setOpenCommentsMap] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [showOriginalPostMap, setShowOriginalPostMap] = useState({});
  const [translatingPostId, setTranslatingPostId] = useState(null);
  const [showOriginalCommentMap, setShowOriginalCommentMap] = useState({});
  const [translatingCommentKey, setTranslatingCommentKey] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  // Share / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formRecipeId, setFormRecipeId] = useState('');
  const [formRecipeSearch, setFormRecipeSearch] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formBadge, setFormBadge] = useState('masterpiece');
  const [formLocation, setFormLocation] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImageFile, setFormImageFile] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef(null);
  const migratedSamplePostsRef = useRef(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Load Community Feed from campaigns/community_feed
  useEffect(() => {
    const unsubFeed = onSnapshot(
      doc(db, 'campaigns', 'community_feed'),
      async (snap) => {
        if (snap.exists() && Array.isArray(snap.data()?.posts) && snap.data().posts.length > 0) {
          setPosts(snap.data().posts);
          setLoading(false);
        } else {
          setPosts(DEFAULT_COMMUNITY_POSTS);
          setLoading(false);
          try {
            await saveCommunityPosts(DEFAULT_COMMUNITY_POSTS);
          } catch {
            // ignore initial seed error if offline
          }
        }
      },
      () => {
        setPosts(DEFAULT_COMMUNITY_POSTS);
        setLoading(false);
      }
    );

    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => r.is_active !== false && !r.is_deleted);
      setRecipes(list);
    });

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsersList(list);
      },
      () => {}
    );

    return () => {
      unsubFeed();
      unsubRecipes();
      unsubUsers();
    };
  }, []);

  // Automatically attach sample posts to kamen.uzunov@gmail.com once usersList & posts are loaded
  useEffect(() => {
    if (migratedSamplePostsRef.current || usersList.length === 0 || posts.length === 0) return;

    const ownerDoc = usersList.find(
      u => (u.auth?.email || u.email || '').trim().toLowerCase() === DEFAULT_COMMUNITY_OWNER_EMAIL
    );
    if (!ownerDoc) return;

    const ownerInfo = extractUserProfile(ownerDoc, currentLang);
    let needsSave = false;

    const updatedPosts = posts.map(p => {
      const isSamplePost =
        p.id === 'post_default_wagyu_steak' ||
        p.id === 'post_default_shopska_modern' ||
        p.authorId === 'chef_sophia_rossi' ||
        p.authorId === 'chef_dimitar_petrov' ||
        p.authorId === DEFAULT_COMMUNITY_OWNER_EMAIL ||
        (p.authorEmail && p.authorEmail.toLowerCase() === DEFAULT_COMMUNITY_OWNER_EMAIL);

      if (!isSamplePost) return p;

      const cleanLikes = (Array.isArray(p.likes) ? p.likes : []).filter(
        uid => !String(uid).startsWith('chef_')
      );
      const cleanComments = (Array.isArray(p.comments) ? p.comments : []).filter(
        c => !String(c.userId || '').startsWith('chef_')
      );

      const bgTitle = p.translations?.bg?.title || p.title;
      const bgCaption = p.translations?.bg?.caption || p.caption;

      if (
        p.authorId !== ownerInfo.id ||
        p.authorName !== ownerInfo.name ||
        p.authorAvatar !== ownerInfo.avatar ||
        p.authorLocation !== ownerInfo.location ||
        cleanLikes.length !== (p.likes?.length || 0) ||
        cleanComments.length !== (p.comments?.length || 0)
      ) {
        needsSave = true;
        return {
          ...p,
          authorId: ownerInfo.id,
          authorEmail: ownerInfo.email,
          authorName: ownerInfo.name,
          authorAvatar: ownerInfo.avatar,
          authorLocation: ownerInfo.location,
          lang: 'bg',
          title: bgTitle,
          caption: bgCaption,
          likes: cleanLikes,
          comments: cleanComments
        };
      }
      return p;
    });

    migratedSamplePostsRef.current = true;
    if (needsSave) {
      saveCommunityPosts(updatedPosts).catch(() => {});
    }
  }, [usersList, posts, currentLang]);

  // Load current user's saved_recipes
  useEffect(() => {
    if (!currentUserId || isGuest) {
      return;
    }
    const unsubUser = onSnapshot(doc(db, 'users', currentUserId), (snap) => {
      if (snap.exists()) {
        setSavedIds(snap.data().saved_recipes || []);
      }
    });
    return () => unsubUser();
  }, [currentUserId, isGuest]);

  // Handle ?shareRecipe=... from OrderHistory (/orders) or RecipeDetail
  useEffect(() => {
    const shareRecipeId = searchParams.get('shareRecipe');
    if (shareRecipeId && recipes.length > 0 && !isGuest) {
      const targetRec = recipes.find(r => r.id === shareRecipeId || r.slug === shareRecipeId);
      const noteParam = searchParams.get('note') || '';
      const ratingParam = parseInt(searchParams.get('rating')) || 5;

      const timer = setTimeout(() => {
        setEditingPostId(null);
        setFormRecipeId(targetRec ? (targetRec.slug || targetRec.id) : shareRecipeId);
        setFormTitle(targetRec ? getLocalizedField(targetRec, 'title', currentLang) : '');
        setFormCaption(noteParam);
        setFormRating(Math.min(5, Math.max(1, ratingParam)));
        setFormBadge('homemade');
        setFormImageUrl(targetRec ? getRecipeImageUrl(targetRec) : '');
        setFormImageFile(null);
        setIsModalOpen(true);

        // Clear URL params so refresh doesn't re-trigger
        setSearchParams({}, { replace: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, recipes, isGuest, currentLang, setSearchParams]);

  // Lookup map of real users by id and email
  const usersByIdOrEmail = useMemo(() => {
    const map = new Map();
    usersList.forEach(u => {
      const info = extractUserProfile(u, currentLang);
      if (!info) return;
      map.set(u.id, info);
      if (info.email) {
        map.set(info.email.toLowerCase(), info);
      }
    });
    return map;
  }, [usersList, currentLang]);

  // Build Real Top Chefs list strictly from real active users in Firestore
  const topChefs = useMemo(() => {
    const postCountByUser = {};
    posts.forEach(p => {
      const matched =
        usersByIdOrEmail.get(p.authorId) ||
        (p.authorEmail && usersByIdOrEmail.get(p.authorEmail.toLowerCase()));
      const key = matched ? matched.id : p.authorId;
      if (key) {
        postCountByUser[key] = (postCountByUser[key] || 0) + 1;
      }
    });

    const realChefs = usersList
      .filter(u => {
        const uRole = u.status?.level || u.role || ROLES.USER;
        return u.status?.is_active !== false && u.status?.is_deleted !== true && uRole !== ROLES.OWNER;
      })
      .map(u => {
        const info = extractUserProfile(u, currentLang);
        const postsCount = postCountByUser[u.id] || 0;
        return {
          ...info,
          postsCount,
          initial: getLatinInitial(info.name, info.email)
        };
      });

    return realChefs.sort(
      (a, b) => (b.score + b.postsCount * 10) - (a.score + a.postsCount * 10)
    );
  }, [usersList, posts, usersByIdOrEmail, currentLang]);

  const displayedChefs = showAllChefs ? topChefs : topChefs.slice(0, 6);

  // Filtered & sorted posts
  const filteredPosts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    let list = posts.filter(post => {
      const resolvedAuthor =
        usersByIdOrEmail.get(post.authorId) ||
        (post.authorEmail && usersByIdOrEmail.get(post.authorEmail.toLowerCase()));
      const effectiveAuthorId = resolvedAuthor ? resolvedAuthor.id : post.authorId;

      if (selectedChefId && effectiveAuthorId !== selectedChefId) return false;

      if (activeFilter === 'new_recipes') {
        if (post.postType !== 'new_recipe' && post.badge !== 'new_recipe' && !post.recipeId) return false;
      } else if (activeFilter === 'mine') {
        if (!currentUserId || effectiveAuthorId !== currentUserId) return false;
      }

      if (q) {
        const localizedTitle = (post.translations?.[currentLang]?.title || post.title || '').toLowerCase();
        const localizedCaption = (post.translations?.[currentLang]?.caption || post.caption || '').toLowerCase();
        const author = (resolvedAuthor?.name || post.authorName || '').toLowerCase();
        const recTitle = (post.recipeTitle?.[currentLang] || post.recipeTitle?.bg || post.recipeTitle?.en || '').toLowerCase();
        return (
          localizedTitle.includes(q) ||
          localizedCaption.includes(q) ||
          author.includes(q) ||
          recTitle.includes(q)
        );
      }
      return true;
    });

    if (activeFilter === 'top_liked') {
      list = [...list].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else {
      list = [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return list;
  }, [posts, searchTerm, activeFilter, selectedChefId, currentLang, currentUserId, usersByIdOrEmail]);

  // Recipes matching modal search
  const filteredModalRecipes = useMemo(() => {
    const q = formRecipeSearch.trim().toLowerCase();
    if (!q) return recipes.slice(0, 20);
    return recipes
      .filter(r => {
        const tLoc = getLocalizedField(r, 'title', currentLang).toLowerCase();
        const tBg = (r.title?.bg || r.title_bg || '').toLowerCase();
        const tEn = (r.title?.en || r.title_en || '').toLowerCase();
        return tLoc.includes(q) || tBg.includes(q) || tEn.includes(q);
      })
      .slice(0, 25);
  }, [recipes, formRecipeSearch, currentLang]);

  const handleOpenCreateModal = () => {
    if (isGuest) {
      navigate('/login');
      return;
    }
    const myInfo = usersByIdOrEmail.get(currentUserId);
    setEditingPostId(null);
    setFormTitle('');
    setFormCaption('');
    setFormRecipeId('');
    setFormRecipeSearch('');
    setFormRating(5);
    setFormBadge('masterpiece');
    setFormLocation(myInfo?.location || '');
    setFormImageUrl('');
    setFormImageFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post) => {
    setEditingPostId(post.id);
    setFormTitle(post.translations?.[currentLang]?.title || post.title || '');
    setFormCaption(post.translations?.[currentLang]?.caption || post.caption || '');
    setFormRecipeId(post.recipeId || '');
    setFormRecipeSearch('');
    setFormRating(post.rating || 5);
    setFormBadge(post.badge || 'masterpiece');
    setFormLocation(post.authorLocation || '');
    setFormImageUrl(post.image || '');
    setFormImageFile(null);
    setIsModalOpen(true);
  };

  const handleSelectRecipeInModal = (recipeId) => {
    setFormRecipeId(recipeId);
    const rec = recipes.find(r => r.id === recipeId || r.slug === recipeId);
    if (rec) {
      if (!formTitle.trim()) {
        setFormTitle(getLocalizedField(rec, 'title', currentLang));
      }
      if (!formImageUrl && !formImageFile) {
        setFormImageUrl(getRecipeImageUrl(rec));
      }
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setFormImageUrl(previewUrl);
  };

  const handlePublishPost = async (e) => {
    e.preventDefault();
    if (isGuest) {
      navigate('/login');
      return;
    }
    if (!formTitle.trim() && !formCaption.trim()) {
      alert(t('gourmet_community.fill_required', 'Моля, въведете заглавие или отзив за ястието.'));
      return;
    }

    setIsPublishing(true);
    try {
      let finalImageUrl = formImageUrl;
      const linkedRecipe = recipes.find(r => r.id === formRecipeId || r.slug === formRecipeId);

      if (formImageFile) {
        const resizedBlob = await resizeImage(formImageFile, 1080, 1080);
        try {
          const fileName = `community_${user.uid}_${Date.now()}.jpg`;
          const storageRef = ref(storage, `community/${fileName}`);
          await uploadBytes(storageRef, resizedBlob);
          finalImageUrl = await getDownloadURL(storageRef);
        } catch {
          finalImageUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(resizedBlob);
          });
        }
      } else if (!finalImageUrl && linkedRecipe) {
        finalImageUrl = getRecipeImageUrl(linkedRecipe);
      } else if (!finalImageUrl) {
        finalImageUrl = '/images/recipe-placeholder.png';
      }

      const translations = await translatePostTo5Languages({
        title: formTitle.trim(),
        caption: formCaption.trim(),
        sourceLang: currentLang
      });

      const recipeTitleMap = linkedRecipe
        ? {
            bg: linkedRecipe.title?.bg || linkedRecipe.title_bg || '',
            en: linkedRecipe.title?.en || linkedRecipe.title_en || '',
            it: linkedRecipe.title?.it || linkedRecipe.title_it || '',
            fr: linkedRecipe.title?.fr || linkedRecipe.title_fr || '',
            de: linkedRecipe.title?.de || linkedRecipe.title_de || ''
          }
        : null;

      const myProfile = usersByIdOrEmail.get(user.uid);
      const authorName =
        myProfile?.name ||
        user.profile?.nickname ||
        user.displayName ||
        (user.email ? user.email.split('@')[0] : 'Chef');
      const authorAvatar = myProfile?.avatar || user.profile?.avatar || user.photoURL || '';

      let nextPosts;
      let targetSavedPost;

      if (editingPostId) {
        nextPosts = posts.map(p => {
          if (p.id !== editingPostId) return p;
          targetSavedPost = {
            ...p,
            title: formTitle.trim(),
            caption: formCaption.trim(),
            lang: currentLang,
            translations: {
              ...(p.translations || {}),
              ...translations
            },
            recipeId: linkedRecipe ? (linkedRecipe.slug || linkedRecipe.id) : formRecipeId,
            recipeTitle: recipeTitleMap || p.recipeTitle || null,
            rating: Number(formRating) || 5,
            badge: formBadge,
            authorLocation: formLocation.trim(),
            image: finalImageUrl,
            updatedAt: new Date().toISOString()
          };
          return targetSavedPost;
        });
      } else {
        targetSavedPost = {
          id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          postType: 'cooked_dish',
          authorId: user.uid,
          authorEmail: user.email || '',
          authorName,
          authorAvatar,
          authorLocation: formLocation.trim(),
          lang: currentLang,
          recipeId: linkedRecipe ? (linkedRecipe.slug || linkedRecipe.id) : formRecipeId,
          recipeTitle: recipeTitleMap,
          title: formTitle.trim(),
          caption: formCaption.trim(),
          translations,
          image: finalImageUrl,
          rating: Number(formRating) || 5,
          badge: formBadge,
          likes: [],
          comments: [],
          createdAt: new Date().toISOString()
        };
        nextPosts = [targetSavedPost, ...posts];
      }

      setPosts(nextPosts);
      await saveCommunityPosts(nextPosts, targetSavedPost);

      if (!editingPostId && awardPoints && user?.uid) {
        try {
          await awardPoints(user.uid, 10);
        } catch {
          // ignore
        }
      }

      setIsModalOpen(false);
      showToast(
        editingPostId
          ? t('gourmet_community.post_updated', 'Публикацията е обновена!')
          : t('gourmet_community.post_published_xp', 'Публикацията е споделена! (+10 XP)')
      );
    } catch (err) {
      console.error('Error publishing community post:', err);
      alert(t('gourmet_community.error_publishing', 'Възникна грешка при публикуване.'));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeletePost = async (post) => {
    if (!window.confirm(t('gourmet_community.confirm_delete_post', 'Сигурни ли сте, че искате да изтриете тази публикация?'))) {
      return;
    }
    const nextPosts = posts.filter(p => p.id !== post.id);
    setPosts(nextPosts);
    await saveCommunityPosts(nextPosts);
    showToast(t('gourmet_community.post_deleted', 'Публикацията беше изтрита.'));
  };

  const handleToggleLike = async (post) => {
    if (isGuest) {
      navigate('/login');
      return;
    }
    const currentLikes = Array.isArray(post.likes) ? post.likes : [];
    const hasLiked = currentLikes.includes(user.uid);
    const updatedLikes = hasLiked
      ? currentLikes.filter(id => id !== user.uid)
      : [...currentLikes, user.uid];

    let updatedPost = null;
    const nextPosts = posts.map(p => {
      if (p.id !== post.id) return p;
      updatedPost = { ...p, likes: updatedLikes };
      return updatedPost;
    });

    setPosts(nextPosts);
    await saveCommunityPosts(nextPosts, updatedPost);
  };

  const handleAddComment = async (postId) => {
    if (isGuest) {
      navigate('/login');
      return;
    }
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    const myProfile = usersByIdOrEmail.get(user.uid);
    const newComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user.uid,
      userEmail: user.email || '',
      userName:
        myProfile?.name ||
        user.profile?.nickname ||
        user.displayName ||
        (user.email ? user.email.split('@')[0] : 'Chef'),
      userAvatar: myProfile?.avatar || user.profile?.avatar || user.photoURL || '',
      lang: currentLang,
      text,
      translations: {
        [currentLang]: text
      },
      createdAt: new Date().toISOString()
    };

    let updatedPost = null;
    const nextPosts = posts.map(p => {
      if (p.id !== postId) return p;
      updatedPost = {
        ...p,
        comments: [...(Array.isArray(p.comments) ? p.comments : []), newComment]
      };
      return updatedPost;
    });

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setPosts(nextPosts);
    await saveCommunityPosts(nextPosts, updatedPost);
  };

  const handleDeleteComment = async (postId, commentId) => {
    let updatedPost = null;
    const nextPosts = posts.map(p => {
      if (p.id !== postId) return p;
      updatedPost = {
        ...p,
        comments: (p.comments || []).filter(c => c.id !== commentId)
      };
      return updatedPost;
    });
    setPosts(nextPosts);
    await saveCommunityPosts(nextPosts, updatedPost);
  };

  const handleTranslatePostOnDemand = async (post) => {
    const existingTrans = post.translations?.[currentLang];
    if (existingTrans && (existingTrans.title || existingTrans.caption)) {
      setShowOriginalPostMap(prev => ({ ...prev, [post.id]: !prev[post.id] }));
      return;
    }

    setTranslatingPostId(post.id);
    try {
      const result = await translateTextOnDemand({
        title: post.title || '',
        text: post.caption || '',
        targetLang: currentLang
      });

      let updatedPost = null;
      const nextPosts = posts.map(p => {
        if (p.id !== post.id) return p;
        updatedPost = {
          ...p,
          translations: {
            ...(p.translations || {}),
            [currentLang]: {
              title: result.title || p.title || '',
              caption: result.text || p.caption || ''
            }
          }
        };
        return updatedPost;
      });

      setShowOriginalPostMap(prev => ({ ...prev, [post.id]: false }));
      setPosts(nextPosts);
      await saveCommunityPosts(nextPosts, updatedPost);
    } catch (err) {
      console.error('On-demand post translation error:', err);
      showToast(t('gourmet_community.translation_failed', 'Неуспешен превод в момента.'));
    } finally {
      setTranslatingPostId(null);
    }
  };

  const handleTranslateCommentOnDemand = async (postId, comment) => {
    const key = `${postId}_${comment.id}`;
    const existingTrans = comment.translations?.[currentLang];
    if (existingTrans) {
      setShowOriginalCommentMap(prev => ({ ...prev, [key]: !prev[key] }));
      return;
    }

    setTranslatingCommentKey(key);
    try {
      const result = await translateTextOnDemand({
        title: '',
        text: comment.text || '',
        targetLang: currentLang
      });

      let updatedPost = null;
      const nextPosts = posts.map(p => {
        if (p.id !== postId) return p;
        const nextComments = (p.comments || []).map(c => {
          if (c.id !== comment.id) return c;
          return {
            ...c,
            translations: {
              ...(c.translations || {}),
              [currentLang]: result.text || c.text
            }
          };
        });
        updatedPost = { ...p, comments: nextComments };
        return updatedPost;
      });

      setShowOriginalCommentMap(prev => ({ ...prev, [key]: false }));
      setPosts(nextPosts);
      await saveCommunityPosts(nextPosts, updatedPost);
    } catch (err) {
      console.error('On-demand comment translation error:', err);
      showToast(t('gourmet_community.translation_failed', 'Неуспешен превод в момента.'));
    } finally {
      setTranslatingCommentKey(null);
    }
  };

  const handleToggleBookmarkRecipe = async (recipeId) => {
    if (!recipeId) return;
    if (isGuest) {
      navigate('/login');
      return;
    }
    const targetRec = recipes.find(r => r.id === recipeId || r.slug === recipeId);
    const actualId = targetRec ? targetRec.id : recipeId;
    const isSaved = savedIds.includes(actualId) || savedIds.includes(recipeId);

    try {
      const userRef = doc(db, 'users', user.uid);
      if (isSaved) {
        await updateDoc(userRef, { saved_recipes: arrayRemove(actualId, recipeId) });
        showToast(t('gourmet_community.recipe_unsaved', 'Рецептата е премахната от Запазени.'));
      } else {
        await updateDoc(userRef, { saved_recipes: arrayUnion(actualId) });
        showToast(t('gourmet_community.recipe_saved', 'Рецептата е запазена в Любими!'));
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  const handleSharePostLink = async (post) => {
    const shareUrl = post.recipeId
      ? `${window.location.origin}/recipe/${post.recipeId}`
      : `${window.location.origin}/community`;
    const shareTitle = post.translations?.[currentLang]?.title || post.title || 'The Best Idea Eatery';

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: post.translations?.[currentLang]?.caption || post.caption || '',
          url: shareUrl
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(t('gourmet_community.link_copied', 'Линкът е копиран в клипборда!'));
    } catch {
      showToast(shareUrl);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleDateString(currentLang === 'bg' ? 'bg-BG' : currentLang, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const getBadgeLabel = (badgeId) => {
    switch (badgeId) {
      case 'masterpiece':
        return t('gourmet_community.badge_masterpiece', 'Шедьовър');
      case 'homemade':
        return t('gourmet_community.badge_homemade', 'Домашно приготвено');
      case 'quick':
        return t('gourmet_community.badge_quick', 'Бързо и вкусно');
      case 'custom':
        return t('gourmet_community.badge_custom', 'Авторска вариация');
      case 'new_recipe':
        return t('gourmet_community.badge_new_recipe', '🆕 Нова рецепта в каталога');
      default:
        return t('gourmet_community.badge_masterpiece', 'Шедьовър');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-32 overflow-x-hidden">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] bg-primary text-background-dark font-extrabold text-xs px-4 py-2.5 rounded-full shadow-[0_8px_25px_rgba(212,175,53,0.45)] flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Subheader & Search */}
      <div className="sticky top-0 z-10 bg-surface-dark/95 backdrop-blur-md border-b border-primary/20 shadow-sm px-4 pt-3 pb-4">
        <div className="flex flex-col gap-2.5 mb-3">
          <div className="flex items-start gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="text-primary flex size-9 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors cursor-pointer mt-0.5"
              title={t('common.buttons.back', 'Назад')}
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-slate-100 text-lg font-extrabold leading-tight tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">groups</span>
                <span>{t('gourmet_community.title', 'Гурме Общност')}</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {t('gourmet_community.subtitle', 'Споделени ястия, отзиви и нови рецепти')}
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs uppercase tracking-wider shadow-md hover:brightness-110 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add_a_photo</span>
            <span>{t('gourmet_community.share_dish_btn', 'Сподели ястие')}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="flex w-full items-stretch rounded-2xl h-11 bg-background-dark border border-primary/20 focus-within:border-primary transition-all shadow-inner">
          <div className="text-primary/60 flex items-center justify-center pl-3.5">
            <span className="material-symbols-outlined text-lg">search</span>
          </div>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input flex w-full min-w-0 flex-1 border-none bg-transparent focus:outline-0 focus:ring-0 text-slate-100 placeholder:text-slate-500 px-3 text-xs font-medium"
            placeholder={t('gourmet_community.search_placeholder', 'Търсене на готвачи, ястия или рецепти...')}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="pr-3 text-slate-400 hover:text-slate-200 cursor-pointer flex items-center"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* 2-Row Filter Tabs */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { id: 'all', icon: 'dynamic_feed', label: t('gourmet_community.filter_all', 'Всички публикации') },
            { id: 'new_recipes', icon: 'menu_book', label: t('gourmet_community.filter_new_recipes', 'Нови рецепти 🆕') },
            { id: 'top_liked', icon: 'favorite', label: t('gourmet_community.filter_top_liked', 'Най-харесвани ❤️') },
            { id: 'mine', icon: 'person', label: t('gourmet_community.filter_mine', 'Моите публикации') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                activeFilter === tab.id
                  ? 'bg-primary text-background-dark border-primary shadow-[0_0_12px_rgba(212,175,53,0.3)]'
                  : 'bg-background-dark/70 text-slate-300 border-primary/15 hover:border-primary/40'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1">
        {/* Top Chefs Section - Collapsible by default, Facebook-style Tiles Grid */}
        <section className="py-3.5 border-b border-primary/10">
          <div className="px-4 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                setIsTopChefsExpanded(prev => {
                  const next = !prev;
                  if (!next) setShowAllChefs(false);
                  return next;
                });
              }}
              className="text-slate-100 hover:text-primary text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-base">military_tech</span>
              <span>{t('gourmet_community.top_chefs', 'Топ Готвачи')}</span>
              <span className="material-symbols-outlined text-primary text-base transition-transform">
                {isTopChefsExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            <div className="flex items-center gap-3">
              {selectedChefId && (
                <button
                  onClick={() => setSelectedChefId(null)}
                  className="text-primary text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">filter_alt_off</span>
                  {t('gourmet_community.show_all_chefs', 'Покажи всички')}
                </button>
              )}
              {topChefs.length > 6 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isTopChefsExpanded) {
                      setIsTopChefsExpanded(true);
                      setShowAllChefs(true);
                    } else {
                      setShowAllChefs(prev => !prev);
                    }
                  }}
                  className="text-primary text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:underline"
                >
                  {isTopChefsExpanded && showAllChefs
                    ? t('common.buttons.collapse', 'Свий')
                    : `${t('gourmet_community.show_all_chefs', 'Покажи всички')} (${topChefs.length})`}
                </button>
              )}
            </div>
          </div>

          {isTopChefsExpanded && (
            <div className="grid grid-cols-3 gap-2.5 px-4 mt-3">
              {displayedChefs.map((chef) => {
                const isSelected = selectedChefId === chef.id;
                return (
                  <div
                    key={chef.id}
                    onClick={() => setSelectedChefId(isSelected ? null : chef.id)}
                    className={`relative flex flex-col items-center text-center p-3 rounded-2xl border cursor-pointer transition-all shadow-md ${
                      isSelected
                        ? 'bg-primary/15 border-primary shadow-[0_0_15px_rgba(212,175,53,0.3)]'
                        : 'bg-surface-dark/85 border-primary/20 hover:border-primary/50 hover:bg-surface-dark'
                    }`}
                  >
                    {/* Profile Link Button in Top-Right of Tile */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/progress?uid=${chef.id}`);
                      }}
                      title={t('gourmet_community.view_chef_profile', 'Виж кулинарния профил')}
                      className="absolute top-2 right-2 size-6 rounded-full bg-background-dark/80 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary hover:text-background-dark transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </button>

                    {/* Circular Avatar with Real User Photo or Latin Initial */}
                    <div
                      className={`size-14 p-0.5 rounded-full mb-2 ${
                        isSelected
                          ? 'bg-gradient-to-tr from-primary to-[#b8860b]'
                          : 'border border-primary/40 bg-background-dark'
                      }`}
                    >
                      {chef.avatar ? (
                        <img
                          src={chef.avatar}
                          alt={chef.name}
                          className="size-full rounded-full object-cover border border-background-dark"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        style={{ display: chef.avatar ? 'none' : 'flex' }}
                        className="size-full rounded-full bg-surface-dark border border-background-dark items-center justify-center text-primary font-black text-lg uppercase"
                      >
                        {chef.initial}
                      </div>
                    </div>

                    {/* Chef Name & XP */}
                    <p className={`text-xs font-extrabold w-full truncate ${isSelected ? 'text-primary' : 'text-slate-100'}`}>
                      {chef.name}
                    </p>
                    <span className="text-[10px] font-bold text-amber-400/90 mt-0.5">
                      {chef.score} XP
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Feed Section */}
        <section className="flex flex-col gap-7 py-5">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              {t('common.loading', 'Зареждане...')}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="mx-4 p-8 rounded-2xl bg-surface-dark/60 border border-primary/15 text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-primary/60">restaurant_menu</span>
              <h3 className="text-slate-200 font-bold text-base">
                {t('gourmet_community.no_posts_found', 'Няма намерени публикации')}
              </h3>
              <p className="text-slate-400 text-xs max-w-xs">
                {t('gourmet_community.no_posts_desc', 'Бъдете първите, които ще споделят снимка и отзив за сготвено ястие в Гурме общността!')}
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-background-dark font-extrabold text-xs uppercase tracking-wider cursor-pointer"
              >
                + {t('gourmet_community.share_dish_btn', 'Сподели ястие')}
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => {
              // Resolve real user profile dynamically if available
              const resolvedAuthor =
                usersByIdOrEmail.get(post.authorId) ||
                (post.authorEmail && usersByIdOrEmail.get(post.authorEmail.toLowerCase()));

              const effectiveAuthorId = resolvedAuthor ? resolvedAuthor.id : post.authorId;
              const effectiveAuthorName = resolvedAuthor ? resolvedAuthor.name : post.authorName;
              const effectiveAuthorAvatar = resolvedAuthor?.avatar || post.authorAvatar || '';
              const effectiveAuthorInitial = getLatinInitial(
                effectiveAuthorName,
                resolvedAuthor?.email || post.authorEmail || ''
              );
              const effectiveAuthorLocation = resolvedAuthor ? resolvedAuthor.location : '';

              const isPostAuthor = currentUserId && effectiveAuthorId === currentUserId;
              const canManagePost = isPostAuthor || isModeratorOrPower;
              const likesList = Array.isArray(post.likes) ? post.likes : [];
              const hasLiked = currentUserId && likesList.includes(currentUserId);
              const commentsList = Array.isArray(post.comments) ? post.comments : [];
              const isCommentsOpen = !!openCommentsMap[post.id];

              // Multilingual display logic
              const postSourceLang = post.lang || 'bg';
              const hasTranslationForCurrentLang =
                !!post.translations?.[currentLang] &&
                !!(post.translations[currentLang].title || post.translations[currentLang].caption);
              const showOriginal = !!showOriginalPostMap[post.id];

              const displayedTitle =
                !showOriginal && hasTranslationForCurrentLang
                  ? post.translations[currentLang].title || post.title
                  : post.title;
              const displayedCaption =
                !showOriginal && hasTranslationForCurrentLang
                  ? post.translations[currentLang].caption || post.caption
                  : post.caption;

              const linkedRecipeObj = post.recipeId
                ? recipes.find(r => r.id === post.recipeId || r.slug === post.recipeId)
                : null;
              const linkedRecipeTitle = linkedRecipeObj
                ? getLocalizedField(linkedRecipeObj, 'title', currentLang)
                : (post.recipeTitle?.[currentLang] || post.recipeTitle?.bg || post.recipeTitle?.en || '');
              const isRecipeBookmarked =
                post.recipeId &&
                (savedIds.includes(post.recipeId) || (linkedRecipeObj && savedIds.includes(linkedRecipeObj.id)));

              const badgeMeta = BADGE_OPTIONS.find(b => b.id === post.badge) || BADGE_OPTIONS[0];
              const isNewRecipeAnnouncement = post.postType === 'new_recipe' || post.badge === 'new_recipe';

              return (
                <article
                  key={post.id}
                  className={`flex flex-col gap-3 pb-5 border-b ${
                    isNewRecipeAnnouncement ? 'border-amber-500/30 bg-amber-500/[0.03] pt-3' : 'border-primary/10'
                  }`}
                >
                  {/* Special News Banner when a new recipe is approved/published */}
                  {isNewRecipeAnnouncement && (
                    <div className="mx-4 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-primary/20 to-amber-500/10 border border-amber-400/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                        <span className="material-symbols-outlined text-base">campaign</span>
                        <span>{t('gourmet_community.new_recipe_news_banner', 'Новина: Нова одобрена рецепта в каталога!')}</span>
                      </div>
                      {post.recipeId && (
                        <button
                          onClick={() => navigate(`/recipe/${post.recipeId}`)}
                          className="text-[10px] font-extrabold text-primary underline cursor-pointer"
                        >
                          {t('gourmet_community.open_recipe', 'Виж рецептата')}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Author Header */}
                  <div className="px-4 flex items-center justify-between">
                    <div
                      onClick={() => {
                        if (effectiveAuthorId && !String(effectiveAuthorId).startsWith('chef_')) {
                          navigate(`/profile/progress?uid=${effectiveAuthorId}`);
                        }
                      }}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="size-10 rounded-full overflow-hidden border border-primary/50 bg-surface-dark shrink-0 flex items-center justify-center shadow-sm">
                        {effectiveAuthorAvatar ? (
                          <img
                            src={effectiveAuthorAvatar}
                            alt={effectiveAuthorName}
                            className="size-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextSibling) {
                                e.currentTarget.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          style={{ display: effectiveAuthorAvatar ? 'none' : 'flex' }}
                          className="size-full items-center justify-center text-primary font-black text-sm uppercase"
                        >
                          {effectiveAuthorInitial}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-slate-100 text-sm font-extrabold leading-none group-hover:text-primary transition-colors">
                            {effectiveAuthorName}
                          </h3>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-dark text-slate-400 border border-primary/15">
                            {LANG_FLAGS[postSourceLang] || postSourceLang.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-primary/70 text-[10px] font-bold uppercase tracking-widest mt-1">
                          {effectiveAuthorLocation ? `${effectiveAuthorLocation} • ` : ''}
                          {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>

                    {canManagePost && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(post)}
                          title={t('common.buttons.edit', 'Редактирай')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeletePost(post)}
                          title={t('common.buttons.delete', 'Изтрий')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dish Image - Compact 60% height with breathing room, subtle border and rounded corners */}
                  <div className="mx-4 relative h-52 sm:h-56 bg-surface-dark overflow-hidden rounded-2xl border border-primary/25 shadow-lg">
                    <div
                      className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-transform duration-700 hover:scale-105"
                      style={{ backgroundImage: `url("${post.image || '/images/recipe-placeholder.png'}")` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />

                    {/* Top Right Rating Stars */}
                    {post.rating > 0 && (
                      <div className="absolute top-3 right-3 bg-background-dark/85 backdrop-blur-md border border-primary/40 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                        <span className="text-xs font-black text-slate-100">{Number(post.rating).toFixed(1)}</span>
                      </div>
                    )}

                    {/* Bottom Left Badge & Linked Recipe Chip */}
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`bg-gradient-to-r ${badgeMeta.color} text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1`}
                      >
                        <span className="material-symbols-outlined text-xs">{badgeMeta.icon}</span>
                        {getBadgeLabel(post.badge)}
                      </span>

                      {post.recipeId && (
                        <button
                          onClick={() => navigate(`/recipe/${post.recipeId}`)}
                          className="bg-background-dark/90 hover:bg-primary hover:text-background-dark text-primary border border-primary/40 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 transition-all cursor-pointer max-w-[65%]"
                        >
                          <span className="material-symbols-outlined text-sm shrink-0">menu_book</span>
                          <span className="truncate">
                            {linkedRecipeTitle || t('gourmet_community.open_recipe', 'Виж рецептата')}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title, Caption & Multilingual Translation Bar */}
                  <div className="px-4 pt-1">
                    {displayedTitle && (
                      <h4 className="text-slate-100 text-base font-extrabold mb-1 tracking-tight">
                        {displayedTitle}
                      </h4>
                    )}
                    {displayedCaption && (
                      <p className="text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-line">
                        {displayedCaption}
                      </p>
                    )}

                    {postSourceLang !== currentLang && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={translatingPostId === post.id}
                          onClick={() => handleTranslatePostOnDemand(post)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">translate</span>
                          {translatingPostId === post.id
                            ? t('gourmet_community.translating', 'Превеждане с Chef AI...')
                            : hasTranslationForCurrentLang
                            ? showOriginal
                              ? t('gourmet_community.show_translation', 'Виж превода')
                              : t('gourmet_community.translated_show_original', 'Преведено автоматично · Виж оригинала')
                            : t('gourmet_community.translate_post_btn', 'Преведи публикацията')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Social Action Bar - Positioned at the bottom of the post under the text */}
                  <div className="px-4 pt-2 border-t border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => handleToggleLike(post)}
                        className={`flex items-center gap-1.5 transition-transform active:scale-125 cursor-pointer ${
                          hasLiked ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-2xl"
                          style={{ fontVariationSettings: hasLiked ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          favorite
                        </span>
                        <span className="text-xs font-extrabold">{likesList.length}</span>
                      </button>

                      <button
                        onClick={() =>
                          setOpenCommentsMap(prev => ({ ...prev, [post.id]: !prev[post.id] }))
                        }
                        className="flex items-center gap-1.5 text-slate-300 hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-2xl">chat_bubble</span>
                        <span className="text-xs font-extrabold">{commentsList.length}</span>
                      </button>

                      <button
                        onClick={() => handleSharePostLink(post)}
                        title={t('gourmet_community.share_link', 'Сподели линк')}
                        className="flex items-center gap-1.5 text-slate-300 hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-2xl">share</span>
                      </button>
                    </div>

                    {post.recipeId && (
                      <button
                        onClick={() => handleToggleBookmarkRecipe(post.recipeId)}
                        title={t('gourmet_community.bookmark_recipe', 'Запази рецептата в Любими')}
                        className={`flex items-center gap-1 text-xs font-bold transition-transform hover:scale-105 cursor-pointer ${
                          isRecipeBookmarked ? 'text-primary' : 'text-slate-300 hover:text-primary'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-2xl"
                          style={{ fontVariationSettings: isRecipeBookmarked ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          bookmark
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Expandable Comments Section */}
                  <div className="px-4">
                    {commentsList.length > 0 && !isCommentsOpen && (
                      <button
                        onClick={() => setOpenCommentsMap(prev => ({ ...prev, [post.id]: true }))}
                        className="text-xs font-bold text-slate-400 hover:text-primary transition-colors cursor-pointer"
                      >
                        {t('gourmet_community.view_all_comments', 'Виж всички коментари ({{count}})', {
                          count: commentsList.length
                        })}
                      </button>
                    )}

                    {isCommentsOpen && (
                      <div className="mt-2 pt-3 border-t border-primary/10 space-y-3">
                        {commentsList.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">
                            {t('gourmet_community.no_comments_yet', 'Все още няма коментари. Напишете първия!')}
                          </p>
                        ) : (
                          commentsList.map((cmt) => {
                            const cmtKey = `${post.id}_${cmt.id}`;
                            const cmtLang = cmt.lang || 'bg';
                            const hasCmtTranslation = !!cmt.translations?.[currentLang];
                            const showOrigCmt = !!showOriginalCommentMap[cmtKey];
                            const displayedCmtText =
                              !showOrigCmt && hasCmtTranslation ? cmt.translations[currentLang] : cmt.text;
                            const canDeleteCmt =
                              (currentUserId && cmt.userId === currentUserId) || isPostAuthor || isModeratorOrPower;

                            const resolvedCmtUser = usersByIdOrEmail.get(cmt.userId);
                            const cmtAvatar = resolvedCmtUser?.avatar || cmt.userAvatar || '';
                            const cmtName = resolvedCmtUser?.name || cmt.userName || 'Chef';
                            const cmtInitial = getLatinInitial(cmtName, resolvedCmtUser?.email || cmt.userEmail || '');

                            return (
                              <div
                                key={cmt.id}
                                className="flex items-start justify-between gap-2.5 bg-surface-dark/60 p-2.5 rounded-xl border border-primary/10"
                              >
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <div className="size-7 rounded-full overflow-hidden bg-background-dark border border-primary/30 flex items-center justify-center shrink-0">
                                    {cmtAvatar ? (
                                      <img
                                        src={cmtAvatar}
                                        alt={cmtName}
                                        className="size-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          if (e.currentTarget.nextSibling) {
                                            e.currentTarget.nextSibling.style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      style={{ display: cmtAvatar ? 'none' : 'flex' }}
                                      className="size-full items-center justify-center text-primary text-xs font-bold uppercase"
                                    >
                                      {cmtInitial}
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-extrabold text-slate-200">{cmtName}</span>
                                      <span className="text-[10px] text-slate-500">{formatDate(cmt.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 mt-0.5 break-words">{displayedCmtText}</p>

                                    {cmtLang !== currentLang && (
                                      <button
                                        type="button"
                                        disabled={translatingCommentKey === cmtKey}
                                        onClick={() => handleTranslateCommentOnDemand(post.id, cmt)}
                                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-primary/80 hover:text-primary cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[12px]">translate</span>
                                        {translatingCommentKey === cmtKey
                                          ? t('gourmet_community.translating', 'Превеждане...')
                                          : hasCmtTranslation
                                          ? showOrigCmt
                                            ? t('gourmet_community.show_translation', 'Виж превода')
                                            : t('gourmet_community.show_original', 'Виж оригинала')
                                          : t('gourmet_community.translate_comment', 'Преведи')}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {canDeleteCmt && (
                                  <button
                                    onClick={() => handleDeleteComment(post.id, cmt.id)}
                                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                    title={t('common.buttons.delete', 'Изтрий')}
                                  >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}

                        {/* Add Comment Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) =>
                              setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                            placeholder={t('gourmet_community.add_comment_placeholder', 'Напишете коментар...')}
                            className="flex-1 bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(post.id)}
                            className="px-3 py-2 rounded-xl bg-primary text-background-dark font-extrabold text-xs cursor-pointer hover:brightness-110"
                          >
                            <span className="material-symbols-outlined text-base leading-none">send</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Unified Bottom Chef AI Button */}
        <div className="px-4 pt-2 pb-8 flex justify-center">
          <button
            onClick={() => navigate('/ai-assistant')}
            className="w-full max-w-xs py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black text-sm tracking-wide shadow-[0_8px_25px_rgba(212,175,53,0.35)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>✨ Chef AI</span>
          </button>
        </div>
      </main>

      {/* Create / Edit Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-dark border border-primary/30 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-primary/15 pb-3">
              <h2 className="text-slate-100 font-extrabold text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">photo_camera</span>
                {editingPostId
                  ? t('gourmet_community.edit_post_title', 'Редактирай публикацията')
                  : t('gourmet_community.create_post_title', 'Сподели кулинарно творение')}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handlePublishPost} className="space-y-4">
              {/* Photo Upload / Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('gourmet_community.dish_photo_label', 'Снимка на ястието')}
                </label>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="size-24 rounded-2xl bg-background-dark border-2 border-dashed border-primary/40 flex flex-col items-center justify-center text-primary cursor-pointer overflow-hidden shrink-0 hover:border-primary transition-colors"
                  >
                    {formImageUrl ? (
                      <img src={formImageUrl} alt="Preview" className="size-full object-cover" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                        <span className="text-[10px] font-bold mt-1">
                          {t('gourmet_community.upload_photo', 'Качи снимка')}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl bg-primary/15 text-primary border border-primary/30 text-xs font-bold hover:bg-primary/25 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">upload</span>
                      {t('gourmet_community.choose_from_device', 'Избери снимка от устройство')}
                    </button>
                    <input
                      type="text"
                      value={formImageUrl}
                      onChange={(e) => {
                        setFormImageFile(null);
                        setFormImageUrl(e.target.value);
                      }}
                      placeholder={t('gourmet_community.or_paste_image_url', 'или постави URL на снимка...')}
                      className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Link a Recipe from Catalog (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('gourmet_community.link_recipe_label', 'Свържи с рецепта от каталога (по желание)')}
                </label>
                <input
                  type="text"
                  value={formRecipeSearch}
                  onChange={(e) => setFormRecipeSearch(e.target.value)}
                  placeholder={t('gourmet_community.search_recipe_placeholder', 'Търси рецепта по име...')}
                  className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 mb-2"
                />
                <select
                  value={formRecipeId}
                  onChange={(e) => handleSelectRecipeInModal(e.target.value)}
                  className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs text-slate-100"
                >
                  <option value="">{t('gourmet_community.no_linked_recipe', '— Без свързана рецепта (Свободно ястие) —')}</option>
                  {filteredModalRecipes.map((rec) => (
                    <option key={rec.id} value={rec.slug || rec.id}>
                      {getLocalizedField(rec, 'title', currentLang)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dish Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {t('gourmet_community.post_title_label', 'Заглавие на творението')} *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t('gourmet_community.post_title_placeholder', 'напр. Телешки стек с манатарки и мащерка')}
                  className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Culinary Review / Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {t('gourmet_community.post_caption_label', 'Твоят кулинарен отзив / тайна на приготвяне')} *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  placeholder={t(
                    'gourmet_community.post_caption_placeholder',
                    'Сподели как се получи ястието, какво промени или с какво вино го съчета...'
                  )}
                  className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-primary/80 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">translate</span>
                  {t(
                    'gourmet_community.auto_translate_hint',
                    'Chef AI автоматично ще преведе публикацията за потребителите на други езици.'
                  )}
                </p>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {t('gourmet_community.rating_label', 'Оценка')}
                </label>
                <div className="flex items-center gap-1 bg-background-dark border border-primary/20 rounded-xl px-2.5 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormRating(star)}
                      className="text-primary cursor-pointer hover:scale-110 transition-transform"
                    >
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{ fontVariationSettings: star <= formRating ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Badge Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('gourmet_community.badge_label', 'Кулинарна значка')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BADGE_OPTIONS.filter(b => b.id !== 'new_recipe').map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setFormBadge(b.id)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-all ${
                        formBadge === b.id
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-background-dark border-primary/15 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{b.icon}</span>
                      <span className="truncate">{getBadgeLabel(b.id)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-background-dark border border-primary/20 text-slate-300 font-bold text-xs uppercase cursor-pointer"
                >
                  {t('common.buttons.cancel', 'Отказ')}
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs uppercase tracking-wider shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isPublishing
                    ? t('gourmet_community.publishing_btn', 'Публикуване и превод...')
                    : editingPostId
                    ? t('common.buttons.save', 'Запази')
                    : t('gourmet_community.publish_btn', 'Публикувай (+10 XP)')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GourmetCommunity;
