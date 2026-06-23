import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SocialService } from '../../../src/social/application/social.service';
import { POST_REPOSITORY, type PostRepository } from '../../../src/social/domain/post';

describe('SocialService', () => {
  let svc: SocialService;
  let posts: jest.Mocked<PostRepository>;

  beforeEach(async () => {
    posts = {
      feed: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      toggleLike: jest.fn(),
      isLikedBy: jest.fn(),
      getReplies: jest.fn(),
      createReply: jest.fn(),
    } as unknown as jest.Mocked<PostRepository>;

    const mod = await Test.createTestingModule({
      providers: [
        SocialService,
        { provide: POST_REPOSITORY, useValue: posts },
      ],
    }).compile();

    svc = mod.get<SocialService>(SocialService);
  });

  describe('getFeed', () => {
    it('delegates to posts.feed with limit 20', async () => {
      posts.feed.mockResolvedValue([]);
      const result = await svc.getFeed();
      expect(result).toEqual([]);
      expect(posts.feed).toHaveBeenCalledWith(20, undefined);
    });

    it('passes userId to posts.feed when provided', async () => {
      posts.feed.mockResolvedValue([]);
      await svc.getFeed('u1');
      expect(posts.feed).toHaveBeenCalledWith(20, 'u1');
    });
  });

  describe('createPost', () => {
    it('delegates to posts.create', async () => {
      posts.create.mockResolvedValue({
        id: 'p1',
        userId: 'u1',
        text: 'Hello',
        rating: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await svc.createPost('u1', 'Hello');
      expect(result.id).toBe('p1');
      expect(posts.create).toHaveBeenCalledWith('u1', 'Hello', undefined);
    });

    it('passes rating when provided', async () => {
      posts.create.mockResolvedValue({
        id: 'p1',
        userId: 'u1',
        text: 'Great book',
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await svc.createPost('u1', 'Great book', 5);
      expect(posts.create).toHaveBeenCalledWith('u1', 'Great book', 5);
    });
  });

  describe('toggleLike', () => {
    it('delegates to posts.toggleLike', async () => {
      posts.toggleLike.mockResolvedValue({ liked: true, likeCount: 3 });
      const result = await svc.toggleLike('p1', 'u1');
      expect(result).toEqual({ liked: true, likeCount: 3 });
      expect(posts.toggleLike).toHaveBeenCalledWith('p1', 'u1');
    });
  });

  describe('getLikeStatus', () => {
    it('returns liked status from posts.isLikedBy', async () => {
      posts.isLikedBy.mockResolvedValue(true);
      const result = await svc.getLikeStatus('p1', 'u1');
      expect(result).toEqual({ liked: true });
      expect(posts.isLikedBy).toHaveBeenCalledWith('p1', 'u1');
    });
  });

  describe('getReplies', () => {
    it('delegates to posts.getReplies', async () => {
      posts.getReplies.mockResolvedValue([]);
      const result = await svc.getReplies('p1');
      expect(result).toEqual([]);
      expect(posts.getReplies).toHaveBeenCalledWith('p1');
    });
  });

  describe('createReply', () => {
    it('creates a reply when the post exists', async () => {
      posts.findById.mockResolvedValue({ id: 'p1' });
      posts.createReply.mockResolvedValue({
        id: 'r1',
        postId: 'p1',
        userId: 'u1',
        text: 'Nice!',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await svc.createReply('p1', 'u1', 'Nice!');
      expect(result.id).toBe('r1');
      expect(posts.createReply).toHaveBeenCalledWith('p1', 'u1', 'Nice!');
    });

    it('throws NotFoundException when the post does not exist', async () => {
      posts.findById.mockResolvedValue(null);
      await expect(svc.createReply('missing', 'u1', 'hey')).rejects.toBeInstanceOf(NotFoundException);
      expect(posts.createReply).not.toHaveBeenCalled();
    });
  });
});
