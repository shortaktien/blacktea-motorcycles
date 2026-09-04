<?php

// Runs against the temporary stores in community-interactions.php only.
use Symfony\Component\HttpFoundation\Request;

$originalComments = $community->read()['comments'];
$fixture = [];
for ($index = 1; $index <= 75; $index++) {
    $fixture[] = [
        'id' => str_pad(dechex($index), 32, '0', STR_PAD_LEFT), 'guide' => 'community-erfahrungen',
        'kind' => 'comment', 'status' => 'approved', 'userId' => $owner, 'name' => 'test0',
        'email' => 'test0@example.invalid', 'topic' => 'Beitrag ' . $index, 'body' => 'Ein isolierter Testbeitrag.',
        'createdAt' => '2026-01-01T12:00:00+00:00', 'imageFile' => null,
    ];
}
$seed = static function () use ($community, $fixture): void {
    $community->update(static function (array &$data) use ($fixture): void { $data['comments'] = $fixture; });
};
$pageRequest = static fn (array $query = []): Request => Request::create('/api/community/activity', 'GET', $query);
$as(null);
try {
    $seed();
    $first = $json($controller->communityActivity($pageRequest()));
    $assert(count($first['activities']) === 10 && $first['totalCount'] === 75, 'First page is exactly 10 of 75 posts');
    $assert($first['hasMore'] && is_string($first['nextCursor']), 'First page returns next cursor');
    $allIds = [];
    $cursor = null;
    $sizes = [];
    do {
        $page = $json($controller->communityActivity($pageRequest($cursor === null ? [] : ['cursor' => $cursor])));
        $sizes[] = count($page['activities']);
        $allIds = [...$allIds, ...array_column($page['activities'], 'id')];
        $cursor = $page['nextCursor'];
        $assert(count($sizes) <= 8, 'Cursor always advances');
    } while ($cursor !== null);
    $assert($sizes === [10, 10, 10, 10, 10, 10, 10, 5], 'All pages have 10 posts except the last');
    $assert(count($allIds) === 75 && count(array_unique($allIds)) === 75, 'No omissions or duplicates beyond the previous 60-post cap');
    $assert($allIds === array_reverse(array_column($fixture, 'id')), 'Equal timestamps are ordered deterministically by ID');
    $assert($page['hasMore'] === false && $page['nextCursor'] === null, 'Last page stops infinite scrolling');
    $focused = $json($controller->communityActivity($pageRequest(['post' => $fixture[0]['id']])));
    $assert(count($focused['activities']) === 10 && $focused['focusedActivity']['id'] === $fixture[0]['id'], 'Old notification target is separate from the 10-post page');
    $assert($focused['nextCursor'] === $first['nextCursor'], 'Focused post does not corrupt pagination boundary');
    $inPage = $json($controller->communityActivity($pageRequest(['post' => $fixture[74]['id']])));
    $assert($inPage['focusedActivity'] === null, 'In-page notification target is not duplicated');
    $missing = $json($controller->communityActivity($pageRequest(['post' => str_repeat('f', 32)])));
    $assert($missing['focusedActivity'] === null, 'Missing focus target is not exposed');
    $status($controller->communityActivity($pageRequest(['cursor' => 'invalid'])), 400, 'Invalid cursor is rejected');
    $status($controller->communityActivity($pageRequest(['cursor' => base64_encode('[1,"bad-id"]')])), 400, 'Malformed cursor payload is rejected');

    $community->update(static function (array &$data) use ($fixture): void {
        // Remove the boundary row and an unseen row, then insert a newer post.
        $data['comments'] = array_values(array_filter($data['comments'], static fn (array $comment): bool => !in_array($comment['id'], [$fixture[65]['id'], $fixture[64]['id']], true)));
        $new = $fixture[0];
        $new['id'] = str_repeat('e', 32);
        $new['createdAt'] = '2026-01-02T12:00:00+00:00';
        $data['comments'][] = $new;
    });
    $cursor = $first['nextCursor'];
    $continuedIds = array_column($first['activities'], 'id');
    $pageCount = 0;
    do {
        $page = $json($controller->communityActivity($pageRequest(['cursor' => $cursor])));
        $continuedIds = [...$continuedIds, ...array_column($page['activities'], 'id')];
        $cursor = $page['nextCursor'];
        $assert(++$pageCount <= 7, 'Changed feed cursor terminates');
    } while ($cursor !== null);
    $expected = array_values(array_filter(array_reverse(array_column($fixture, 'id')), static fn (string $id): bool => $id !== $fixture[64]['id']));
    $assert($continuedIds === $expected, 'Insertions/deletions do not shift the cursor or duplicate/skip surviving posts');

    $seed();
    $community->update(static function (array &$data): void { $data['comments'][0]['status'] = 'pending'; });
    $hidden = $json($controller->communityActivity($pageRequest(['post' => $fixture[0]['id']])));
    $assert($hidden['totalCount'] === 74 && $hidden['focusedActivity'] === null, 'Pending posts remain private when focused or paginated');
    $empty = $json($controller->communityActivity($pageRequest(['model' => 'Wildfire'])));
    $assert($empty['activities'] === [] && $empty['nextCursor'] === null && !$empty['hasMore'], 'An empty filtered feed has no next page');
} finally {
    $community->update(static function (array &$data) use ($originalComments): void { $data['comments'] = $originalComments; });
}
