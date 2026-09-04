<?php

// Isolated regression test: never reads or changes the application's live data.
require dirname(__DIR__) . '/vendor/autoload.php';

use App\Controller\CommunityController;
use App\Service\CommunityStorage;
use App\Service\EmailConfirmationService;
use App\Service\MailjetService;
use App\Service\UserAuthService;
use App\Service\UserStorage;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;

$root = sys_get_temp_dir() . '/btm-community-test-' . bin2hex(random_bytes(8));
mkdir($root, 0700);
$checks = 0;
$community = new CommunityStorage();
$users = new UserStorage();
foreach ([$community, $users] as $store) {
    $paths = $store instanceof CommunityStorage
        ? ['dataDir' => $root . '/data', 'dataFile' => $root . '/data/community.json', 'rateLimitsFile' => $root . '/data/rates.json', 'uploadsDir' => $root . '/images', 'sessionsDir' => $root . '/sessions']
        : ['dataDir' => $root . '/data', 'dataFile' => $root . '/data/users.json', 'uploadsDir' => $root . '/avatars'];
    foreach ($paths as $key => $value) (new ReflectionProperty($store, $key))->setValue($store, $value);
}
// Ensure pending repair notifications cannot send mail during this test.
foreach (['MAILJET_API_KEY', 'MAILJET_API_SECRET', 'MAILJET_FROM_EMAIL'] as $key) {
    $_ENV[$key] = $_SERVER[$key] = '';
    putenv($key . '=');
}
$mail = new MailjetService();
$auth = new UserAuthService($users, $community, $mail);
$controller = new CommunityController($community, new EmailConfirmationService($mail), $auth, $users, $mail);
$owner = str_repeat('a', 32);
$member = str_repeat('b', 32);
$moderator = str_repeat('c', 32);
$blocked = str_repeat('d', 32);
$users->update(static function (array &$data) use ($owner, $member, $moderator, $blocked): void {
    foreach ([$owner, $member, $moderator, $blocked] as $index => $id) {
        $data['users'][] = ['id' => $id, 'name' => 'test' . $index, 'email' => 'test' . $index . '@example.invalid', 'status' => 'active', 'role' => $id === $moderator ? 'moderator' : 'member', 'communicationBlocked' => $id === $blocked, 'createdAt' => date(DATE_ATOM)];
    }
});
$auth->currentUser();
$as = static function (?string $id, bool $admin = false): void {
    $name = $admin ? 'blacktea_admin' : 'blacktea_user';
    if (session_name() !== $name) {
        session_write_close();
        session_name($name);
        session_id(bin2hex(random_bytes(16)));
        session_start();
    }
    $_COOKIE[$name] = session_id();
    $_SESSION = $admin ? ['admin_email' => 'admin@example.invalid', 'csrf_token' => 'test-csrf'] : ['user_csrf_token' => 'test-csrf'];
    if ($id !== null) $_SESSION['user_id'] = $id;
};
$request = static function (string $method, array $payload = [], string $csrf = 'test-csrf', string $context = ''): Request {
    return Request::create('/', $method, [], [], [], ['HTTP_X_CSRF_TOKEN' => $csrf, 'HTTP_X_STAFF_CONTEXT' => $context, 'CONTENT_TYPE' => 'application/json'], json_encode($payload));
};
$assert = static function (bool $condition, string $label) use (&$checks): void {
    $checks++;
    if (!$condition) throw new RuntimeException($label);
};
$json = static fn (JsonResponse $response): array => json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR);
$status = static function (JsonResponse $response, int $expected, string $label) use ($assert): void {
    $assert($response->getStatusCode() === $expected, $label . ': ' . $response->getContent());
};

try {
    $as($owner);
    $create = Request::create('/api/comments', 'POST', ['guide' => 'community-erfahrungen', 'kind' => 'comment', 'body' => str_repeat('Vollständiger Inhalt. ', 30), 'section' => 'Wildfire'], [], [], ['HTTP_X_CSRF_TOKEN' => 'test-csrf']);
    $status($controller->createComment($create), 201, 'Publish immediately');
    $post = $community->read()['comments'][0];
    $id = $post['id'];
    $assert($post['status'] === 'approved' && $post['approvedAt'] !== null, 'Saved as visible');
    $as(null);
    $status($controller->createComment($create), 401, 'Guests cannot publish');
    $status($controller->communityLike($id, $request('PUT')), 401, 'Guests cannot like');
    $status($controller->communityReplies($id, $request('POST', ['body' => 'Hi'])), 401, 'Guests cannot reply');
    $status($controller->reportCommunityPost($id, $request('POST', ['reason' => 'Spam'])), 401, 'Guests cannot report');
    $status($controller->communityReports($request('GET')), 401, 'Guests cannot read reports');
    $as($blocked);
    $status($controller->communityLike($id, $request('PUT')), 403, 'Blocked member cannot like');
    $status($controller->communityReplies($id, $request('POST', ['body' => 'Hi'])), 403, 'Blocked member cannot comment');
    $status($controller->reportCommunityPost($id, $request('POST', ['reason' => 'Spam'])), 403, 'Blocked member cannot report');
    $as($member);
    $status($controller->communityLike($id, $request('PUT', [], 'wrong')), 403, 'Like CSRF');
    $status($controller->communityReplies($id, $request('POST', ['body' => 'Hi'], 'wrong')), 403, 'Comment CSRF');
    $status($controller->reportCommunityPost($id, $request('POST', ['reason' => 'Spam'], 'wrong')), 403, 'Report CSRF');
    $status($controller->communityReports($request('GET')), 401, 'Members cannot read reports');
    $status($controller->resolveCommunityReport($id, $request('DELETE')), 401, 'Members cannot delete');
    $controller->communityLike($id, $request('PUT'));
    $assert($json($controller->communityLike($id, $request('PUT')))['likeCount'] === 1, 'Duplicate PUT is idempotent');
    $assert(count($users->findById($owner)['notifications']) === 1, 'One like notification');
    $controller->communityLike($id, $request('DELETE'));
    $assert($json($controller->communityLike($id, $request('DELETE')))['likeCount'] === 0, 'Unlike is idempotent');
    $controller->communityLike($id, $request('PUT'));
    $assert(count($users->findById($owner)['notifications']) === 1, 'Re-liking does not spam notifications');
    $status($controller->communityReplies($id, $request('POST', ['body' => '  '])), 400, 'Empty reply rejected');
    $replyResponse = $controller->communityReplies($id, $request('POST', ['body' => 'Meine Antwort <script>literal</script>']));
    $status($replyResponse, 201, 'Reply published');
    $reply = $json($replyResponse)['reply'];
    $assert($reply['profileId'] === $member, 'Reply attributed to authenticated member');
    $assert(!isset($reply['email'], $reply['communityReports']), 'Reply contains no private fields');
    $status($controller->communityReplies($reply['id'], $request('POST', ['body' => 'Nested'])), 404, 'Nested comments not accepted');
    $status($controller->communityLike($reply['id'], $request('PUT')), 200, 'Reply can receive likes');
    $as(null);
    $assert(count($json($controller->communityReplies($id, $request('GET')))['replies']) === 1, 'Guests can read comments');
    $activity = $json($controller->communityActivity($request('GET')))['activities'];
    $assert(count($activity) === 1 && $activity[0]['replyCount'] === 1, 'Replies grouped, not separate feed posts');
    $assert($activity[0]['title'] === 'Community-Beitrag', 'Community posts work without a separate title');
    $assert($activity[0]['body'] === $post['body'], 'Post body is not silently truncated');
    $assert($activity[0]['viewerLiked'] === false && $activity[0]['likeCount'] === 1, 'Guest counts are correct');
    $as($member);
    $controller->reportCommunityPost($id, $request('POST', ['reason' => 'Spamverdacht']));
    $controller->reportCommunityPost($id, $request('POST', ['reason' => 'Doppelte Meldung']));
    $assert(count($community->read()['comments'][0]['communityReports']) === 1, 'Reports deduplicated');
    $assert($community->read()['comments'][0]['status'] === 'approved', 'Report does not automatically hide post');
    $publicFeed = $controller->communityActivity($request('GET'))->getContent();
    $assert(!str_contains($publicFeed, 'Spamverdacht') && !str_contains($publicFeed, 'communityReports') && !str_contains($publicFeed, '@example.invalid'), 'Report details and email stay private');
    $as($moderator);
    $queue = $json($controller->communityReports($request('GET')))['posts'];
    $assert(count($queue) === 1 && $queue[0]['reports'][0]['reason'] === 'Spamverdacht', 'Moderator sees reported post');
    $status($controller->resolveCommunityReport($id, $request('DELETE', [], 'wrong', 'moderator')), 403, 'Deletion CSRF');
    $status($controller->resolveCommunityReport($reply['id'], $request('DELETE', [], 'test-csrf', 'moderator')), 404, 'Moderator cannot delete unreported post through report queue');
    $status($controller->resolveCommunityReport($id, $request('POST', ['action' => 'keep'], 'test-csrf', 'moderator')), 200, 'Moderator can dismiss report');
    $assert(count($json($controller->communityReports($request('GET')))['posts']) === 0, 'Dismissed report leaves queue');
    $as($member);
    $controller->reportCommunityPost($reply['id'], $request('POST', ['reason' => 'Spam im Kommentar']));
    $as(null, true);
    $status($controller->resolveCommunityReport($reply['id'], $request('DELETE', [], 'test-csrf', 'admin')), 200, 'Admin can delete reported comment');
    $assert(count($community->read()['comments']) === 1, 'Deleting reply preserves parent');
    $as($member);
    $controller->communityReplies($id, $request('POST', ['body' => 'Noch ein Kommentar']));
    $controller->reportCommunityPost($id, $request('POST', ['reason' => 'Spam']));
    $as($moderator);
    $status($controller->resolveCommunityReport($id, $request('DELETE', [], 'test-csrf', 'moderator')), 200, 'Moderator can delete reported post');
    $assert($community->read()['comments'] === [], 'Post and associated comments removed');
    $status($controller->communityLike($id, $request('PUT')), 404, 'Deleted post cannot be liked');
    $status($controller->communityReplies($id, $request('GET')), 404, 'Deleted conversation unavailable');
    $status($controller->reportCommunityPost($id, $request('POST', ['reason' => 'Spam'])), 404, 'Deleted post cannot be reported');
    $assert($json($controller->communityActivity($request('GET')))['activities'] === [], 'Deleted content gone from feed');

    require __DIR__ . '/mention-checks.php';
    require __DIR__ . '/feed-pagination-checks.php';

    // A stale admin cookie must not log a moderator out of their user session.
    $as($moderator);
    $userSession = session_id();
    session_write_close();
    session_name('blacktea_admin');
    session_id(bin2hex(random_bytes(16)));
    session_start();
    $_SESSION = [];
    $_COOKIE['blacktea_admin'] = session_id();
    $_COOKIE['blacktea_user'] = $userSession;
    session_write_close();
    $status($controller->communityReports($request('GET')), 200, 'Moderator with stale admin cookie can read report queue');
    $assert($auth->currentUser()['id'] === $moderator, 'User session remains intact after staff check');
    $as(null, true);
    $status($controller->communityReports($request('GET', [], 'test-csrf', 'moderator')), 200, 'Explicit moderator context switches away from active admin session');
    $assert($auth->currentUser()['id'] === $moderator, 'Moderator cookie selected correctly');
    $status($controller->communityReports($request('GET', [], 'test-csrf', 'admin')), 200, 'Explicit admin context switches back to admin cookie');
    require __DIR__ . '/admin-profile-checks.php';
    require __DIR__ . '/admin-member-confirmation-checks.php';
    require __DIR__ . '/workshop-checks.php';
    require __DIR__ . '/mention-suggestion-checks.php';
    require __DIR__ . '/self-review-checks.php';
    require __DIR__ . '/review-editing-checks.php';
    require __DIR__ . '/repair-request-membership-checks.php';

    // Repair discussions have one canonical home. Legacy feed replies remain visible on the request,
    // while the old community-reply write path is closed for new repair discussions.
    $legacyRequestId = str_repeat('1', 32);
    $legacyReplyId = str_repeat('2', 32);
    $now = date(DATE_ATOM);
    $community->update(static function (array &$data) use ($owner, $member, $legacyRequestId, $legacyReplyId, $now): void {
        $data['comments'][] = [
            'id' => $legacyRequestId, 'guide' => 'hilfe-anfragen', 'kind' => 'repair_request', 'status' => 'approved',
            'userId' => $owner, 'name' => 'test0', 'email' => 'test0@example.invalid', 'topic' => 'Legacy-Reparaturfrage',
            'body' => 'Eine alte Reparaturfrage mit einem Community-Kommentar.', 'section' => 'Bonfire',
            'source' => null, 'parentId' => null, 'createdAt' => $now, 'approvedAt' => $now,
            'imageFile' => null, 'imageMime' => null,
        ];
        $data['comments'][] = [
            'id' => $legacyReplyId, 'guide' => 'community-erfahrungen', 'kind' => 'community_reply', 'status' => 'approved',
            'userId' => $member, 'name' => 'test1', 'email' => 'test1@example.invalid', 'topic' => null,
            'body' => 'Der alte Kommentar bleibt bei der Reparaturfrage sichtbar.', 'section' => 'Bonfire',
            'source' => null, 'parentId' => $legacyRequestId, 'createdAt' => $now, 'approvedAt' => $now,
            'imageFile' => null, 'imageMime' => null,
        ];
    });
    $as(null);
    $repairFeedback = $json($controller->readFeedback('hilfe-anfragen'));
    $legacyComments = array_values(array_filter($repairFeedback['comments'], static fn (array $comment): bool => $comment['id'] === $legacyReplyId));
    $assert(count($legacyComments) === 1 && $legacyComments[0]['kind'] === 'community_reply', 'Legacy repair comments appear on the repair request');
    $repairFeed = $json($controller->communityActivity($request('GET')));
    $legacyActivity = array_values(array_filter($repairFeed['activities'], static fn (array $activity): bool => $activity['id'] === $legacyRequestId));
    $assert(count($legacyActivity) === 1 && $legacyActivity[0]['type'] === 'repair_request' && $legacyActivity[0]['replyCount'] === 1, 'Repair requests expose their unified answer count in the feed');
    $as($member);
    $status($controller->communityReplies($legacyRequestId, $request('POST', ['body' => 'Zweiter Antwortweg'])), 409, 'Community replies are closed for repair requests');

    // Production must not expose local demo fixtures, while keeping them available for local QA.
    $previousAppEnv = [
        'env' => $_ENV['APP_ENV'] ?? null,
        'server' => $_SERVER['APP_ENV'] ?? null,
        'process' => getenv('APP_ENV'),
    ];
    try {
        $_ENV['APP_ENV'] = $_SERVER['APP_ENV'] = 'prod';
        putenv('APP_ENV=prod');
        $demoUser = str_repeat('e', 32);
        $demoPost = str_repeat('f', 32);
        $community->update(static function (array &$data) use ($demoUser, $demoPost, $now): void {
            $data['comments'][] = [
                'id' => $demoPost, 'guide' => 'community-erfahrungen', 'kind' => 'comment', 'status' => 'approved',
                'userId' => $demoUser, 'name' => 'lokaler Test', 'email' => 'local@btm.test', 'topic' => null,
                'body' => 'Ein lokaler Testbeitrag darf nicht im Produktionsfeed erscheinen.', 'section' => 'Bonfire',
                'source' => null, 'parentId' => null, 'createdAt' => $now, 'approvedAt' => $now,
                'imageFile' => null, 'imageMime' => null,
            ];
        });
        $users->update(static function (array &$data) use ($demoUser, $now): void {
            $data['users'][] = [
                'id' => $demoUser, 'name' => 'lokaler Test', 'email' => 'local@btm.test', 'status' => 'active',
                'role' => 'member', 'isLocalDemo' => true, 'country' => 'D', 'postalCode' => '01219',
                'kilometers' => 500, 'createdAt' => $now,
            ];
        });
        $as(null);
        $productionActivity = $json($controller->communityActivity($request('GET')));
        $assert(!in_array($demoPost, array_column($productionActivity['activities'], 'id'), true), 'Production hides demo posts from feed');
        $assert($json($controller->readFeedback('community-erfahrungen'))['comments'] === [], 'Production hides demo posts from feedback');
        $status($controller->publicProfile($demoUser), 404, 'Production hides demo profiles');
        $assert($json($controller->communityMap())['totalKilometers'] === 0, 'Production hides demo profiles from map');
    } finally {
        if ($previousAppEnv['env'] === null) unset($_ENV['APP_ENV']); else $_ENV['APP_ENV'] = $previousAppEnv['env'];
        if ($previousAppEnv['server'] === null) unset($_SERVER['APP_ENV']); else $_SERVER['APP_ENV'] = $previousAppEnv['server'];
        if ($previousAppEnv['process'] === false) putenv('APP_ENV'); else putenv('APP_ENV=' . $previousAppEnv['process']);
    }
} finally {
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) { $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname()); }
    rmdir($root);
}
echo "Community interactions: $checks checks passed.\n";
