<?php

// Manual local fixture maintenance only. Never run as a deployment migration.
if (PHP_SAPI !== 'cli' || getenv('BTM_ALLOW_LOCAL_FIXTURES') !== '1' || !in_array('--local-demo', $argv, true)) {
    fwrite(STDERR, "Requires explicit local-fixture authorization.\n");
    exit(1);
}
require dirname(__DIR__) . '/vendor/autoload.php';

$parentId = '6c34f725fb1e9bb5a063ba060a2355e8';
$fixtures = [
    'b7d4f2a91c6e48f08a3d5e7129c04b6f' => 'wildfirewerkstatt',
    'd3a8e61f42b749c18f0d2e537ab96c04' => 'bonfirepilot',
    'e4f19b6c03d247a89e5f1c6d72b0483a' => 'elektrochecker',
    'f5a20c7d14e358b90f6a2d7e83c1594b' => 'dresdenrider',
];
$community = new App\Service\CommunityStorage();
$users = new App\Service\UserStorage();
$comments = $community->read()['comments'];
$matches = [];
foreach ($comments as $comment) {
    if (!isset($fixtures[$comment['id']])) continue;
    $id = md5('local-demo-repair-profile-' . $comment['id']);
    if (($comment['parentId'] ?? null) !== $parentId || ($comment['kind'] ?? null) !== 'repair_answer'
        || $comment['name'] !== $fixtures[$comment['id']] || (!empty($comment['userId']) && $comment['userId'] !== $id)) {
        throw new RuntimeException('Fixture identity changed; no records modified.');
    }
    $matches[$comment['id']] = ['id' => $id, 'name' => $comment['name']];
}
if (count($matches) !== count($fixtures)) throw new RuntimeException('Expected four exact local demo answers.');
$users->update(static function (array &$data) use ($matches): void {
    foreach ($matches as $fixture) {
        foreach ($data['users'] as $user) {
            if ($user['id'] === $fixture['id'] || $user['name'] === $fixture['name']) {
                if ($user['id'] !== $fixture['id'] || $user['name'] !== $fixture['name'] || !($user['isLocalDemo'] ?? false)) {
                    throw new RuntimeException('Existing real account conflicts with demo fixture.');
                }
            }
        }
    }
    foreach ($matches as $index => $fixture) {
        if (array_filter($data['users'], static fn (array $user): bool => $user['id'] === $fixture['id'])) continue;
        $data['users'][] = $fixture + [
            'email' => $fixture['name'] . '@demo.invalid',
            'passwordHash' => password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),
            'status' => 'active', 'role' => 'member', 'isLocalDemo' => true,
            'bio' => 'Lokales Beispielprofil zur Darstellung von Reparaturantworten – keine reale Person.',
            'model' => $fixture['name'] === 'wildfirewerkstatt' ? 'Wildfire' : 'Bonfire',
            'country' => null, 'postalCode' => '', 'kilometers' => 0,
            'avatarStyle' => hexdec(substr($index, 0, 2)) % 20,
            'newsletterSubscribed' => false, 'notifyCommunity' => false, 'notifyReplies' => false,
            'createdAt' => date(DATE_ATOM),
        ];
    }
});
$community->update(static function (array &$data) use ($matches, $parentId): void {
    foreach ($data['comments'] as &$comment) {
        if (!isset($matches[$comment['id']])) continue;
        $fixture = $matches[$comment['id']];
        if (($comment['parentId'] ?? null) !== $parentId || $comment['name'] !== $fixture['name']
            || (!empty($comment['userId']) && $comment['userId'] !== $fixture['id'])) throw new RuntimeException('Answer changed during fixture update.');
        $comment['userId'] = $fixture['id'];
    }
});
// Compare every field except the intentionally added profile reference.
$after = $community->read()['comments'];
foreach ($comments as $index => $before) {
    $expected = $before;
    if (isset($matches[$before['id']])) $expected['userId'] = $matches[$before['id']]['id'];
    if ($expected !== $after[$index]) throw new RuntimeException('Unexpected fixture change.');
}
echo "Linked four demo answers to local demo profiles; all other answer data unchanged.\n";
