<?php

// Isolated admin login/profile regression checks. Never use real credentials.
use App\Controller\AuthController;
use App\Service\EmailConfirmationService;

$oldAdminEnv = [];
foreach (['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_PASSWORD_HASH'] as $key) $oldAdminEnv[$key] = [$_ENV[$key] ?? null, $_SERVER[$key] ?? null, getenv($key)];
$configureAdmin = static function (string $email): void {
    foreach (['ADMIN_EMAIL' => $email, 'ADMIN_PASSWORD' => 'isolated-admin-password', 'ADMIN_PASSWORD_HASH' => ''] as $key => $value) {
        $_ENV[$key] = $_SERVER[$key] = $value;
        putenv($key . '=' . $value);
    }
};
$openSession = static function (string $name): void {
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    session_name($name);
    session_id($_COOKIE[$name] ?? '');
    session_start();
};
$authController = new AuthController($users, $auth, $community, new EmailConfirmationService($mail), $mail);
try {
    $configureAdmin('newadmin@example.invalid');
    $as(null);
    $beforeCount = count($users->read()['users']);
    $assert($auth->connectAdminProfile() === null, 'Unrelated admin cookie cannot create a configured admin profile');
    $assert(count($users->read()['users']) === $beforeCount, 'No profile created without admin authentication');
    $status($controller->login($request('POST', ['email' => 'newadmin@example.invalid', 'password' => 'wrong'])), 401, 'Wrong admin credentials rejected');
    $assert(count($users->read()['users']) === $beforeCount, 'Failed login creates no profile');
    $users->update(static function (array &$data) use ($owner): void { foreach ($data['users'] as &$user) if ($user['id'] === $owner) $user['name'] = 'admin'; });
    $loginResult = $controller->login($request('POST', ['email' => 'newadmin@example.invalid', 'password' => 'isolated-admin-password']));
    $status($loginResult, 200, 'Admin login succeeds and links profile');
    $profile = $auth->currentUser();
    $assert($profile !== null && $profile['isAdminProfile'] && $profile['name'] === 'admin2', 'Admin receives unique editable handle');
    $assert($profile['status'] === 'active' && $profile['role'] === 'member', 'Profile is active but does not grant administrative privileges');
    $assert($profile['postalCode'] === '' && $profile['kilometers'] === 0 && $profile['newsletterSubscribed'] === false, 'No location, mileage or newsletter consent invented');
    $assert($json($loginResult)['profileId'] === $profile['id'], 'Login returns linked profile ID');
    $assert($auth->resolveMentions('@admin2')[0]['id'] === $profile['id'], 'Admin profile can be mentioned');
    $staffMention = ['id' => bin2hex(random_bytes(16)), 'authorId' => $moderator, 'authorName' => 'test2', 'authorRole' => 'moderator', 'body' => 'Hallo @admin2', 'createdAt' => date(DATE_ATOM)];
    $community->update(static function (array &$data) use ($staffMention): void { $data['staffChat'][] = $staffMention; });
    $auth->notifyMentions($staffMention, '/konto?bereich=chat', true);
    $assert($users->findById($profile['id'])['notifications'][0]['href'] === '/admin?bereich=chat', 'Mentioned admin receives staff notification with correct admin-chat link');
    $public = $auth->publicProfile($profile);
    $assert(!isset($public['email'], $public['passwordHash']), 'Public admin profile does not expose credentials or email');
    $assert($auth->validCsrfToken($auth->csrfToken()), 'Linked user session has its own CSRF token');
    $assert(!$json($controller->session())['authenticated'], 'A driver session alone grants no admin privileges');
    $firstId = $profile['id'];
    $countAfter = count($users->read()['users']);
    $controller->login($request('POST', ['email' => 'newadmin@example.invalid', 'password' => 'isolated-admin-password']));
    $assert($auth->currentUser()['id'] === $firstId && count($users->read()['users']) === $countAfter, 'Repeated admin login reuses the profile');

    // Simulate an existing admin login whose driver cookie is absent.
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    unset($_COOKIE['blacktea_user']);
    session_name('blacktea_user'); session_id(''); session_start(); $_SESSION = [];
    $restored = $json($authController->session());
    $assert($restored['authenticated'] && $restored['user']['id'] === $firstId, 'Existing admin session automatically restores its driver profile');
    $openSession('blacktea_admin');
    $adminToken = $_SESSION['csrf_token'];
    $status($controller->logout($request('POST', [], 'incorrect')), 403, 'Admin logout still requires correct CSRF');
    $status($controller->logout($request('POST', [], $adminToken)), 200, 'Admin logout ends linked profile session');
    $assert(!$json($authController->session())['authenticated'], 'Admin logout does not silently log the driver back in');

    // An existing active account keeps its identity and settings.
    $configureAdmin('test1@example.invalid');
    $users->update(static function (array &$data) use ($member): void {
        foreach ($data['users'] as &$user) if ($user['id'] === $member) {
            $user['bio'] = 'Existing biography'; $user['kilometers'] = 4321;
            $user['passwordHash'] = password_hash('existing-member-password', PASSWORD_DEFAULT);
        }
    });
    $countBeforeReuse = count($users->read()['users']);
    $controller->login($request('POST', ['email' => 'test1@example.invalid', 'password' => 'isolated-admin-password']));
    $reused = $auth->currentUser();
    $assert($reused['id'] === $member && count($users->read()['users']) === $countBeforeReuse, 'Existing account reused by verified admin email');
    $assert($reused['name'] === 'test1' && $reused['bio'] === 'Existing biography' && $reused['kilometers'] === 4321, 'Existing settings preserved');
    $assert(password_verify('existing-member-password', $reused['passwordHash']), 'Active account password preserved');
    $status($authController->logout($request('POST', [], $auth->csrfToken())), 200, 'Driver-menu logout succeeds');
    $assert(!$json($authController->session())['authenticated'], 'Driver logout also stops admin auto-login');
    $openSession('blacktea_admin');
    $assert(!$json($controller->session())['authenticated'], 'Driver logout removes admin authority');

    // A malicious unverified registration cannot retain its password after linking.
    $pendingId = str_repeat('9', 32);
    $users->update(static function (array &$data) use ($pendingId): void {
        $data['users'][] = ['id' => $pendingId, 'name' => 'unverified', 'email' => 'pendingadmin@example.invalid', 'status' => 'awaiting_confirmation', 'role' => 'member', 'passwordHash' => password_hash('attacker-password', PASSWORD_DEFAULT), 'emailConfirmationTokenHash' => 'old-confirmation', 'passwordResetTokenHash' => 'old-reset'];
    });
    $configureAdmin('pendingadmin@example.invalid');
    $controller->login($request('POST', ['email' => 'pendingadmin@example.invalid', 'password' => 'isolated-admin-password']));
    $claimed = $auth->currentUser();
    $assert($claimed['id'] === $pendingId && $claimed['status'] === 'active', 'Verified admin can claim an unverified email registration');
    $assert(!password_verify('attacker-password', $claimed['passwordHash']) && !isset($claimed['emailConfirmationTokenHash'], $claimed['passwordResetTokenHash']), 'Unverified password and recovery tokens invalidated');
    $auth->logout();
} finally {
    foreach ($oldAdminEnv as $key => [$env, $server, $process]) {
        if ($env === null) unset($_ENV[$key]); else $_ENV[$key] = $env;
        if ($server === null) unset($_SERVER[$key]); else $_SERVER[$key] = $server;
        $process === false ? putenv($key) : putenv($key . '=' . $process);
    }
}
