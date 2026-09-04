<?php

$seedReview();
$as($reviewerId);
$reviewMentionId = md5('review-mention-target');
$users->update(static function (array &$data) use ($reviewMentionId): void {
    $data['users'][] = ['id' => $reviewMentionId, 'name' => 'reviewtarget', 'email' => 'reviewtarget@example.invalid', 'role' => 'member', 'status' => 'active'];
});
$versionFor = static function (string $id) use ($controller, $request, $json): string {
    $queue = $json($controller->adminComments($request('GET', [], 'test-csrf', 'moderator')))['comments'];
    foreach ($queue as $item) if ($item['id'] === $id) return $item['reviewVersion'];
    throw new RuntimeException('Review fixture missing');
};
$editPayload = ['status' => 'approved', 'reviewVersion' => $versionFor($otherId), 'edits' => ['body' => 'Ergänzter Text mit /faq als internem Link und @reviewtarget.', 'topic' => 'Überarbeiteter Titel', 'source' => '/bikes/bonfire']];
$response = $controller->updateComment($otherId, $request('PATCH', $editPayload, 'test-csrf', 'moderator'));
$status($response, 200, 'Moderator can edit and accept someone else’s contribution atomically');
$edited = $json($response)['comment'];
$assert($edited['body'] === $editPayload['edits']['body'] && $edited['source'] === '/bikes/bonfire' && $edited['status'] === 'approved', 'Edited text and source published on acceptance');
$assert($edited['editAttribution']['profileId'] === $reviewerId && $edited['editAttribution']['name'] === 'selfreview', 'Editor credit uses authenticated reviewer');
$assert($edited['name'] === 'Previous name', 'Original authorship retained');
$assert(!isset($edited['originalContent'], $edited['editedBy']), 'Private revision data not serialized');
$stored = array_values(array_filter($community->read()['comments'], static fn (array $item): bool => $item['id'] === $otherId))[0];
$assert($stored['originalContent']['body'] === 'Isolated self-review fixture', 'Original text preserved privately');
$assert($edited['mentions'][0]['id'] === $reviewMentionId, 'New mentions resolved in accepted edited text');
$assert(count($users->findById($reviewMentionId)['notifications']) === 1, 'Newly mentioned member notified only after acceptance');

$seedReview();
$editPayload['reviewVersion'] = $versionFor($otherId);
$unchanged = $community->read();
$status($controller->updateComment($ownId, $request('PATCH', $editPayload, 'test-csrf', 'moderator')), 403, 'Editing cannot bypass self-review guard');
$status($controller->updateComment($guestId, $request('PATCH', $editPayload, 'test-csrf', 'moderator')), 403, 'Own guest submission cannot be edited for acceptance');
$status($controller->updateComment($otherId, $request('PATCH', $editPayload, 'wrong', 'moderator')), 403, 'Review editing requires CSRF');
foreach ([['body' => ''], ['body' => ['bad']], ['body' => str_repeat('x', 4001)], ['source' => str_repeat('x', 501)], ['userId' => $reviewerId], ['editedBy' => ['id' => $reviewerId]]] as $badEdits) {
    $status($controller->updateComment($otherId, $request('PATCH', array_replace($editPayload, ['edits' => $badEdits]), 'test-csrf', 'moderator')), 400, 'Invalid or unauthorized editable field rejected');
}
$status($controller->updateComment($otherId, $request('PATCH', array_replace($editPayload, ['status' => 'pending']), 'test-csrf', 'moderator')), 400, 'Editing cannot publish before acceptance');
$status($controller->updateComment($otherId, $request('PATCH', array_replace($editPayload, ['reviewVersion' => 'stale']), 'test-csrf', 'moderator')), 409, 'Stale editor cannot overwrite newer review');
$assert($community->read() === $unchanged, 'Rejected edits leave content and status unchanged');
$noop = $controller->updateComment($otherId, $request('PATCH', array_replace($editPayload, ['edits' => ['body' => 'Isolated self-review fixture', 'topic' => '', 'source' => '']]), 'test-csrf', 'moderator'));
$status($noop, 200, 'Unchanged text can be accepted');
$assert($json($noop)['comment']['editAttribution'] === null, 'No false editor credit for unchanged acceptance');

$seedReview();
$as(null, true);
$adminPayload = ['status' => 'approved', 'edits' => ['body' => 'Admin hat den Beitrag sinnvoll ergänzt.']];
$adminQueue = $json($controller->adminComments($request('GET', [], 'test-csrf', 'admin')))['comments'];
foreach ($adminQueue as $item) if ($item['id'] === $ownId) $adminPayload['reviewVersion'] = $item['reviewVersion'];
$status($controller->updateComment($ownId, $request('PATCH', $adminPayload, 'test-csrf', 'admin')), 200, 'Admin can edit and accept moderator contribution');

$seedReview();
// Reported content uses the same editor but is saved with the keep decision.
$community->update(static function (array &$data) use ($otherId): void {
    foreach ($data['comments'] as &$item) if ($item['id'] === $otherId) {
        $item['status'] = 'approved';
        $item['communityReports'] = [['reason' => 'Review test', 'createdAt' => date(DATE_ATOM)]];
    }
});
$as($reviewerId);
$reports = $json($controller->communityReports($request('GET', [], 'test-csrf', 'moderator')))['posts'];
foreach ($reports as $item) if ($item['id'] === $otherId) $reportVersion = $item['reviewVersion'];
$status($controller->resolveCommunityReport($otherId, $request('POST', ['action' => 'keep', 'edits' => ['body' => 'Korrigierter gemeldeter Beitrag mit /faq.'], 'reviewVersion' => $reportVersion], 'test-csrf', 'moderator')), 200, 'Reported contribution can be edited when kept');
$reportedEdited = array_values(array_filter($community->read()['comments'], static fn (array $item): bool => $item['id'] === $otherId))[0];
$assert($reportedEdited['communityReports'] === [] && $reportedEdited['editedBy']['id'] === $reviewerId, 'Report closure and editor credit stored together');
