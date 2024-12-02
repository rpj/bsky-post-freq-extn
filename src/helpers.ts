// All here taken from https://github.com/aliceisjustplaying/bluesky-heatmap/
// with minimal changes
import * as bsky from '@atproto/api';

// source: https://github.com/bluesky-social/atproto/blob/efb1cac2bfc8ccb77c0f4910ad9f3de7370fbebb/packages/bsky/tests/_util.ts#L314
export const paginateAll = async <T extends { cursor?: string }>(
  fn: (cursor?: string) => Promise<T>,
  limit = Infinity,
): Promise<T[]> => {
  const results: T[] = [];
  let cursor;
  do {
    const res: any = await fn(cursor);
    results.push(res);
    cursor = res.cursor;
  } while (cursor && results.length < limit);
  return results;
};

export const getUserCreatedAt = async (actor: string) => {
  // source: https://github.com/mimonelu/klearsky/blob/079746c1c1a03d3a9f0961bdb69bb223dcb106c3/src/composables/main-state.ts#L98
  const log = await fetch(`https://plc.directory/${actor}/log/audit`);
  const logJson = await log.json();
  const createdAt = logJson[0]?.createdAt;

  return createdAt;
};

export const getData = async (agent: bsky.AtpAgent, actor: string) => {
  // source: https://github.com/bluesky-social/atproto/blob/efb1cac2bfc8ccb77c0f4910ad9f3de7370fbebb/packages/bsky/tests/views/author-feed.test.ts#L94
  const paginator = async (cursor?: string) => {
    const res = await agent.getAuthorFeed({
      actor,
      cursor,
      limit: 100,
    });
    return res.data;
  };

  const paginatedAll = await paginateAll(paginator);

  const posts: object[] = [];

  paginatedAll.forEach((res) => {
    if (typeof res.feed[0] !== 'undefined') {
      posts.push(
        ...res.feed.map((e) => ({
          text: (e.post.record as any).text,
          uri: e.post.uri.replace('app.bsky.feed.', '').replace('at://', 'https://bsky.app/profile/'),
          likeCount: e.post.likeCount,
          did: e.post.author.did,
          handle: e.post.author.handle,
          isOwn: e.post.author.did === actor,
          repostCount: e.post.repostCount,
          isRepost: e.post.repostCount === 0 ? false : true,
          createdAt: (e.post.record as any).createdAt,
        })),
      );
    }
  });

  const groupedPosts = posts.reduce((acc: any, obj: any) => {
    const key = obj.createdAt.slice(0, 10);
    if (!acc[key]) {
      acc[key] = { date: key, count: 0 };
    }
    if (obj.handle === actor) acc[key].count++;
    return acc;
  }, {});

  // i don't need the outer object, i just need an array with the values
  const data = Object.values(groupedPosts);
  const max = Math.max(...data.map((o: any) => o.count));
  const createdAt = await getUserCreatedAt(actor);

  return {
    data,
    max,
    createdAt,
  };
};