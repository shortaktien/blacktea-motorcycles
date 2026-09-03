<?php

namespace App\Service;

use DateTimeImmutable;

final class UserAuthService
{
    public function __construct(
        private readonly UserStorage $users,
        private readonly CommunityStorage $community,
        private readonly MailjetService $mailjet,
    ) {
    }

    public function currentUser(): ?array
    {
        $this->startSession();
        $id = $_SESSION['user_id'] ?? null;
        if (!is_string($id) || $id === '') {
            return null;
        }

        $user = $this->users->findById($id);
        if ($user === null || ($user['status'] ?? null) !== 'active') {
            unset($_SESSION['user_id']);
            return null;
        }

        return $user;
    }

    public function publicUser(array $user): array
    {
        $notifications = [];
        foreach (($user['notifications'] ?? []) as $notification) {
            if (!is_array($notification) || !isset($notification['id'])) {
                continue;
            }
            $notifications[] = [
                'id' => (string) $notification['id'],
                'type' => (string) ($notification['type'] ?? 'info'),
                'title' => (string) ($notification['title'] ?? 'Neue Benachrichtigung'),
                'body' => (string) ($notification['body'] ?? ''),
                'href' => (string) ($notification['href'] ?? '/konto'),
                'createdAt' => (string) ($notification['createdAt'] ?? ''),
                'readAt' => isset($notification['readAt']) && is_string($notification['readAt']) ? $notification['readAt'] : null,
            ];
        }
        usort($notifications, static fn (array $a, array $b): int => strcmp($b['createdAt'], $a['createdAt']));

        return [
            'id' => (string) $user['id'],
            'name' => (string) $user['name'],
            'email' => (string) $user['email'],
            'role' => ($user['role'] ?? 'member') === 'moderator' ? 'moderator' : 'member',
            'model' => $user['model'] ?? null,
            'kilometers' => (int) ($user['kilometers'] ?? 0),
            'avatarStyle' => (int) ($user['avatarStyle'] ?? 0),
            'avatarUrl' => !empty($user['avatarFile'])
                ? '/api/auth/avatar/' . rawurlencode((string) $user['id']) . '?v=' . substr(hash('sha256', (string) $user['avatarFile']), 0, 16)
                : '/images/avatars/avatar-' . str_pad((string) ((int) ($user['avatarStyle'] ?? 0) + 1), 2, '0', STR_PAD_LEFT) . '.webp',
            'notifyReplies' => ($user['notifyReplies'] ?? true) === true,
            'newsletterSubscribed' => ($user['newsletterSubscribed'] ?? false) === true,
            'notifications' => $notifications,
        ];
    }

    public function csrfToken(): string
    {
        $this->startSession();
        if (!isset($_SESSION['user_csrf_token']) || !is_string($_SESSION['user_csrf_token']) || $_SESSION['user_csrf_token'] === '') {
            $_SESSION['user_csrf_token'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['user_csrf_token'];
    }

    public function validCsrfToken(string $token): bool
    {
        $this->startSession();
        $sessionToken = $_SESSION['user_csrf_token'] ?? null;
        return is_string($sessionToken) && $sessionToken !== '' && $token !== '' && hash_equals($sessionToken, $token);
    }

    public function login(array $user): string
    {
        $this->startSession();
        session_regenerate_id(true);
        $_SESSION['user_id'] = (string) $user['id'];
        $_SESSION['user_csrf_token'] = bin2hex(random_bytes(32));
        return $_SESSION['user_csrf_token'];
    }

    public function logout(): void
    {
        $this->startSession();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
        }
        session_destroy();
    }

    public function notifyReply(string $userId, array $answer, array $parent): void
    {
        if ($userId === '') {
            return;
        }

        $user = $this->users->findById($userId);
        if ($user === null || ($user['status'] ?? null) !== 'active' || ($user['notifyReplies'] ?? true) !== true) {
            return;
        }

        $answerId = (string) ($answer['id'] ?? '');
        $notification = [
            'id' => bin2hex(random_bytes(16)),
            'type' => 'reply',
            'answerId' => $answerId,
            'title' => 'Neue Antwort zu deiner Reparaturanfrage',
            'body' => (string) ($answer['name'] ?? 'Jemand') . ' hat einen Lösungsansatz geteilt.',
            'href' => '/hilfe/anfragen/' . (string) ($parent['id'] ?? ''),
            'createdAt' => (new DateTimeImmutable())->format(DATE_ATOM),
            'readAt' => null,
            'emailSentAt' => null,
        ];

        $alreadyNotified = false;
        $this->users->update(static function (array &$data) use ($userId, $answerId, $notification, &$alreadyNotified): void {
            foreach ($data['users'] as &$candidate) {
                if (($candidate['id'] ?? null) !== $userId) {
                    continue;
                }
                foreach (($candidate['notifications'] ?? []) as $existing) {
                    if ($answerId !== '' && ($existing['answerId'] ?? null) === $answerId) {
                        $alreadyNotified = true;
                        break 2;
                    }
                }
                $candidate['notifications'] = array_slice(array_merge([$notification], $candidate['notifications'] ?? []), 0, 30);
                break;
            }
            unset($candidate);
        });

        if ($alreadyNotified || $answerId === '' || !$this->community->allowRate('reply-notification-email', strtolower((string) $user['email']), 5, 3600)) {
            return;
        }

        try {
            $this->mailjet->sendReplyNotification(
                (string) $user['email'],
                (string) $user['name'],
                (string) ($parent['topic'] ?? 'Reparaturanfrage'),
                (string) ($answer['name'] ?? 'Jemand'),
                (string) $notification['href'],
            );
            $sentAt = (new DateTimeImmutable())->format(DATE_ATOM);
            $this->users->update(static function (array &$data) use ($userId, $answerId, $sentAt): void {
                foreach ($data['users'] as &$candidate) {
                    if (($candidate['id'] ?? null) !== $userId) {
                        continue;
                    }
                    foreach ($candidate['notifications'] as &$existing) {
                        if (($existing['answerId'] ?? null) === $answerId) {
                            $existing['emailSentAt'] = $sentAt;
                            break 2;
                        }
                    }
                    unset($existing);
                    break;
                }
                unset($candidate);
            });
        } catch (\Throwable $exception) {
            error_log('[reply-notification] ' . $exception->getMessage());
        }
    }

    private function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        session_save_path($this->community->sessionsDir());
        session_name('blacktea_user');
        $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}
