import { serializePost, sanitizeUser } from './serialization.util';

describe('serialization utils', () => {
  it('removes passwordHash from serialized users', () => {
    expect(
      sanitizeUser({
        id: 'user-1',
        email: 'user@vyta.app',
        fullName: 'User',
        passwordHash: 'secret',
      }),
    ).toEqual({
      id: 'user-1',
      email: 'user@vyta.app',
      fullName: 'User',
    });
  });

  it('computes post flags and counters', () => {
    const serialized = serializePost(
      {
        id: 'post-1',
        userId: 'author-1',
        visibility: 'PUBLIC',
        createdAt: new Date(),
        updatedAt: new Date(),
        caption: 'Post',
        workoutSessionId: null,
        mediaUrl: null,
        thumbUrl: null,
        mediaKind: null,
        likes: [{ userId: 'viewer-1' }, { userId: 'viewer-2' }],
        comments: [{ id: 'comment-1' }],
        _count: { likes: 2, comments: 1 },
      },
      'viewer-1',
    );

    expect(serialized.isLikedByMe).toBe(true);
    expect(serialized.likeCount).toBe(2);
    expect(serialized.commentCount).toBe(1);
    expect(serialized.likes).toBeUndefined();
    expect(serialized._count).toBeUndefined();
  });
});
