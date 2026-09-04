<?php

namespace App\Service;

use DateTimeImmutable;

final class UserAuthService
{
    use AdminProfileAuthTrait;
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
            'isAdminProfile' => $this->isConfiguredAdminProfile($user),
            'role' => ($user['role'] ?? 'member') === 'moderator' ? 'moderator' : 'member',
            'model' => $user['model'] ?? null,
            'kilometers' => (int) ($user['kilometers'] ?? 0),
            'bio' => (string) ($user['bio'] ?? ''),
            'bioMentions' => $this->resolveMentions((string) ($user['bio'] ?? ''), $user['bioMentions'] ?? null),
            'country' => in_array($user['country'] ?? null, ['D', 'A', 'CH'], true) ? $user['country'] : 'D',
            'postalCode' => is_string($user['postalCode'] ?? null) ? $user['postalCode'] : '',
            'avatarStyle' => (int) ($user['avatarStyle'] ?? 0),
            'avatarUrl' => !empty($user['avatarFile'])
                ? '/api/auth/avatar/' . rawurlencode((string) $user['id']) . '?v=' . substr(hash('sha256', (string) $user['avatarFile']), 0, 16)
                : '/images/avatars/avatar-' . str_pad((string) ((int) ($user['avatarStyle'] ?? 0) + 1), 2, '0', STR_PAD_LEFT) . '.webp',
            'notifyReplies' => ($user['notifyReplies'] ?? true) === true,
            'notifyCommunity' => ($user['notifyCommunity'] ?? true) === true,
            'newsletterSubscribed' => ($user['newsletterSubscribed'] ?? false) === true,
            'notifications' => $notifications,
        ];
    }

    public function publicProfile(array $user): array
    {
        $avatarStyle = max(0, min(19, (int) ($user['avatarStyle'] ?? 0)));
        $avatarUrl = !empty($user['avatarFile'])
            ? '/api/community/profiles/' . rawurlencode((string) $user['id']) . '/avatar?v=' . substr(hash('sha256', (string) $user['avatarFile']), 0, 16)
            : '/images/avatars/avatar-' . str_pad((string) ($avatarStyle + 1), 2, '0', STR_PAD_LEFT) . '.webp';
        $country = in_array($user['country'] ?? null, ['D', 'A', 'CH'], true) ? $user['country'] : null;
        $countryLabels = ['D' => 'Deutschland', 'A' => 'Österreich', 'CH' => 'Schweiz'];

        return [
            'id' => (string) $user['id'],
            'name' => (string) $user['name'],
            'role' => ($user['role'] ?? 'member') === 'moderator' ? 'moderator' : 'member',
            'model' => $user['model'] ?? null,
            'kilometers' => (int) ($user['kilometers'] ?? 0),
            'country' => $country,
            'countryLabel' => $country !== null ? $countryLabels[$country] : null,
            'bio' => (string) ($user['bio'] ?? ''),
            'bioMentions' => $this->resolveMentions((string) ($user['bio'] ?? ''), $user['bioMentions'] ?? null),
            'avatarStyle' => $avatarStyle,
            'avatarUrl' => $avatarUrl,
            'joinedAt' => (string) ($user['createdAt'] ?? ''),
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
        $this->destroyProfileSession();
        // Otherwise /auth/session would immediately sign the admin back in.
        $adminId = $this->profileSessionCookie('blacktea_admin');
        if ($adminId !== '') {
            $this->switchProfileSession('blacktea_admin', $adminId);
            $this->destroyProfileSession();
        }
    }

    public function notifyReply(string $userId, array $answer, array $parent): void
    {
        $this->notifyReplyForUser($userId, $answer, $parent, false);
    }

    /** @param list<string> $userIds */
    public function notifyRepairSubscribers(array $userIds, array $answer, array $parent): void
    {
        foreach (array_values(array_unique($userIds)) as $userId) {
            if (is_string($userId)) {
                $this->notifyReplyForUser($userId, $answer, $parent, true);
            }
        }
    }

    /** @param list<string> $userIds */
    public function notifyRepairRequestStatus(array $userIds, array $request): void
    {
        $requestId = (string) ($request['id'] ?? '');
        if ($requestId === '') {
            return;
        }

        $notification = [
            'id' => bin2hex(random_bytes(16)),
            'type' => 'repair_status',
            'requestId' => $requestId,
            'title' => 'Deine Reparaturanfrage ist jetzt sichtbar',
            'body' => 'Die Anfrage wurde geprüft und für die Community freigegeben.',
            'href' => '/hilfe/anfragen/' . $requestId,
            'createdAt' => (new DateTimeImmutable())->format(DATE_ATOM),
            'readAt' => null,
        ];

        foreach (array_values(array_unique($userIds)) as $userId) {
            if (!is_string($userId) || $userId === '') {
                continue;
            }
            $user = $this->users->findById($userId);
            if ($user === null || ($user['status'] ?? null) !== 'active') {
                continue;
            }
            $alreadyNotified = false;
            $this->users->update(static function (array &$data) use ($userId, $requestId, $notification, &$alreadyNotified): void {
                foreach ($data['users'] as &$candidate) {
                    if (($candidate['id'] ?? null) !== $userId) {
                        continue;
                    }
                    foreach (($candidate['notifications'] ?? []) as $existing) {
                        if (($existing['requestId'] ?? null) === $requestId && ($existing['type'] ?? null) === 'repair_status') {
                            $alreadyNotified = true;
                            break 2;
                        }
                    }
                    $candidate['notifications'] = array_slice(array_merge([$notification], $candidate['notifications'] ?? []), 0, 30);
                    break;
                }
                unset($candidate);
            });
            if ($alreadyNotified) {
                continue;
            }
        }
    }

    public function notifyReaction(string $userId, array $answer, string $value): void
    {
        $reactionId = bin2hex(random_bytes(8));
        $this->pushCommunityNotification($userId, [
            'type' => 'reaction',
            'reactionId' => $reactionId,
            'answerId' => (string) ($answer['id'] ?? ''),
            'title' => 'Deine Antwort wurde bewertet',
            'body' => 'Jemand findet deinen Lösungsansatz ' . ($value === 'up' ? 'hilfreich.' : 'nicht hilfreich.'),
            'href' => '/hilfe/anfragen/' . (string) ($answer['parentId'] ?? ''),
        ], 'reactionId', $reactionId);
    }

    public function notifySolution(string $userId, array $answer, array $parent): void
    {
        $this->pushCommunityNotification($userId, [
            'type' => 'solution',
            'answerId' => (string) ($answer['id'] ?? ''),
            'title' => 'Deine Antwort wurde zur Lösung gekürt',
            'body' => 'Der Ersteller hat deinen Lösungsansatz als beste Antwort ausgewählt.',
            'href' => '/hilfe/anfragen/' . (string) ($parent['id'] ?? ''),
        ], 'solutionAnswerId', (string) ($answer['id'] ?? ''));
    }

    /** @param list<string> $userIds */
    public function notifyCommunityPost(array $userIds, array $comment): void
    {
        foreach (array_values(array_unique($userIds)) as $userId) {
            if (!is_string($userId) || $userId === '') {
                continue;
            }
            $this->pushCommunityNotification($userId, [
                'type' => 'community',
                'communityPostId' => (string) ($comment['id'] ?? ''),
                'title' => 'Neuer Beitrag in deiner Modellgruppe',
                'body' => (string) ($comment['topic'] ?? 'Ein neues Community-Erlebnis wurde geteilt.'),
                'href' => '/community',
            ], 'communityPostId', (string) ($comment['id'] ?? ''));
        }
    }

    public function notifyCommunityInteraction(string $userId, array $actor, string $type, string $eventId, string $postId): void
    {
        if ($userId === ($actor['id'] ?? null)) {
            return;
        }
        $this->pushCommunityNotification($userId, [
            'type' => $type === 'like' ? 'community_like' : 'community_reply',
            'communityEventId' => $eventId,
            'title' => $type === 'like' ? 'Dein Beitrag gefällt jemandem' : 'Neuer Kommentar zu deinem Beitrag',
            'body' => $actor['name'] . ($type === 'like' ? ' hat deinen Beitrag gelikt.' : ' hat auf deinen Beitrag geantwortet.'),
            'href' => '/community#beitrag-' . $postId,
        ], 'communityEventId', $eventId);
    }

    public function resolveMentions(string $text, ?array $saved = null): array
    {
        return MentionParser::resolve($text, $this->users->read()['users'], $saved);
    }

    public function notifyMentions(array $entry, string $href, bool $staffOnly = false): void
    {
        if (!$staffOnly && ($entry['status'] ?? null) !== 'approved') return;
        $actorId = $entry['userId'] ?? $entry['authorId'] ?? null;
        $actorName = $entry['name'] ?? $entry['authorName'] ?? 'Ein Mitglied';
        $mentions = $this->resolveMentions(implode("\n", [$entry['topic'] ?? '', $entry['body'] ?? '', $entry['section'] ?? '', $entry['source'] ?? '']), $entry['mentions'] ?? null);
        $recipients = [];
        foreach ($mentions as $mention) {
            $target = $this->users->findById($mention['id']);
            if ($target === null || $mention['id'] === $actorId || ($target['notifyCommunity'] ?? true) !== true) continue;
            // Private team messages never send notifications to ordinary members.
            if ($staffOnly && ($target['role'] ?? null) !== 'moderator' && !$this->isConfiguredAdminProfile($target)) continue;
            $recipients[] = $mention['id'];
        }
        if ($recipients === []) return;
        $claimed = [];
        $collection = $staffOnly ? 'staffChat' : 'comments';
        $this->community->update(static function (array &$data) use ($entry, $collection, $recipients, &$claimed): void {
            foreach ($data[$collection] as &$stored) {
                if ($stored['id'] !== $entry['id']) continue;
                if ($collection === 'comments' && ($stored['status'] ?? null) !== 'approved') break;
                $previous = $stored['notifiedMentionIds'] ?? [];
                $claimed = array_values(array_diff(array_unique($recipients), $previous));
                $stored['notifiedMentionIds'] = array_values(array_unique([...$previous, ...$claimed]));
                break;
            }
            unset($stored);
        });
        foreach ($claimed as $id) {
            $target = $this->users->findById($id);
            $this->pushCommunityNotification($id, [
                'type' => 'mention', 'mentionEventId' => $entry['id'],
                'title' => 'Du wurdest erwähnt',
                'body' => $actorName . ($staffOnly ? ' hat dich im Team-Chat erwähnt.' : ' hat dich in einem Beitrag erwähnt.'),
                'href' => $staffOnly && $target !== null && $this->isConfiguredAdminProfile($target) ? '/admin?bereich=chat' : $href,
            ], 'mentionEventId', $entry['id']);
        }
    }

    public function notifyProfileMentions(array $user, array $previousMentions): void
    {
        $previousIds = array_column($previousMentions, 'id');
        foreach ($user['bioMentions'] ?? [] as $mention) {
            if ($mention['id'] === $user['id'] || in_array($mention['id'], $previousIds, true)) continue;
            $key = 'profile:' . $user['id'] . ':' . $mention['id'];
            $this->pushCommunityNotification($mention['id'], [
                'type' => 'mention', 'mentionEventId' => $key, 'title' => 'Du wurdest erwähnt',
                'body' => $user['name'] . ' hat dich in der Profilvorstellung erwähnt.',
                'href' => '/profil/' . $user['id'],
            ], 'mentionEventId', $key);
        }
    }

    private function pushCommunityNotification(string $userId, array $notification, string $dedupeField, string $dedupeValue): void
    {
        if ($userId === '' || $dedupeValue === '') {
            return;
        }
        $user = $this->users->findById($userId);
        if ($user === null || ($user['status'] ?? null) !== 'active' || ($user['notifyCommunity'] ?? true) !== true) {
            return;
        }
        $notification['id'] = bin2hex(random_bytes(16));
        $notification['createdAt'] = (new DateTimeImmutable())->format(DATE_ATOM);
        $notification['readAt'] = null;
        $this->users->update(static function (array &$data) use ($userId, $notification, $dedupeField, $dedupeValue): void {
            foreach ($data['users'] as &$candidate) {
                if (($candidate['id'] ?? null) !== $userId) {
                    continue;
                }
                foreach (($candidate['notifications'] ?? []) as $existing) {
                    if (($existing[$dedupeField] ?? null) === $dedupeValue) {
                        return;
                    }
                }
                $candidate['notifications'] = array_slice(array_merge([$notification], $candidate['notifications'] ?? []), 0, 30);
                break;
            }
            unset($candidate);
        });
    }

    private function notifyReplyForUser(string $userId, array $answer, array $parent, bool $subscribed): void
    {
        if ($userId === '') {
            return;
        }

        $user = $this->users->findById($userId);
        if ($user === null || ($user['status'] ?? null) !== 'active' || (!$subscribed && ($user['notifyReplies'] ?? true) !== true)) {
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

        if ($alreadyNotified || $answerId === '' || ($user['notifyReplies'] ?? true) !== true || !$this->community->allowRate('reply-notification-email', strtolower((string) $user['email']), 5, 3600)) {
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
        if (session_name() !== 'blacktea_user') {
            // PHP may retain the previous session ID when switching session names.
            $userSession = $_COOKIE['blacktea_user'] ?? null;
            session_id(is_string($userSession) && preg_match('/^[a-zA-Z0-9,-]{1,256}$/D', $userSession) === 1 ? $userSession : '');
        }
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
