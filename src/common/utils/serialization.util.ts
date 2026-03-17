import type { Post, User } from '@prisma/client';

export function sanitizeUser<T extends Partial<User> & Record<string, unknown>>(user: T) {
  const { passwordHash, ...safeUser } = user as T & { passwordHash?: string };
  return safeUser;
}

export function serializePost<T extends Post & Record<string, unknown>>(post: T, currentUserId: string) {
  const likes = Array.isArray(post.likes) ? (post.likes as Array<{ userId: string }>) : [];
  const counts = (post._count ?? {}) as { likes?: number; comments?: number };

  return {
    ...post,
    likes: undefined,
    _count: undefined,
    isLikedByMe: likes.some((like) => like.userId === currentUserId),
    likeCount: counts.likes ?? likes.length,
    commentCount: counts.comments ?? (Array.isArray(post.comments) ? post.comments.length : 0),
  };
}
