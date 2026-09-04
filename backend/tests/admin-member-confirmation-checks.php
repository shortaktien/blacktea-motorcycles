<?php

// Manual email confirmation is an admin-only account recovery action.
$pendingId = str_repeat('8', 32);
$pendingEmail = 'manual-confirmation@example.invalid';
$users->update(static function (array &$data) use ($pendingId, $pendingEmail): void {
    $data['users'][] = [
        'id' => $pendingId,
        'name' => 'pendingmember',
        'email' => $pendingEmail,
        'status' => 'awaiting_confirmation',
        'role' => 'member',
        'emailConfirmationTokenHash' => 'manual-token',
        'emailConfirmationExpiresAt' => date(DATE_ATOM),
    ];
});

$as(null);
unset($_COOKIE['blacktea_admin']);
$status($controller->confirmUserEmail($pendingId, $request('PATCH')), 401, 'Members cannot manually confirm email addresses');

$as(null, true);
$status($controller->confirmUserEmail($pendingId, $request('PATCH', [], 'wrong')), 403, 'Manual confirmation requires admin CSRF');
$confirmation = $controller->confirmUserEmail($pendingId, $request('PATCH'));
$status($confirmation, 200, 'Admin can manually confirm a pending email');
$confirmedMember = $json($confirmation)['member'];
$assert($confirmedMember['status'] === 'active', 'Manual confirmation returns an active member');
$assert($json($confirmation)['message'] === 'E-Mail manuell bestätigt. Das Mitglied kann sich jetzt einloggen.', 'Manual confirmation explains the account is ready');

$storedMember = $users->findById($pendingId);
$assert(is_array($storedMember) && $storedMember['status'] === 'active', 'Manual confirmation persists the active status');
$assert(is_string($storedMember['emailConfirmedAt'] ?? null), 'Manual confirmation records a confirmation timestamp');
$assert(($storedMember['emailConfirmationMethod'] ?? null) === 'admin_manual', 'Manual confirmation records its method');
$assert(($storedMember['emailConfirmedBy'] ?? null) === 'admin@example.invalid', 'Manual confirmation records the admin actor');
$assert(!isset($storedMember['emailConfirmationTokenHash'], $storedMember['emailConfirmationExpiresAt']), 'Manual confirmation removes stale confirmation tokens');

$again = $controller->confirmUserEmail($pendingId, $request('PATCH'));
$status($again, 200, 'Manual confirmation is idempotent for active members');
$assert($json($again)['message'] === 'Mitglied ist bereits freigeschaltet.', 'Repeated manual confirmation explains the current status');
