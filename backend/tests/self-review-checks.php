<?php

use Symfony\Component\HttpFoundation\Request;

$reviewerId = md5('self-review-moderator');
$reviewerEmail = 'selfreview@example.invalid';
$users->update(static function (array &$data) use ($reviewerId, $reviewerEmail): void {
    $data['users'][] = ['id' => $reviewerId, 'name' => 'selfreview', 'email' => $reviewerEmail, 'status' => 'active', 'role' => 'moderator'];
});
$ownId = md5('self-review-post');
$otherId = md5('other-review-post');
$guestId = md5('self-review-guest');
$reportId = md5('self-review-report');
$seedReview = static function () use ($community, $reviewerId, $reviewerEmail, $ownId, $otherId, $guestId, $reportId): void {
    $community->update(static function (array &$data) use ($reviewerId, $reviewerEmail, $ownId, $otherId, $guestId, $reportId): void {
        $data['comments'] = [];
        foreach ([$ownId, $otherId, $guestId, $reportId] as $id) {
            $data['comments'][] = ['id' => $id, 'userId' => $id === $guestId ? null : ($id === $otherId ? md5('other-user') : $reviewerId), 'name' => 'Previous name', 'email' => $id === $guestId ? strtoupper($reviewerEmail) : 'old-address@example.invalid', 'guide' => 'bonfire', 'kind' => 'wiki_suggestion', 'body' => 'Isolated self-review fixture', 'status' => $id === $reportId ? 'approved' : 'pending', 'createdAt' => date(DATE_ATOM), 'communityReports' => $id === $reportId ? [['reason' => 'Test report', 'createdAt' => date(DATE_ATOM)]] : []];
        }
        $data['comments'][] = ['id' => md5('self-review-parent'), 'userId' => md5('other-owner'), 'name' => 'Other owner', 'email' => 'other@example.invalid', 'guide' => 'hilfe-anfragen', 'kind' => 'repair_request', 'body' => 'Parent fixture', 'status' => 'approved', 'createdAt' => date(DATE_ATOM), 'solutionAnswerId' => $ownId];
    });
};
$seedReview();
$as($reviewerId);
$beforeReview = $community->read();
$status($controller->updateComment($ownId, $request('PATCH', ['status' => 'approved'], 'test-csrf', 'moderator')), 403, 'Moderator cannot approve own post via direct API');
$status($controller->updateComment($ownId, $request('PATCH', ['status' => 'pending'], 'test-csrf', 'moderator')), 403, 'Moderator cannot change own review status');
$status($controller->deleteComment($ownId, $request('DELETE', [], 'test-csrf', 'moderator')), 403, 'Moderator cannot reject own post through delete');
$status($controller->updateComment($guestId, $request('PATCH', ['status' => 'approved'], 'test-csrf', 'moderator')), 403, 'Historical guest contribution matched by case-insensitive email');
$status($controller->resolveCommunityReport($reportId, $request('POST', ['action' => 'keep'], 'test-csrf', 'moderator')), 403, 'Moderator cannot dismiss report on own post');
$status($controller->resolveCommunityReport($reportId, $request('DELETE', [], 'test-csrf', 'moderator')), 403, 'Moderator cannot delete own reported post via moderation');
$assert($community->read() === $beforeReview, 'Denied self-review leaves all content and reports unchanged');
$status($controller->updateComment($ownId, $request('PATCH', ['status' => 'approved'], 'wrong', 'moderator')), 403, 'Self-review does not bypass CSRF');
$status($controller->updateComment($ownId, $request('PATCH', ['status' => 'approved'])), 403, 'Default context cannot bypass self-review');
unset($_COOKIE['blacktea_admin']);
$status($controller->updateComment($ownId, $request('PATCH', ['status' => 'approved'], 'test-csrf', 'admin')), 401, 'Claiming admin context without admin session fails');
$auth->currentUser(); // Reopen the user session after the rejected context switch.
$as($reviewerId);
$queue = $json($controller->adminComments($request('GET', [], 'test-csrf', 'moderator')))['comments'];
$ownQueue = array_values(array_filter($queue, static fn (array $item): bool => $item['id'] === $ownId));
$assert($ownQueue[0]['canModerate'] === false, 'Own pending item has no review actions');
$assert($json($controller->communityReports($request('GET', [], 'test-csrf', 'moderator')))['posts'][0]['canModerate'] === false, 'Own report has no review actions');
$status($controller->updateComment($otherId, $request('PATCH', ['status' => 'approved'], 'test-csrf', 'moderator')), 200, 'Other-user review remains available');
$seedReview();
$status($controller->deleteComment($otherId, $request('DELETE', [], 'test-csrf', 'moderator')), 200, 'Moderator can still reject other-user contribution');
$seedReview();
$community->update(static function (array &$data) use ($otherId, $reviewerEmail): void {
    foreach ($data['comments'] as &$comment) if ($comment['id'] === $otherId) $comment['email'] = $reviewerEmail;
});
$status($controller->updateComment($otherId, $request('PATCH', ['status' => 'approved'], 'test-csrf', 'moderator')), 200, 'Explicit different owner ID takes precedence over legacy email');
// Simultaneous admin/user cookies must not upgrade an explicit moderator action.
$as(null, true);
$status($controller->updateComment($ownId, $request('PATCH', ['status' => 'approved'], 'test-csrf', 'moderator')), 403, 'Admin cookie cannot bypass moderator-context self-review');
$status($controller->updateComment($ownId, $request('PATCH', ['status' => 'approved'], 'test-csrf', 'admin')), 200, 'Explicit admin review remains permitted');
$status($controller->resolveCommunityReport($reportId, $request('POST', ['action' => 'keep'], 'test-csrf', 'admin')), 200, 'Admin can resolve reported moderator post');

// Reviewing a parent must not erase unresolved reports against the reviewer's reply.
$seedReview();
$community->update(static function (array &$data) use ($otherId, $reportId): void {
    foreach ($data['comments'] as &$comment) {
        if ($comment['id'] === $otherId) {
            $comment['status'] = 'approved';
            $comment['communityReports'] = [['reason' => 'Parent report', 'createdAt' => date(DATE_ATOM)]];
        }
        if ($comment['id'] === $reportId) {
            $comment['kind'] = 'community_reply';
            $comment['parentId'] = $otherId;
        }
    }
});
$as($reviewerId);
$beforeCascade = $community->read();
$status($controller->resolveCommunityReport($otherId, $request('DELETE', [], 'test-csrf', 'moderator')), 403, 'Deleting parent cannot bypass own reported reply protection');
$assert($community->read() === $beforeCascade, 'Denied cascade preserves parent, own reply and reports');
$reportQueue = $json($controller->communityReports($request('GET', [], 'test-csrf', 'moderator')))['posts'];
$parentQueue = array_values(array_filter($reportQueue, static fn (array $item): bool => $item['id'] === $otherId));
$assert($parentQueue[0]['canModerate'] === true && $parentQueue[0]['canDelete'] === false, 'Parent can be kept but deletion requires independent reviewer');
$as(null, true);
$status($controller->resolveCommunityReport($otherId, $request('DELETE', [], 'test-csrf', 'admin')), 200, 'Admin can delete reported parent and its replies');
