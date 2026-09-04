<?php

namespace App\Service;

trait AdminProfileAuthTrait
{
    public function isConfiguredAdminProfile(array $user): bool
    {
        $email = strtolower(trim((string) ($_ENV['ADMIN_EMAIL'] ?? $_SERVER['ADMIN_EMAIL'] ?? getenv('ADMIN_EMAIL'))));
        return $email !== '' && ($user['isAdminProfile'] ?? false) === true && strtolower($user['email'] ?? '') === $email;
    }

    /** Bridge only an already authenticated, configured admin session. */
    public function connectAdminProfile(bool $force = false): ?array
    {
        if (!$force) {
            $user = $this->currentUser();
            if ($user !== null) return $user;
        }
        $userSessionId = session_status() === PHP_SESSION_ACTIVE && session_name() === 'blacktea_user'
            ? session_id() : $this->profileSessionCookie('blacktea_user');
        $adminSessionId = session_status() === PHP_SESSION_ACTIVE && session_name() === 'blacktea_admin'
            ? session_id() : $this->profileSessionCookie('blacktea_admin');
        if ($adminSessionId === '') return null;

        $this->switchProfileSession('blacktea_admin', $adminSessionId);
        $email = $_SESSION['admin_email'] ?? null;
        $configuredEmail = strtolower(trim((string) ($_ENV['ADMIN_EMAIL'] ?? $_SERVER['ADMIN_EMAIL'] ?? getenv('ADMIN_EMAIL'))));
        if (!is_string($email) || $configuredEmail === '' || !hash_equals($configuredEmail, strtolower(trim($email)))) {
            $this->switchProfileSession('blacktea_user', $userSessionId);
            return null;
        }

        $profile = $this->users->findByEmail($configuredEmail);
        if ($profile === null || !($profile['isAdminProfile'] ?? false) || ($profile['status'] ?? null) !== 'active') {
            $this->users->update(static function (array &$data) use ($configuredEmail, &$profile): void {
                foreach ($data['users'] as &$candidate) {
                    if (strtolower($candidate['email']) !== $configuredEmail) continue;
                    // An unverified registration must not retain an attacker-chosen password
                    // or confirmation/reset token when the real admin takes ownership.
                    if (($candidate['status'] ?? null) !== 'active') {
                        $candidate['passwordHash'] = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
                        unset($candidate['emailConfirmationTokenHash'], $candidate['emailConfirmationExpiresAt'], $candidate['passwordResetTokenHash'], $candidate['passwordResetExpiresAt']);
                    }
                    $candidate['status'] = 'active';
                    $candidate['isAdminProfile'] = true;
                    $candidate['emailConfirmedAt'] ??= date(DATE_ATOM);
                    $profile = $candidate;
                    return;
                }
                unset($candidate);
                $names = array_map(static fn (array $user): string => mb_strtolower($user['name'], 'UTF-8'), $data['users']);
                $name = 'admin';
                for ($suffix = 2; in_array($name, $names, true); $suffix++) $name = 'admin' . $suffix;
                $profile = [
                    'id' => bin2hex(random_bytes(16)), 'name' => $name, 'email' => $configuredEmail,
                    'passwordHash' => password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),
                    'status' => 'active', 'role' => 'member', 'isAdminProfile' => true,
                    'createdAt' => date(DATE_ATOM), 'emailConfirmedAt' => date(DATE_ATOM),
                    'model' => null, 'kilometers' => 0, 'bio' => '', 'country' => null, 'postalCode' => '',
                    'avatarStyle' => 0, 'avatarFile' => null, 'avatarMime' => null,
                    'notifyReplies' => true, 'notifyCommunity' => true, 'newsletterSubscribed' => false, 'notifications' => [],
                ];
                $data['users'][] = $profile;
            });
        }
        $_SESSION['admin_profile_id'] = $profile['id'];
        $this->switchProfileSession('blacktea_user', $userSessionId);
        $this->login($profile);
        $_SESSION['linked_admin_session'] = $adminSessionId;
        $_COOKIE['blacktea_user'] = session_id();
        return $this->users->findById($profile['id']);
    }

    /** End only the driver session linked to the admin session being logged out. */
    public function disconnectAdminProfile(): void
    {
        $adminId = session_id();
        $userId = $this->profileSessionCookie('blacktea_user');
        if ($userId !== '') {
            $this->switchProfileSession('blacktea_user', $userId);
            if (($_SESSION['linked_admin_session'] ?? null) === $adminId) $this->destroyProfileSession();
        }
        $this->switchProfileSession('blacktea_admin', $adminId);
    }

    private function profileSessionCookie(string $name): string
    {
        $value = $_COOKIE[$name] ?? null;
        return is_string($value) && preg_match('/^[a-zA-Z0-9,-]{1,256}$/D', $value) === 1 ? $value : '';
    }

    private function switchProfileSession(string $name, string $id): void
    {
        if (session_status() === PHP_SESSION_ACTIVE && session_name() === $name && session_id() === $id) return;
        if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
        session_save_path($this->community->sessionsDir());
        session_name($name);
        session_id($id);
        session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'httponly' => true, 'samesite' => 'Lax']);
        session_start();
    }

    private function destroyProfileSession(): void
    {
        $_SESSION = [];
        $name = session_name();
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie($name, '', ['expires' => time() - 42000, 'path' => $params['path'], 'secure' => (bool) $params['secure'], 'httponly' => true, 'samesite' => 'Lax']);
        }
        session_destroy();
        unset($_COOKIE[$name]);
    }
}
