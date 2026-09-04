<?php

use Symfony\Component\HttpFoundation\Request;

$requestNumber = 0;
$newRepairRequest = static function (string $csrf = 'test-csrf') use (&$requestNumber): Request {
    return Request::create('/api/comments', 'POST', [
        'guide' => 'hilfe-anfragen', 'kind' => 'repair_request', 'topic' => 'Membership test',
        'body' => 'Isolated test description for a repair request.', 'section' => 'Bonfire',
        'name' => 'Forged author', 'email' => 'selfreview@example.invalid', 'userId' => 'forged-id',
    ], [], [], ['HTTP_X_CSRF_TOKEN' => $csrf, 'REMOTE_ADDR' => '192.0.2.' . ++$requestNumber]);
};
$before = $community->read()['comments'];
$as(null);
$status($controller->createComment($newRepairRequest()), 401, 'Guest cannot create repair request even with registered email');
$as($reviewerId);
$status($controller->createComment($newRepairRequest('')), 403, 'Repair request requires session CSRF token');
$status($controller->createComment($newRepairRequest('wrong')), 403, 'Wrong repair request CSRF rejected');
$pendingId = md5('pending-repair-member');
$users->update(static function (array &$data) use ($pendingId): void {
    $data['users'][] = ['id' => $pendingId, 'name' => 'pendingrepair', 'email' => 'pendingrepair@example.invalid', 'status' => 'awaiting_confirmation', 'role' => 'member'];
});
$as($pendingId);
$status($controller->createComment($newRepairRequest()), 401, 'Unconfirmed member cannot create repair request');
$as($blocked);
$status($controller->createComment($newRepairRequest()), 403, 'Blocked member cannot create repair request');
$assert($community->read()['comments'] === $before, 'Rejected repair submissions do not create pending or guest records');
$as($reviewerId);
$status($controller->createComment($newRepairRequest()), 202, 'Authenticated member can submit repair request for review');
$created = array_values(array_filter($community->read()['comments'], static fn (array $item): bool => ($item['topic'] ?? '') === 'Membership test'))[0];
$assert($created['userId'] === $reviewerId && $created['name'] === 'selfreview', 'Author comes only from authenticated account');
$assert($created['status'] === 'pending' && !isset($created['emailConfirmationTokenHash']), 'Member request stays moderated without guest confirmation flow');
$as(null);
$status($controller->readFeedback('hilfe-anfragen'), 200, 'Reading repair board remains public');

// Answers use the same membership boundary, with an approved request as parent.
$answerParentId = $created['id'];
$community->update(static function (array &$data) use ($answerParentId): void {
    foreach ($data['comments'] as &$comment) {
        if ($comment['id'] === $answerParentId) $comment['status'] = 'approved';
    }
});
$newRepairAnswer = static function (string $csrf = 'test-csrf') use (&$requestNumber, $answerParentId): Request {
    return Request::create('/api/comments', 'POST', [
        'guide' => 'hilfe-anfragen', 'kind' => 'repair_answer', 'parentId' => $answerParentId,
        'body' => 'Isolated membership test answer.',
        'name' => 'Forged author', 'email' => 'selfreview@example.invalid', 'userId' => 'forged-id',
    ], [], [], ['HTTP_X_CSRF_TOKEN' => $csrf, 'REMOTE_ADDR' => '192.0.2.' . ++$requestNumber]);
};
$before = $community->read()['comments'];
$as(null);
$status($controller->createComment($newRepairAnswer()), 401, 'Guest cannot answer using registered identity');
$as($reviewerId);
$status($controller->createComment($newRepairAnswer('')), 403, 'Answer requires CSRF');
$status($controller->createComment($newRepairAnswer('wrong')), 403, 'Wrong answer CSRF rejected');
$as($pendingId);
$status($controller->createComment($newRepairAnswer()), 401, 'Unconfirmed member cannot answer');
$as($blocked);
$status($controller->createComment($newRepairAnswer()), 403, 'Blocked member cannot answer');
$assert($community->read()['comments'] === $before, 'Rejected answers leave storage unchanged');
$as($reviewerId);
$status($controller->createComment($newRepairAnswer()), 202, 'Member can submit answer for review');
$answer = array_values(array_filter($community->read()['comments'], static fn (array $item): bool => ($item['body'] ?? '') === 'Isolated membership test answer.'))[0];
$assert($answer['userId'] === $reviewerId && $answer['name'] === 'selfreview', 'Answer author comes from session');
$assert($answer['status'] === 'pending' && !isset($answer['emailConfirmationTokenHash']), 'Member answer remains moderated without guest confirmation');
$as(null);
$status($controller->readFeedback('hilfe-anfragen'), 200, 'Repair answers remain publicly readable');
