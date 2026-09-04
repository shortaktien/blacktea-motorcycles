<?php

namespace App\Controller;

use App\Service\CommunityStorage;
use App\Service\EmailConfirmationService;
use App\Service\MailjetService;
use App\Service\UserAuthService;
use App\Service\UserStorage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Routing\Attribute\Route;

final class CommunityController
{
    use CommunityInteractionTrait;
    use ReviewEditingTrait;

    private const REPAIR_REQUEST_GUIDE = 'hilfe-anfragen';
    private const COMMUNITY_EXPERIENCE_GUIDE = 'community-erfahrungen';
    private const MAX_IMAGE_BYTES = 1048576;
    private const STAFF_CHAT_RETENTION_SECONDS = 20 * 86400;
    private const STAFF_CHAT_MAX_MESSAGES = 500;
    private const ALLOWED_IMAGES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];
    private const ALLOWED_AVATARS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    public function __construct(
        private readonly CommunityStorage $storage,
        private readonly EmailConfirmationService $emailConfirmation,
        private readonly UserAuthService $users,
        private readonly UserStorage $userStorage,
        private readonly MailjetService $mailjet,
    )
    {
    }

    #[Route('/api/feedback/{guide}', name: 'api_feedback_read', methods: ['GET'])]
    public function readFeedback(string $guide): JsonResponse
    {
        if (!$this->validGuide($guide)) {
            return $this->error('Ungültiger Beitrag.', Response::HTTP_BAD_REQUEST);
        }

        $data = $this->storage->read();
        $viewer = $this->users->currentUser();
        $viewerUserId = is_array($viewer) && is_string($viewer['id'] ?? null) ? $viewer['id'] : null;
        $viewerVoteKey = $this->answerVoteKey($viewer);
        $counts = $data['feedback'][$guide] ?? ['up' => 0, 'down' => 0];
        $expectedKinds = $this->expectedKinds($guide);
        $comments = array_values(array_filter(
            $data['comments'],
            fn (array $comment): bool => ($comment['guide'] ?? null) === $guide
                && in_array(($comment['kind'] ?? 'comment'), $expectedKinds, true)
                && ($comment['status'] ?? null) === 'approved'
        ));
        usort($comments, static fn (array $a, array $b): int => strcmp((string) ($b['createdAt'] ?? ''), (string) ($a['createdAt'] ?? '')));

        $response = new JsonResponse([
            'guide' => $guide,
            'up' => (int) ($counts['up'] ?? 0),
            'down' => (int) ($counts['down'] ?? 0),
            'comments' => array_map(fn (array $comment): array => $this->publicComment($comment, $viewerUserId, $viewerVoteKey), $comments),
        ]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/repair-requests/{id}/subscription', name: 'api_repair_request_subscription', methods: ['GET', 'POST', 'DELETE'])]
    public function repairRequestSubscription(string $id, Request $request): JsonResponse
    {
        if (preg_match('/^[a-f0-9]{32}$/', $id) !== 1) {
            return $this->error('Die Reparaturanfrage wurde nicht erkannt.', Response::HTTP_BAD_REQUEST);
        }

        $repairRequest = $this->findComment($id);
        if ($repairRequest === null
            || ($repairRequest['guide'] ?? null) !== self::REPAIR_REQUEST_GUIDE
            || ($repairRequest['kind'] ?? null) !== 'repair_request'
            || ($repairRequest['status'] ?? null) !== 'approved'
        ) {
            return $this->error('Die Reparaturanfrage wurde nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $user = $this->users->currentUser();
        if ($request->isMethod('GET')) {
            $userId = is_array($user) ? (string) ($user['id'] ?? '') : '';
            $subscriberUserIds = is_array($repairRequest['subscriberUserIds'] ?? null) ? $repairRequest['subscriberUserIds'] : [];
            return new JsonResponse([
                'authenticated' => $user !== null,
                'subscribed' => $userId !== '' && in_array($userId, $subscriberUserIds, true),
            ]);
        }

        if ($user === null) {
            return $this->unauthorized();
        }
        if (!$this->users->validCsrfToken($request->headers->get('X-CSRF-Token', ''))) {
            return $this->error('Ungültige Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $userId = (string) ($user['id'] ?? '');
        $subscribe = $request->isMethod('POST');
        $updated = null;
        $this->storage->update(static function (array &$data) use ($id, $userId, $subscribe, &$updated): void {
            foreach ($data['comments'] as &$comment) {
                if (($comment['id'] ?? null) !== $id
                    || ($comment['guide'] ?? null) !== self::REPAIR_REQUEST_GUIDE
                    || ($comment['kind'] ?? null) !== 'repair_request'
                    || ($comment['status'] ?? null) !== 'approved'
                ) {
                    continue;
                }
                $subscriberUserIds = is_array($comment['subscriberUserIds'] ?? null) ? $comment['subscriberUserIds'] : [];
                $subscriberUserIds = array_values(array_unique(array_filter($subscriberUserIds, static fn ($candidate): bool => is_string($candidate))));
                if ($subscribe) {
                    $subscriberUserIds[] = $userId;
                    $comment['subscriberUserIds'] = array_values(array_unique($subscriberUserIds));
                } else {
                    $comment['subscriberUserIds'] = array_values(array_filter($subscriberUserIds, static fn (string $candidate): bool => $candidate !== $userId));
                }
                $updated = $comment;
                break;
            }
            unset($comment);
        });

        if (!is_array($updated)) {
            return $this->error('Die Reparaturanfrage wurde nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse(['subscribed' => in_array($userId, $updated['subscriberUserIds'] ?? [], true)]);
    }

    #[Route('/api/repair-answers/{id}/vote', name: 'api_repair_answer_vote', methods: ['POST'])]
    public function voteRepairAnswer(string $id, Request $request): JsonResponse
    {
        if ($response = $this->rateLimited($request, 'repair-answer-vote', 60, 60)) {
            return $response;
        }

        if (preg_match('/^[a-f0-9]{32}$/', $id) !== 1) {
            return $this->error('Die Antwort wurde nicht erkannt.', Response::HTTP_BAD_REQUEST);
        }

        $user = $this->users->currentUser();
        if (($user['communicationBlocked'] ?? false) === true) {
            return $this->error('Dein Konto ist für neue Community-Kommunikation gesperrt.', Response::HTTP_FORBIDDEN);
        }

        $value = $this->jsonPayload($request)['value'] ?? null;
        if (!in_array($value, ['up', 'down'], true)) {
            return $this->error('Ungültige Bewertung.', Response::HTTP_BAD_REQUEST);
        }

        $answer = $this->findComment($id);
        $parentId = is_array($answer) && is_string($answer['parentId'] ?? null) ? $answer['parentId'] : null;
        $parent = $parentId !== null ? $this->findComment($parentId) : null;
        if ($answer === null
            || ($answer['guide'] ?? null) !== self::REPAIR_REQUEST_GUIDE
            || ($answer['kind'] ?? null) !== 'repair_answer'
            || ($answer['status'] ?? null) !== 'approved'
            || $parent === null
            || ($parent['kind'] ?? null) !== 'repair_request'
            || ($parent['status'] ?? null) !== 'approved'
        ) {
            return $this->error('Die Antwort wurde nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $voteKey = $this->answerVoteKey($user);
        $updated = null;
        $voteChanged = false;
        $this->storage->update(static function (array &$data) use ($id, $value, $voteKey, &$updated, &$voteChanged): void {
            foreach ($data['comments'] as &$comment) {
                if (($comment['id'] ?? null) !== $id || ($comment['kind'] ?? null) !== 'repair_answer') {
                    continue;
                }

                $votes = is_array($comment['votes'] ?? null) ? $comment['votes'] : [];
                $voterKeys = is_array($votes['voterKeys'] ?? null) ? $votes['voterKeys'] : [];
                $previous = isset($voterKeys[$voteKey]) && in_array($voterKeys[$voteKey], ['up', 'down'], true)
                    ? $voterKeys[$voteKey]
                    : null;
                $counts = [
                    'up' => max(0, (int) ($votes['up'] ?? 0)),
                    'down' => max(0, (int) ($votes['down'] ?? 0)),
                ];

                if ($previous !== $value) {
                    $voteChanged = true;
                    if ($previous !== null) {
                        $counts[$previous] = max(0, $counts[$previous] - 1);
                    }
                    $counts[$value]++;
                    $voterKeys[$voteKey] = $value;
                }

                $comment['votes'] = [
                    'up' => $counts['up'],
                    'down' => $counts['down'],
                    'voterKeys' => $voterKeys,
                ];
                $updated = [
                    'upVotes' => $counts['up'],
                    'downVotes' => $counts['down'],
                    'score' => $counts['up'] - $counts['down'],
                    'viewerVote' => $value,
                ];
                break;
            }
            unset($comment);
        });

        if (!is_array($updated)) {
            return $this->error('Die Antwort wurde nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $answerUserId = is_string($answer['userId'] ?? null) ? $answer['userId'] : '';
        $viewerUserId = is_array($user) && is_string($user['id'] ?? null) ? $user['id'] : '';
        if ($voteChanged && $answerUserId !== '' && $answerUserId !== $viewerUserId) {
            try {
                $this->users->notifyReaction($answerUserId, $answer, (string) $value);
            } catch (\Throwable $exception) {
                error_log('[reaction-notification] ' . $exception->getMessage());
            }
        }

        return new JsonResponse($updated);
    }

    #[Route('/api/repair-requests/{id}/solution', name: 'api_repair_request_solution', methods: ['POST'])]
    public function chooseRepairSolution(string $id, Request $request): JsonResponse
    {
        if ($response = $this->rateLimited($request, 'repair-solution', 20, 60)) {
            return $response;
        }

        if (preg_match('/^[a-f0-9]{32}$/', $id) !== 1) {
            return $this->error('Die Reparaturanfrage wurde nicht erkannt.', Response::HTTP_BAD_REQUEST);
        }

        $user = $this->users->currentUser();
        if ($user === null) {
            return $this->unauthorized();
        }
        if (!$this->users->validCsrfToken($request->headers->get('X-CSRF-Token', ''))) {
            return $this->error('Ungültige Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $parent = $this->findComment($id);
        if ($parent === null
            || ($parent['guide'] ?? null) !== self::REPAIR_REQUEST_GUIDE
            || ($parent['kind'] ?? null) !== 'repair_request'
            || ($parent['status'] ?? null) !== 'approved'
        ) {
            return $this->error('Die Reparaturanfrage wurde nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        if (!is_string($parent['userId'] ?? null) || $parent['userId'] !== ($user['id'] ?? null)) {
            return $this->error('Nur der Ersteller der Anfrage kann eine Lösung auswählen.', Response::HTTP_FORBIDDEN);
        }

        $answerId = $this->jsonPayload($request)['answerId'] ?? null;
        if (!is_string($answerId) || preg_match('/^[a-f0-9]{32}$/', $answerId) !== 1) {
            return $this->error('Die Antwort wurde nicht erkannt.', Response::HTTP_BAD_REQUEST);
        }

        $answer = $this->findComment($answerId);
        if ($answer === null
            || ($answer['guide'] ?? null) !== self::REPAIR_REQUEST_GUIDE
            || ($answer['kind'] ?? null) !== 'repair_answer'
            || ($answer['parentId'] ?? null) !== $id
            || ($answer['status'] ?? null) !== 'approved'
        ) {
            return $this->error('Diese Antwort gehört nicht zu der Anfrage oder ist noch nicht freigegeben.', Response::HTTP_BAD_REQUEST);
        }

        $updated = null;
        $this->storage->update(static function (array &$data) use ($id, $answerId, &$updated): void {
            foreach ($data['comments'] as &$comment) {
                if (($comment['id'] ?? null) !== $id || ($comment['kind'] ?? null) !== 'repair_request') {
                    continue;
                }
                $comment['solutionAnswerId'] = $answerId;
                $comment['solutionSelectedAt'] = (new \DateTimeImmutable())->format(DATE_ATOM);
                $updated = $comment;
                break;
            }
            unset($comment);
        });

        if (!is_array($updated)) {
            return $this->error('Die Reparaturanfrage wurde nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $answerUserId = is_string($answer['userId'] ?? null) ? $answer['userId'] : '';
        $requestUserId = is_string($parent['userId'] ?? null) ? $parent['userId'] : '';
        if ($answerUserId !== '' && $answerUserId !== $requestUserId) {
            try {
                $this->users->notifySolution($answerUserId, $answer, $updated);
            } catch (\Throwable $exception) {
                error_log('[solution-notification] ' . $exception->getMessage());
            }
        }

        return new JsonResponse([
            'requestId' => $id,
            'solutionAnswerId' => $answerId,
            'resolved' => true,
        ]);
    }

    #[Route('/api/community/mention-suggestions', name: 'api_community_mention_suggestions', methods: ['GET'])]
    public function mentionSuggestions(Request $request): JsonResponse
    {
        if ($response = $this->rateLimited($request, 'mention-suggestions', 120, 60)) {
            return $response;
        }
        $query = mb_strtolower(trim($request->query->getString('q')), 'UTF-8');
        $matches = [];
        if (preg_match('/^[a-z0-9äöüß]{1,80}$/u', $query) === 1) {
            foreach ($this->userStorage->read()['users'] as $user) {
                if (($user['status'] ?? null) !== 'active' || ($user['communicationBlocked'] ?? false)) continue;
                if (!str_starts_with(mb_strtolower($user['name'], 'UTF-8'), $query)) continue;
                // Deliberately expose only public handles and profile IDs, never contact/location data.
                $matches[] = ['id' => $user['id'], 'name' => $user['name']];
            }
            usort($matches, static fn (array $a, array $b): int => strnatcasecmp($a['name'], $b['name']));
        }
        $response = new JsonResponse(['users' => array_slice($matches, 0, 8)]);
        $response->headers->set('Cache-Control', 'private, no-store');
        return $response;
    }

    #[Route('/api/community/profiles/{id}', name: 'api_community_profile', methods: ['GET'])]
    public function publicProfile(string $id): JsonResponse
    {
        if (preg_match('/^[a-f0-9]{32}$/', $id) !== 1) {
            return $this->error('Profil nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $user = $this->userStorage->findById($id);
        if ($user === null || ($user['status'] ?? null) !== 'active') {
            return $this->error('Profil nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $allComments = $this->storage->read()['comments'] ?? [];
        $approvedComments = array_values(array_filter($allComments, fn (array $comment): bool => ($comment['userId'] ?? null) === $id && $this->isCommunityVisible($comment, $allComments)));
        usort($approvedComments, static fn (array $left, array $right): int => strcmp((string) ($right['createdAt'] ?? ''), (string) ($left['createdAt'] ?? '')));

        $answerIds = [];
        $helpfulVotes = 0;
        $answerCount = 0;
        $wikiCount = 0;
        $experienceCount = 0;
        foreach ($approvedComments as $comment) {
            $kind = (string) ($comment['kind'] ?? 'comment');
            if ($kind === 'repair_answer') {
                $answerIds[] = (string) ($comment['id'] ?? '');
                $answerCount++;
                $votes = is_array($comment['votes'] ?? null) ? $comment['votes'] : [];
                $helpfulVotes += max(0, (int) ($votes['up'] ?? 0));
            }
            if (str_starts_with((string) ($comment['guide'] ?? ''), 'wiki-')) {
                $wikiCount++;
            }
            if (($comment['guide'] ?? null) === self::COMMUNITY_EXPERIENCE_GUIDE && $kind === 'comment') {
                $experienceCount++;
            }
        }

        $solutions = 0;
        foreach ($allComments as $comment) {
            if (($comment['kind'] ?? null) === 'repair_request'
                && ($comment['status'] ?? null) === 'approved'
                && in_array((string) ($comment['solutionAnswerId'] ?? ''), $answerIds, true)
            ) {
                $solutions++;
            }
        }

        $contributionCount = count($approvedComments);
        $profile = $this->users->publicProfile($user);
        $profile['stats'] = [
            'contributions' => $contributionCount,
            'answers' => $answerCount,
            'helpfulVotes' => $helpfulVotes,
            'solutions' => $solutions,
            'experiences' => $experienceCount,
            'wikiContributions' => $wikiCount,
        ];
        $profile['achievements'] = [
            ['id' => 'first-contribution', 'title' => 'Erste Wortmeldung', 'description' => 'Hat den ersten Beitrag mit der Community geteilt.', 'unlocked' => $contributionCount >= 1],
            ['id' => 'helpful-mechanic', 'title' => 'Hilfreicher Schrauber', 'description' => 'Antworten wurden mindestens dreimal als hilfreich bewertet.', 'unlocked' => $helpfulVotes >= 3],
            ['id' => 'solution-finder', 'title' => 'Lösungsfinder', 'description' => 'Mindestens eine Antwort wurde zur besten Lösung gekürt.', 'unlocked' => $solutions >= 1],
            ['id' => 'wiki-contributor', 'title' => 'Wiki-Beitrag', 'description' => 'Hat Wissen für das Bike-Wiki beigesteuert.', 'unlocked' => $wikiCount >= 1],
            ['id' => 'community-regular', 'title' => 'Community-Kenner', 'description' => 'Hat mindestens fünf freigegebene Beiträge geteilt.', 'unlocked' => $contributionCount >= 5],
        ];
        $profile['contributions'] = array_map(fn (array $comment): array => $this->publicContribution($comment, $allComments), array_slice($approvedComments, 0, 12));

        $response = new JsonResponse(['profile' => $profile]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/community/profiles/{id}/avatar', name: 'api_community_profile_avatar', methods: ['GET'])]
    public function publicProfileAvatar(string $id): Response
    {
        if (preg_match('/^[a-f0-9]{32}$/', $id) !== 1) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $user = $this->userStorage->findById($id);
        if ($user === null || ($user['status'] ?? null) !== 'active') {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $filename = $user['avatarFile'] ?? null;
        $mime = $user['avatarMime'] ?? null;
        if (!is_string($filename) || !is_string($mime) || !isset(self::ALLOWED_AVATARS[$mime])) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $path = $this->userStorage->uploadsDir() . '/' . basename($filename);
        if (!is_file($path)) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', $mime);
        $response->headers->set('Content-Disposition', 'inline; filename="' . basename($filename) . '"');
        $response->headers->set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        return $response;
    }

    #[Route('/api/community/groups', name: 'api_community_groups', methods: ['GET'])]
    public function communityGroups(): JsonResponse
    {
        $activeUsers = array_values(array_filter($this->userStorage->read()['users'] ?? [], static fn (array $user): bool => ($user['status'] ?? null) === 'active'));
        $countModel = static function (array $models) use ($activeUsers): int {
            return count(array_filter($activeUsers, static fn (array $user): bool => in_array($user['model'] ?? null, $models, true)));
        };
        $countCountry = static function (string $country) use ($activeUsers): int {
            return count(array_filter($activeUsers, static fn (array $user): bool => ($user['country'] ?? null) === $country));
        };
        $groups = [
            ['slug' => 'bonfire', 'type' => 'model', 'label' => 'Bonfire · S / E / X', 'description' => 'Alle Bonfire-Fahrer, egal welche Variante.', 'model' => 'Bonfire', 'memberCount' => $countModel(['Bonfire', 'Bonfire S', 'Bonfire E', 'Bonfire X'])],
            ['slug' => 'bonfire-x', 'type' => 'model', 'label' => 'Bonfire X', 'description' => 'Austausch rund um die X.', 'model' => 'Bonfire X', 'memberCount' => $countModel(['Bonfire X'])],
            ['slug' => 'bonfire-s', 'type' => 'model', 'label' => 'Bonfire S', 'description' => 'Austausch rund um die S.', 'model' => 'Bonfire S', 'memberCount' => $countModel(['Bonfire S'])],
            ['slug' => 'bonfire-e', 'type' => 'model', 'label' => 'Bonfire E', 'description' => 'Austausch rund um die E.', 'model' => 'Bonfire E', 'memberCount' => $countModel(['Bonfire E'])],
            ['slug' => 'wildfire', 'type' => 'model', 'label' => 'Wildfire', 'description' => 'Erfahrungen, Umbauten und Hilfe zur Wildfire.', 'model' => 'Wildfire', 'memberCount' => $countModel(['Wildfire'])],
            ['slug' => 'deutschland', 'type' => 'country', 'label' => 'Deutschland', 'description' => 'BTM-Rider in Deutschland.', 'country' => 'D', 'memberCount' => $countCountry('D')],
            ['slug' => 'oesterreich', 'type' => 'country', 'label' => 'Österreich', 'description' => 'BTM-Rider in Österreich.', 'country' => 'A', 'memberCount' => $countCountry('A')],
            ['slug' => 'schweiz', 'type' => 'country', 'label' => 'Schweiz', 'description' => 'BTM-Rider in der Schweiz.', 'country' => 'CH', 'memberCount' => $countCountry('CH')],
        ];

        return new JsonResponse(['groups' => $groups, 'memberCount' => count($activeUsers)]);
    }

    #[Route('/api/community/activity', name: 'api_community_activity', methods: ['GET'])]
    public function communityActivity(Request $request): JsonResponse
    {
        $cursor = null;
        $rawCursor = $request->query->get('cursor');
        if ($rawCursor !== null) {
            if (!is_string($rawCursor) || strlen($rawCursor) > 512) return $this->error('Ungültige Feed-Seite.', Response::HTTP_BAD_REQUEST);
            $decoded = base64_decode(strtr($rawCursor, '-_', '+/'), true);
            $cursor = $decoded === false ? null : json_decode($decoded, true);
            if (!is_array($cursor) || count($cursor) !== 2 || !is_int($cursor[0] ?? null) || $cursor[0] < 0 || !is_string($cursor[1] ?? null) || preg_match('/^[a-f0-9]{32}$/D', $cursor[1]) !== 1) {
                return $this->error('Ungültige Feed-Seite.', Response::HTTP_BAD_REQUEST);
            }
        }
        $viewer = $this->users->currentUser();
        $activeUsers = [];
        foreach ($this->userStorage->read()['users'] ?? [] as $user) {
            if (($user['status'] ?? null) === 'active' && is_string($user['id'] ?? null)) {
                $activeUsers[$user['id']] = $user;
            }
        }
        $modelFilter = $request->query->get('model');
        $countryFilter = $request->query->get('country');
        $allComments = $this->storage->read()['comments'] ?? [];
        $byId = array_column($allComments, null, 'id');
        $candidates = [];
        $activities = [];
        foreach ($allComments as $comment) {
            if (($comment['kind'] ?? null) === 'community_reply' || !$this->isCommunityVisible($comment, $allComments) || !is_string($comment['userId'] ?? null) || !isset($activeUsers[$comment['userId']])) {
                continue;
            }
            $actor = $activeUsers[$comment['userId']];
            $actorModel = is_string($actor['model'] ?? null) ? $actor['model'] : null;
            $actorCountry = in_array($actor['country'] ?? null, ['D', 'A', 'CH'], true) ? $actor['country'] : null;
            if (is_string($countryFilter) && $countryFilter !== '' && $actorCountry !== $countryFilter) {
                continue;
            }
            if (is_string($modelFilter) && $modelFilter !== '') {
                $matchesModel = $modelFilter === 'Bonfire'
                    ? is_string($actorModel) && str_starts_with($actorModel, 'Bonfire')
                    : $actorModel === $modelFilter;
                if (!$matchesModel) {
                    continue;
                }
            }
            $parent = $byId[$comment['parentId'] ?? ''] ?? [];
            $isSolution = ($comment['kind'] ?? null) === 'repair_answer' && ($parent['solutionAnswerId'] ?? null) === ($comment['id'] ?? null);
            $date = $isSolution ? ($parent['solutionSelectedAt'] ?? $comment['createdAt']) : $comment['createdAt'];
            $candidates[] = ['comment' => $comment, 'time' => strtotime($date) ?: 0, 'id' => $comment['id']];
        }
        usort($candidates, static fn (array $a, array $b): int => ($b['time'] <=> $a['time']) ?: strcmp($b['id'], $a['id']));
        $totalCount = count($candidates);
        $remaining = $cursor === null ? $candidates : array_values(array_filter($candidates, static fn (array $item): bool =>
            $item['time'] < $cursor[0] || ($item['time'] === $cursor[0] && strcmp($item['id'], $cursor[1]) < 0)));
        $page = array_slice($remaining, 0, 10);
        $hasMore = count($remaining) > 10;
        $last = $page === [] ? null : $page[count($page) - 1];
        $nextCursor = $hasMore && $last !== null ? rtrim(strtr(base64_encode(json_encode([$last['time'], $last['id']])), '+/', '-_'), '=') : null;
        // A notification can target an older post without downloading all preceding pages.
        $requestedPost = $request->query->get('post');
        $focusedId = null;
        if ($cursor === null && is_string($requestedPost) && !in_array($requestedPost, array_column($page, 'id'), true)) {
            foreach ($candidates as $candidate) {
                if ($candidate['id'] === $requestedPost) {
                    $focusedId = $requestedPost;
                    $page[] = $candidate;
                    break;
                }
            }
        }
        $focusedActivity = null;
        foreach ($page as $item) {
            $comment = $item['comment'];
            $actor = $activeUsers[$comment['userId']];
            $actorModel = $actor['model'] ?? null;
            $actorCountry = in_array($actor['country'] ?? null, ['D', 'A', 'CH'], true) ? $actor['country'] : null;
            $parent = $byId[$comment['parentId'] ?? ''] ?? [];
            $isSolution = ($comment['kind'] ?? null) === 'repair_answer' && ($parent['solutionAnswerId'] ?? null) === ($comment['id'] ?? null);
            $kind = (string) ($comment['kind'] ?? 'comment');
            $type = $isSolution
                ? 'solution'
                : ($kind === 'repair_answer'
                    ? 'repair_answer'
                    : ($kind === 'wiki_suggestion'
                        ? 'wiki'
                        : (($comment['guide'] ?? null) === self::COMMUNITY_EXPERIENCE_GUIDE ? 'experience' : 'community')));
            $activity = [
                'id' => (string) ($comment['id'] ?? ''),
                'type' => $type,
                'title' => $isSolution ? 'Beste Lösung für „' . (string) ($parent['topic'] ?? 'Reparaturanfrage') . '“' : $this->publicContribution($comment, $allComments)['title'],
                'body' => (string) ($comment['body'] ?? ''),
                'editAttribution' => $this->publicEditAttribution($comment),
                'source' => $comment['source'] ?? null,
                'mentions' => $this->commentMentions($comment),
                'href' => $this->publicContribution($comment, $allComments)['href'],
                'createdAt' => $isSolution ? (string) ($parent['solutionSelectedAt'] ?? $comment['createdAt'] ?? '') : (string) ($comment['createdAt'] ?? ''),
                'imageUrl' => !empty($comment['imageFile']) ? '/api/comments/' . rawurlencode((string) $comment['id']) . '/image' : null,
                'model' => $actorModel,
                'country' => $actorCountry,
                'isSolution' => $isSolution,
                'score' => $kind === 'repair_answer' ? max(0, (int) (($comment['votes']['up'] ?? 0))) - max(0, (int) (($comment['votes']['down'] ?? 0))) : null,
                'actor' => $this->users->publicProfile($actor),
                'likeCount' => count($comment['communityLikes'] ?? []),
                'viewerLiked' => $viewer !== null && in_array($viewer['id'], $comment['communityLikes'] ?? [], true),
                'replyCount' => count(array_filter($allComments, fn (array $reply): bool => ($reply['kind'] ?? null) === 'community_reply' && ($reply['parentId'] ?? null) === $comment['id'] && $this->isCommunityVisible($reply, $allComments))),
                'viewerReported' => $viewer !== null && in_array($viewer['id'], array_column($comment['communityReports'] ?? [], 'userId'), true),
            ];
            if ($activity['id'] === $focusedId) $focusedActivity = $activity;
            else $activities[] = $activity;
        }
        $response = new JsonResponse(['activities' => $activities, 'focusedActivity' => $focusedActivity, 'nextCursor' => $nextCursor, 'hasMore' => $hasMore, 'totalCount' => $totalCount, 'memberCount' => count($activeUsers)]);
        $response->headers->set('Cache-Control', 'private, no-store');
        return $response;
    }

    #[Route('/api/community/map', name: 'api_community_map', methods: ['GET'])]
    public function communityMap(): JsonResponse
    {
        $regions = [];
        $totalKilometers = 0;
        foreach ($this->userStorage->read()['users'] ?? [] as $user) {
            if (($user['status'] ?? null) !== 'active') {
                continue;
            }

            $country = $user['country'] ?? null;
            $postalCode = $user['postalCode'] ?? null;
            $postalPattern = $country === 'D' ? '/^\d{5}$/' : '/^[1-9]\d{3}$/';
            if (!is_string($country) || !in_array($country, ['D', 'A', 'CH'], true) || !is_string($postalCode) || preg_match($postalPattern, $postalCode) !== 1) {
                continue;
            }

            $kilometers = filter_var($user['kilometers'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 999999]]);
            $kilometers = $kilometers === false ? 0 : $kilometers;
            $rawModel = $user['model'] ?? null;
            $model = is_string($rawModel) && str_starts_with($rawModel, 'Bonfire') ? 'Bonfire' : ($rawModel === 'Wildfire' ? 'Wildfire' : null);
            $modelVariant = is_string($rawModel) && in_array($rawModel, ['Bonfire S', 'Bonfire E', 'Bonfire X'], true) ? $rawModel : null;
            $prefix = substr($postalCode, 0, 2);
            $key = $country . ':' . $prefix;
            if (!isset($regions[$key])) {
                $regions[$key] = [
                    'country' => $country,
                    'prefix' => $prefix,
                    'memberCount' => 0,
                    'modelCounts' => ['Bonfire' => 0, 'Bonfire S' => 0, 'Bonfire E' => 0, 'Bonfire X' => 0, 'Wildfire' => 0],
                    'totalKilometers' => 0,
                    'kilometersByModel' => ['Bonfire' => 0, 'Bonfire S' => 0, 'Bonfire E' => 0, 'Bonfire X' => 0, 'Wildfire' => 0],
                ];
            }
            $regions[$key]['memberCount']++;
            $regions[$key]['totalKilometers'] += $kilometers;
            $totalKilometers += $kilometers;
            if ($model !== null) {
                $regions[$key]['modelCounts'][$model]++;
                $regions[$key]['kilometersByModel'][$model] += $kilometers;
            }
            if ($modelVariant !== null) {
                $regions[$key]['modelCounts'][$modelVariant]++;
                $regions[$key]['kilometersByModel'][$modelVariant] += $kilometers;
            }
        }

        $regionList = array_values($regions);
        usort($regionList, static fn (array $left, array $right): int => [$left['country'], $left['prefix']] <=> [$right['country'], $right['prefix']]);
        $response = new JsonResponse([
            'regions' => $regionList,
            'memberCount' => array_sum(array_column($regionList, 'memberCount')),
            'regionCount' => count($regionList),
            'totalKilometers' => $totalKilometers,
        ]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/feedback', name: 'api_feedback_vote', methods: ['POST'])]
    public function vote(Request $request): JsonResponse
    {
        if ($response = $this->rateLimited($request, 'vote', 30, 60)) {
            return $response;
        }

        $authenticatedUser = $this->users->currentUser();
        if (($authenticatedUser['communicationBlocked'] ?? false) === true) {
            return $this->error('Dein Konto ist für neue Community-Kommunikation gesperrt.', Response::HTTP_FORBIDDEN);
        }

        $payload = $this->jsonPayload($request);
        $guide = $payload['guide'] ?? null;
        $value = $payload['value'] ?? null;
        if (!is_string($guide) || !$this->validGuide($guide) || !in_array($value, ['up', 'down'], true)) {
            return $this->error('Ungültige Bewertung.', Response::HTTP_BAD_REQUEST);
        }

        $data = $this->storage->update(static function (array &$data) use ($guide, $value): void {
            $data['feedback'][$guide] ??= ['up' => 0, 'down' => 0];
            $data['feedback'][$guide][$value] = (int) ($data['feedback'][$guide][$value] ?? 0) + 1;
        });

        return new JsonResponse([
            'guide' => $guide,
            'up' => (int) ($data['feedback'][$guide]['up'] ?? 0),
            'down' => (int) ($data['feedback'][$guide]['down'] ?? 0),
        ]);
    }

    #[Route('/api/comments', name: 'api_comment_create', methods: ['POST'])]
    public function createComment(Request $request): JsonResponse
    {
        if ($response = $this->rateLimited($request, 'comment', 5, 3600)) {
            return $response;
        }

        $authenticatedUser = $this->users->currentUser();
        if (($authenticatedUser['communicationBlocked'] ?? false) === true) {
            return $this->error('Dein Konto ist für neue Community-Kommunikation gesperrt.', Response::HTTP_FORBIDDEN);
        }
        $guide = $request->request->get('guide');
        $name = $request->request->get('name');
        $email = $request->request->get('email');
        $body = $request->request->get('body');
        $kind = $request->request->get('kind', 'comment');
        $topic = $request->request->get('topic');
        $section = $request->request->get('section');
        $source = $request->request->get('source');
        $parentId = $request->request->get('parentId');
        $honeypot = $request->request->get('website');

        if ($authenticatedUser !== null) {
            $name = $authenticatedUser['name'];
            $email = $authenticatedUser['email'];
        }

        if (!is_string($guide) || !$this->validGuide($guide)) {
            return $this->error('Ungültiger Beitrag.', Response::HTTP_BAD_REQUEST);
        }
        $directCommunityPost = $guide === self::COMMUNITY_EXPERIENCE_GUIDE;
        if (($directCommunityPost || in_array($kind, ['repair_request', 'repair_answer'], true)) && ($response = $this->communityWriteGuard($request))) {
            return $response;
        }
        if (!is_string($kind) || !in_array($kind, ['comment', 'wiki_suggestion', 'repair_request', 'repair_answer'], true)) {
            return $this->error('Ungültiger Beitragstyp.', Response::HTTP_BAD_REQUEST);
        }
        if (!in_array($kind, $this->expectedKinds($guide), true)) {
            return $this->error('Beitragstyp und Ziel passen nicht zusammen.', Response::HTTP_BAD_REQUEST);
        }
        if (is_string($honeypot) && trim($honeypot) !== '') {
            return $this->error('Kommentar konnte nicht angenommen werden.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($name) || $this->length($name) < 2 || $this->length($name) > 80) {
            return $this->error('Bitte einen Namen mit 2 bis 80 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false || $this->length($email) > 180) {
            return $this->error('Bitte eine gültige E-Mail-Adresse angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($body) || $this->length($body) < 10 || $this->length($body) > 4000) {
            return $this->error('Bitte einen Kommentar mit 10 bis 4.000 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (in_array($kind, ['wiki_suggestion', 'repair_request'], true) || ($guide === self::COMMUNITY_EXPERIENCE_GUIDE && $kind === 'comment')) {
            if (!is_string($topic) || $this->length(trim($topic)) < 2 || $this->length(trim($topic)) > 120) {
            return $this->error('Bitte einen kurzen Titel mit 2 bis 120 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
            }
        }
        if ($kind === 'repair_request' && $parentId !== null && $parentId !== '') {
            return $this->error('Eine neue Reparaturanfrage darf keine Antwort als übergeordneten Beitrag haben.', Response::HTTP_BAD_REQUEST);
        }
        if ($kind === 'repair_answer') {
            if (!is_string($parentId) || preg_match('/^[a-f0-9]{32}$/', trim($parentId)) !== 1) {
                return $this->error('Die zugehörige Anfrage wurde nicht erkannt.', Response::HTTP_BAD_REQUEST);
            }
            $parent = $this->findComment(trim($parentId));
            if ($parent === null || ($parent['guide'] ?? null) !== self::REPAIR_REQUEST_GUIDE || ($parent['kind'] ?? null) !== 'repair_request' || ($parent['status'] ?? null) !== 'approved') {
                return $this->error('Auf diese Anfrage kann derzeit nicht geantwortet werden.', Response::HTTP_BAD_REQUEST);
            }
        } elseif ($parentId !== null && $parentId !== '') {
            return $this->error('Übergeordneter Beitrag ist nicht erlaubt.', Response::HTTP_BAD_REQUEST);
        }
        if ($section !== null && (!is_string($section) || $this->length(trim($section)) > 200)) {
            return $this->error('Der betroffene Abschnitt darf höchstens 200 Zeichen enthalten.', Response::HTTP_BAD_REQUEST);
        }
        if ($source !== null && (!is_string($source) || $this->length(trim($source)) > 500)) {
            return $this->error('Die Quellenangabe darf höchstens 500 Zeichen enthalten.', Response::HTTP_BAD_REQUEST);
        }
        if (is_string($source) && preg_match('/^https?:\/\//i', trim($source)) === 1 && filter_var(trim($source), FILTER_VALIDATE_URL) === false) {
            return $this->error('Bitte eine gültige Webadresse als Quelle angeben.', Response::HTTP_BAD_REQUEST);
        }

        $normalizedEmail = strtolower(trim($email));
        if ($authenticatedUser === null) {
            $registeredUser = $this->userStorage->findByEmail($normalizedEmail);
            if (($registeredUser['communicationBlocked'] ?? false) === true) {
                return $this->error('Dieses Konto ist für neue Community-Kommunikation gesperrt.', Response::HTTP_FORBIDDEN);
            }
        }
        if ($authenticatedUser === null && ($response = $this->confirmationRateLimited($request, $normalizedEmail))) {
            return $response;
        }
        $confirmation = $authenticatedUser === null ? $this->emailConfirmation->createToken('/api/comments/confirm/') : null;
        $submissionStatus = $directCommunityPost ? 'approved' : ($authenticatedUser === null ? 'awaiting_confirmation' : 'pending');

        $image = $request->files->get('image');
        if ($image !== null && !$image instanceof UploadedFile) {
            return $this->error('Das Bild konnte nicht verarbeitet werden.', Response::HTTP_BAD_REQUEST);
        }

        $imageFilename = null;
        $imageMime = null;
        if ($image instanceof UploadedFile) {
            if (!$image->isValid() || ($image->getSize() ?? self::MAX_IMAGE_BYTES + 1) > self::MAX_IMAGE_BYTES) {
                return $this->error('Das Bild darf höchstens 1 MB groß sein.', Response::HTTP_BAD_REQUEST);
            }

            $imageMime = function_exists('mime_content_type') ? @mime_content_type($image->getPathname()) : null;
            if (!is_string($imageMime) || !isset(self::ALLOWED_IMAGES[$imageMime])) {
                return $this->error('Erlaubt sind JPG, PNG, WEBP oder GIF.', Response::HTTP_BAD_REQUEST);
            }

            $dimensions = @getimagesize($image->getPathname());
            if (!is_array($dimensions) || ($dimensions[0] ?? 0) < 1 || ($dimensions[1] ?? 0) < 1 || ($dimensions[0] ?? 0) > 5000 || ($dimensions[1] ?? 0) > 5000) {
                return $this->error('Das Bild hat kein unterstütztes Format oder ist zu groß aufgelöst.', Response::HTTP_BAD_REQUEST);
            }

            $imageFilename = bin2hex(random_bytes(16)) . '.' . self::ALLOWED_IMAGES[$imageMime];
            try {
                $image->move($this->storage->uploadsDir(), $imageFilename);
            } catch (\Throwable) {
                return $this->error('Das Bild konnte nicht gespeichert werden.', Response::HTTP_INTERNAL_SERVER_ERROR);
            }
        }

        $comment = [
            'id' => bin2hex(random_bytes(16)),
            'guide' => $guide,
            'kind' => $kind,
            'name' => trim($name),
            'email' => $normalizedEmail,
            'body' => trim($body),
            'topic' => in_array($kind, ['wiki_suggestion', 'repair_request'], true) || ($guide === self::COMMUNITY_EXPERIENCE_GUIDE && $kind === 'comment') ? trim((string) $topic) : null,
            'section' => is_string($section) && trim($section) !== '' ? trim($section) : null,
            'source' => is_string($source) && trim($source) !== '' ? trim($source) : null,
            'parentId' => $kind === 'repair_answer' ? trim((string) $parentId) : null,
            'userId' => $authenticatedUser['id'] ?? null,
            'imageFile' => $imageFilename,
            'imageMime' => $imageMime,
            'status' => $submissionStatus,
            'createdAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
            'approvedAt' => $directCommunityPost ? (new \DateTimeImmutable())->format(DATE_ATOM) : null,
            'emailConfirmedAt' => $authenticatedUser !== null ? (new \DateTimeImmutable())->format(DATE_ATOM) : null,
            'subscriberUserIds' => $kind === 'repair_request' && $authenticatedUser !== null ? [(string) $authenticatedUser['id']] : [],
        ];
        if (is_array($confirmation)) {
            $comment['emailConfirmationTokenHash'] = $confirmation['tokenHash'];
            $comment['emailConfirmationExpiresAt'] = $confirmation['expiresAt'];
        }
        $comment['mentions'] = $this->commentMentions($comment);

        try {
            $this->storage->update(static function (array &$data) use ($comment): void {
                $data['comments'][] = $comment;
            });
        } catch (\Throwable) {
            $this->storage->deleteImage($imageFilename);
            return $this->error('Der Kommentar konnte nicht gespeichert werden.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        if (is_array($confirmation)) {
            try {
                $this->emailConfirmation->send(
                    $normalizedEmail,
                    trim($name),
                    $confirmation['url'],
                    $this->submissionLabel($kind, is_string($topic) ? trim($topic) : null),
                );
            } catch (\Throwable $exception) {
                $this->removeComment($comment['id']);
                $this->storage->deleteImage($imageFilename);
                error_log('[email-confirmation] ' . $exception->getMessage());
                return $this->error('Die Bestätigungs-E-Mail konnte gerade nicht versendet werden. Bitte später erneut versuchen.', Response::HTTP_SERVICE_UNAVAILABLE);
            }
        } else {
            $this->notifyAdminAboutComment($comment);
        }
        if ($directCommunityPost) $this->notifyPublishedMentions($comment);

        return new JsonResponse([
            'message' => $directCommunityPost ? 'Dein Beitrag ist jetzt veröffentlicht.' : ($authenticatedUser !== null
                ? match ($kind) {
                    'wiki_suggestion' => 'Danke! Dein Wiki-Vorschlag ist bei uns zur redaktionellen Prüfung vorgemerkt.',
                    'repair_request' => 'Danke! Deine Reparaturanfrage ist bei uns zur redaktionellen Prüfung vorgemerkt.',
                    'repair_answer' => 'Danke! Deine Antwort ist bei uns zur redaktionellen Prüfung vorgemerkt.',
                    default => 'Danke! Dein Kommentar ist bei uns zur redaktionellen Prüfung vorgemerkt.',
                }
                : match ($kind) {
                    'wiki_suggestion' => 'Fast geschafft! Bestätige jetzt deine E-Mail-Adresse. Erst danach landet dein Wiki-Vorschlag bei uns zur redaktionellen Prüfung.',
                    'repair_request' => 'Fast geschafft! Bestätige jetzt deine E-Mail-Adresse. Erst danach landet deine Reparaturanfrage bei uns zur redaktionellen Prüfung.',
                    'repair_answer' => 'Fast geschafft! Bestätige jetzt deine E-Mail-Adresse. Erst danach landet deine Antwort bei uns zur redaktionellen Prüfung.',
                    default => 'Fast geschafft! Bestätige jetzt deine E-Mail-Adresse. Erst danach landet dein Kommentar bei uns zur redaktionellen Prüfung.',
                }),
        ], $directCommunityPost ? Response::HTTP_CREATED : Response::HTTP_ACCEPTED);
    }

    #[Route('/api/comments/confirm/{token}', name: 'api_comment_confirm', methods: ['GET'])]
    public function confirmCommentEmail(string $token, Request $request): Response
    {
        if (preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
            return $this->confirmationPage('Bestätigungslink ungültig', 'Dieser Bestätigungslink ist nicht gültig.', '/hilfe/anfragen', Response::HTTP_BAD_REQUEST);
        }
        if (!$this->storage->allowRate('comment-confirmation-click', $request->getClientIp() ?? 'unknown', 30, 900)) {
            $response = $this->confirmationPage('Zu viele Versuche', 'Bitte versuche es in einigen Minuten erneut.', '/hilfe/anfragen', Response::HTTP_TOO_MANY_REQUESTS);
            $response->headers->set('Retry-After', '900');
            return $response;
        }

        $tokenHash = hash('sha256', $token);
        $match = null;
        foreach ($this->storage->read()['comments'] as $comment) {
            $storedHash = $comment['emailConfirmationTokenHash'] ?? null;
            if (($comment['status'] ?? null) === 'awaiting_confirmation' && is_string($storedHash) && hash_equals($storedHash, $tokenHash)) {
                $match = $comment;
                break;
            }
        }

        if ($match === null) {
            return $this->confirmationPage('Link bereits verwendet', 'Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.', '/hilfe/anfragen', Response::HTTP_GONE);
        }
        if (!is_string($match['emailConfirmationExpiresAt'] ?? null) || $this->emailConfirmation->isExpired($match['emailConfirmationExpiresAt'])) {
            return $this->confirmationPage('Link abgelaufen', 'Dieser Bestätigungslink ist abgelaufen. Bitte sende den Beitrag erneut ab.', '/hilfe/anfragen', Response::HTTP_GONE);
        }

        $updated = null;
        $this->storage->update(static function (array &$data) use ($match, $tokenHash, &$updated): void {
            foreach ($data['comments'] as &$comment) {
                if (($comment['id'] ?? null) === ($match['id'] ?? null)
                    && ($comment['status'] ?? null) === 'awaiting_confirmation'
                    && ($comment['emailConfirmationTokenHash'] ?? null) === $tokenHash
                ) {
                    $comment['status'] = 'pending';
                    $comment['emailConfirmedAt'] = (new \DateTimeImmutable())->format(DATE_ATOM);
                    unset($comment['emailConfirmationTokenHash'], $comment['emailConfirmationExpiresAt']);
                    $updated = $comment;
                    break;
                }
            }
            unset($comment);
        });

        if (!is_array($updated)) {
            return $this->confirmationPage('Link bereits verwendet', 'Dieser Bestätigungslink wurde bereits verwendet.', '/hilfe/anfragen', Response::HTTP_GONE);
        }

        $this->notifyAdminAboutComment($updated);

        return $this->confirmationPage('E-Mail bestätigt', 'Danke! Deine E-Mail-Adresse ist bestätigt. Dein Beitrag wartet jetzt bei uns auf die redaktionelle Prüfung.', '/hilfe/anfragen', Response::HTTP_OK);
    }

    #[Route('/api/comments/{id}/image', name: 'api_comment_image', methods: ['GET'])]
    public function commentImage(string $id): Response
    {
        $comment = $this->findComment($id);
        if ($comment === null) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        if (($comment['status'] ?? null) !== 'approved' && !$this->isModeratorAuthenticated()) {
            return $this->error('Bild noch nicht freigegeben.', Response::HTTP_NOT_FOUND);
        }

        $filename = $comment['imageFile'] ?? null;
        $mime = $comment['imageMime'] ?? null;
        if (!is_string($filename) || !is_string($mime) || !isset(self::ALLOWED_IMAGES[$mime])) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $path = $this->storage->uploadsDir() . '/' . basename($filename);
        if (!is_file($path)) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', $mime);
        $response->headers->set('Content-Disposition', 'inline; filename="' . basename($filename) . '"');
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/comments/{id}/avatar', name: 'api_comment_avatar', methods: ['GET'])]
    public function commentAvatar(string $id): Response
    {
        $comment = $this->findComment($id);
        if ($comment === null || ($comment['status'] ?? null) !== 'approved') {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $userId = $comment['userId'] ?? null;
        if (!is_string($userId) || $userId === '') {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $user = $this->userStorage->findById($userId);
        if ($user === null || ($user['status'] ?? null) !== 'active') {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $filename = $user['avatarFile'] ?? null;
        $mime = $user['avatarMime'] ?? null;
        if (!is_string($filename) || !is_string($mime) || !isset(self::ALLOWED_AVATARS[$mime])) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $path = $this->userStorage->uploadsDir() . '/' . basename($filename);
        if (!is_file($path)) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', $mime);
        $response->headers->set('Content-Disposition', 'inline; filename="' . basename($filename) . '"');
        $response->headers->set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        return $response;
    }

    #[Route('/api/admin/login', name: 'api_admin_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        if ($response = $this->rateLimited($request, 'admin-login', 10, 900)) {
            return $response;
        }

        $payload = $this->jsonPayload($request);
        $email = $payload['email'] ?? null;
        $password = $payload['password'] ?? null;
        $configuredEmail = strtolower(trim($this->env('ADMIN_EMAIL')));
        $configuredHash = trim($this->env('ADMIN_PASSWORD_HASH'));
        $configuredPassword = $this->env('ADMIN_PASSWORD');

        $emailMatches = is_string($email) && hash_equals($configuredEmail, strtolower(trim($email)));
        $passwordMatches = is_string($password) && (($configuredHash !== '' && password_verify($password, $configuredHash)) || ($configuredHash === '' && $configuredPassword !== '' && hash_equals($configuredPassword, $password)));
        if ($configuredEmail === '' || (!$emailMatches || !$passwordMatches)) {
            return $this->error('E-Mail oder Passwort ist nicht korrekt.', Response::HTTP_UNAUTHORIZED);
        }

        if (session_status() === PHP_SESSION_ACTIVE && session_name() !== 'blacktea_admin') session_write_close();
        $this->startAdminSession();
        session_regenerate_id(true);
        $_SESSION['admin_email'] = strtolower(trim($email));
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_COOKIE['blacktea_admin'] = session_id();
        $adminEmail = $_SESSION['admin_email'];
        $adminCsrf = $_SESSION['csrf_token'];
        $profile = $this->users->connectAdminProfile(true);
        return new JsonResponse([
            'authenticated' => true,
            'email' => $adminEmail,
            'role' => 'admin',
            'canManageMembers' => true,
            'csrfToken' => $adminCsrf,
            'profileId' => $profile['id'] ?? null,
        ]);
    }

    #[Route('/api/admin/session', name: 'api_admin_session', methods: ['GET'])]
    public function session(): JsonResponse
    {
        $adminAuthenticated = $this->isAdminAuthenticated();
        $moderator = $adminAuthenticated ? null : $this->moderatorUser();
        $authenticated = $adminAuthenticated || $moderator !== null;
        $response = new JsonResponse([
            'authenticated' => $authenticated,
            'email' => $adminAuthenticated ? ($_SESSION['admin_email'] ?? null) : ($moderator['email'] ?? null),
            'role' => $adminAuthenticated ? 'admin' : ($moderator !== null ? 'moderator' : null),
            'canManageMembers' => $adminAuthenticated,
            'csrfToken' => $adminAuthenticated ? $this->csrfToken() : ($moderator !== null ? $this->users->csrfToken() : null),
        ]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/admin/notification-settings', name: 'api_admin_notification_settings_read', methods: ['GET'])]
    public function notificationSettings(): JsonResponse
    {
        $adminAuthenticated = $this->isAdminAuthenticated();
        $moderator = $adminAuthenticated ? null : $this->moderatorUser();
        if (!$adminAuthenticated && $moderator === null) {
            return $this->unauthorized();
        }

        $settings = $adminAuthenticated
            ? $this->storage->notificationSettingsForAdmin()
            : $this->storage->notificationSettingsForModerator((string) $moderator['id']);
        $response = new JsonResponse([
            'settings' => $settings,
            'role' => $adminAuthenticated ? 'admin' : 'moderator',
            'canManageRegistration' => $adminAuthenticated,
        ]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/admin/notification-settings', name: 'api_admin_notification_settings_update', methods: ['PATCH'])]
    public function updateNotificationSettings(Request $request): JsonResponse
    {
        $adminAuthenticated = $this->isAdminAuthenticated();
        $moderator = $adminAuthenticated ? null : $this->moderatorUser();
        if (!$adminAuthenticated && $moderator === null) {
            return $this->unauthorized();
        }
        if (!$this->validModeratorCsrfToken($request)) {
            return $this->error('Ungültige Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $payload = $this->jsonPayload($request);
        $settings = $payload['settings'] ?? null;
        if (!is_array($settings)) {
            return $this->error('Die E-Mail-Einstellungen sind nicht gültig.', Response::HTTP_BAD_REQUEST);
        }
        foreach (['comments', 'wiki', 'repair', 'bugs'] as $key) {
            if (isset($settings[$key]) && !is_bool($settings[$key])) {
                return $this->error('Die E-Mail-Einstellungen sind nicht gültig.', Response::HTTP_BAD_REQUEST);
            }
        }
        if ($adminAuthenticated && isset($settings['registration']) && !is_bool($settings['registration'])) {
            return $this->error('Die E-Mail-Einstellungen sind nicht gültig.', Response::HTTP_BAD_REQUEST);
        }

        $current = $adminAuthenticated
            ? $this->storage->notificationSettingsForAdmin()
            : $this->storage->notificationSettingsForModerator((string) $moderator['id']);
        $merged = array_merge($current, $settings);
        if (!$adminAuthenticated) {
            $merged['registration'] = false;
        }
        $identity = $adminAuthenticated ? 'admin' : (string) $moderator['id'];
        $saved = $this->storage->saveNotificationSettings($adminAuthenticated ? 'admin' : 'moderator', $identity, $merged);

        return new JsonResponse([
            'settings' => $saved,
            'role' => $adminAuthenticated ? 'admin' : 'moderator',
            'canManageRegistration' => $adminAuthenticated,
            'message' => 'E-Mail-Einstellungen gespeichert.',
        ]);
    }

    #[Route('/api/admin/chat', name: 'api_admin_chat_read', methods: ['GET'])]
    public function readStaffChat(Request $request): JsonResponse
    {
        $staff = $this->currentStaff($request);
        if ($staff === null) {
            return $this->unauthorized();
        }

        $cutoff = time() - self::STAFF_CHAT_RETENTION_SECONDS;
        $messages = [];
        $this->storage->update(static function (array &$data) use ($cutoff, &$messages): void {
            $messages = array_values(array_filter(
                $data['staffChat'],
                static fn (array $message): bool => strtotime((string) ($message['createdAt'] ?? '')) > $cutoff,
            ));
            $data['staffChat'] = $messages;
        });
        usort($messages, static fn (array $a, array $b): int => strcmp((string) ($a['createdAt'] ?? ''), (string) ($b['createdAt'] ?? '')));

        $response = new JsonResponse(['messages' => array_map(fn (array $message): array => $this->staffChatMessage($message), $messages)]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/admin/chat', name: 'api_admin_chat_create', methods: ['POST'])]
    public function createStaffChatMessage(Request $request): JsonResponse
    {
        $staff = $this->currentStaff($request);
        if ($staff === null) {
            return $this->unauthorized();
        }
        if (!$this->validModeratorCsrfToken($request)) {
            return $this->error('Ungültige Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $identity = $staff['role'] . ':' . $staff['id'];
        if (!$this->storage->allowRate('staff-chat-user', $identity, 60, 3600)
            || !$this->storage->allowRate('staff-chat-global', 'all', 300, 3600)
        ) {
            $response = $this->error('Zu viele Chat-Nachrichten. Bitte später erneut versuchen.', Response::HTTP_TOO_MANY_REQUESTS);
            $response->headers->set('Retry-After', '3600');
            return $response;
        }

        $body = $this->jsonPayload($request)['body'] ?? null;
        if (!is_string($body)) {
            return $this->error('Bitte eine Nachricht eingeben.', Response::HTTP_BAD_REQUEST);
        }
        $body = trim($body);
        if ($body === '' || $this->length($body) > 2000) {
            return $this->error('Die Nachricht muss zwischen 1 und 2000 Zeichen enthalten.', Response::HTTP_BAD_REQUEST);
        }

        $message = [
            'id' => bin2hex(random_bytes(16)),
            'authorId' => $staff['id'],
            'authorName' => $staff['name'],
            'authorRole' => $staff['role'],
            'body' => $body,
            'createdAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ];
        $message['mentions'] = $this->users->resolveMentions($body);
        $cutoff = time() - self::STAFF_CHAT_RETENTION_SECONDS;
        $this->storage->update(static function (array &$data) use ($cutoff, $message): void {
            $messages = array_values(array_filter(
                $data['staffChat'],
                static fn (array $candidate): bool => strtotime((string) ($candidate['createdAt'] ?? '')) > $cutoff,
            ));
            $messages[] = $message;
            $data['staffChat'] = array_slice($messages, -self::STAFF_CHAT_MAX_MESSAGES);
        });

        try {
            $this->users->notifyMentions($message, '/konto?bereich=chat', true);
        } catch (\Throwable $exception) { error_log('[mention-notification] ' . $exception->getMessage()); }
        return new JsonResponse(['message' => $this->staffChatMessage($message)], Response::HTTP_CREATED);
    }

    #[Route('/api/admin/comments', name: 'api_admin_comments', methods: ['GET'])]
    public function adminComments(Request $request): JsonResponse
    {
        $reviewer = $this->moderationReviewer($request);
        if ($reviewer === null) {
            return $this->unauthorized();
        }
        $adminAuthenticated = $reviewer['role'] === 'admin';

        $comments = array_values(array_filter(
            $this->storage->read()['comments'],
            static fn (array $comment) => ($comment['status'] ?? null) === 'pending'
                || ($adminAuthenticated && ($comment['status'] ?? null) === 'approved'),
        ));
        usort($comments, static fn (array $a, array $b): int => strcmp((string) ($b['createdAt'] ?? ''), (string) ($a['createdAt'] ?? '')));
        $response = new JsonResponse(['comments' => array_map(fn (array $comment): array => $this->adminComment($comment) + ['canModerate' => !$this->isOwnModeratorContent($comment, $reviewer)], $comments)]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/admin/users', name: 'api_admin_users', methods: ['GET'])]
    public function adminUsers(): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }

        $users = $this->userStorage->read()['users'];
        usort($users, static fn (array $a, array $b): int => strcmp((string) ($b['createdAt'] ?? ''), (string) ($a['createdAt'] ?? '')));
        $response = new JsonResponse(['users' => array_map(fn (array $user): array => $this->adminUser($user), $users)]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/admin/users/{id}/role', name: 'api_admin_user_role', methods: ['PATCH'])]
    public function updateUserRole(string $id, Request $request): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }
        if (!$this->validCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $user = $this->userStorage->findById($id);
        if ($user === null) {
            return $this->error('Mitglied nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $role = $this->jsonPayload($request)['role'] ?? null;
        if (!is_string($role) || !in_array($role, ['member', 'moderator'], true)) {
            return $this->error('Ungültige Rolle.', Response::HTTP_BAD_REQUEST);
        }

        $updated = null;
        $this->userStorage->update(static function (array &$data) use ($id, $role, &$updated): void {
            foreach ($data['users'] as &$candidate) {
                if (($candidate['id'] ?? null) !== $id) {
                    continue;
                }
                $candidate['role'] = $role;
                $updated = $candidate;
                break;
            }
            unset($candidate);
        });

        return is_array($updated)
            ? new JsonResponse([
                'member' => $this->adminUser($updated),
                'message' => $role === 'moderator' ? 'Mitglied ist jetzt Moderator.' : 'Moderatorrolle wurde entzogen.',
            ])
            : $this->error('Mitglied nicht gefunden.', Response::HTTP_NOT_FOUND);
    }

    #[Route('/api/admin/newsletter', name: 'api_admin_newsletter_send', methods: ['POST'])]
    public function sendNewsletter(Request $request): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }
        if (!$this->validCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $payload = $this->jsonPayload($request);
        $subject = $payload['subject'] ?? null;
        $title = $payload['title'] ?? null;
        $intro = $payload['intro'] ?? null;
        $body = $payload['body'] ?? null;
        if (!is_string($subject) || $this->length(trim($subject)) < 2 || $this->length(trim($subject)) > 160) {
            return $this->error('Bitte einen Betreff mit 2 bis 160 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($title) || $this->length(trim($title)) < 2 || $this->length(trim($title)) > 120) {
            return $this->error('Bitte eine Überschrift mit 2 bis 120 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($intro) || $this->length(trim($intro)) < 10 || $this->length(trim($intro)) > 500) {
            return $this->error('Bitte einen Vorspann mit 10 bis 500 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($body) || $this->length(trim($body)) < 10 || $this->length(trim($body)) > 8000) {
            return $this->error('Bitte einen Newslettertext mit 10 bis 8.000 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }

        $recipients = [];
        foreach ($this->userStorage->read()['users'] as $user) {
            $email = trim((string) ($user['email'] ?? ''));
            if (($user['status'] ?? null) !== 'active'
                || ($user['newsletterSubscribed'] ?? false) !== true
                || ($user['communicationBlocked'] ?? false) === true
                || !is_string($user['emailConfirmedAt'] ?? null)
                || $user['emailConfirmedAt'] === ''
                || filter_var($email, FILTER_VALIDATE_EMAIL) === false
            ) {
                continue;
            }
            $recipients[] = ['email' => $email, 'name' => trim((string) ($user['name'] ?? 'BTM-Community'))];
        }

        if ($recipients === []) {
            return $this->error('Es gibt aktuell keine bestätigten Newsletter-Abonnenten.', Response::HTTP_CONFLICT);
        }
        if (!$this->storage->allowRate('admin-newsletter', 'global', 1, 900)) {
            $response = $this->error('Ein Newsletter wurde gerade erst versendet. Bitte mindestens 15 Minuten warten.', Response::HTTP_TOO_MANY_REQUESTS);
            $response->headers->set('Retry-After', '900');
            return $response;
        }

        try {
            $sent = $this->mailjet->sendNewsletter($recipients, trim($subject), trim($title), trim($intro), trim($body));
        } catch (\Throwable $exception) {
            error_log('[admin-newsletter] ' . $exception->getMessage());
            return $this->error('Der Newsletter konnte gerade nicht vollständig versendet werden.', Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return new JsonResponse([
            'sent' => $sent,
            'recipients' => count($recipients),
            'message' => $sent . ' Newsletter-E-Mail' . ($sent === 1 ? '' : 's') . ' wurde' . ($sent === 1 ? '' : 'n') . ' versendet.',
        ]);
    }

    #[Route('/api/admin/users/{id}/message', name: 'api_admin_user_message', methods: ['POST'])]
    public function sendUserMessage(string $id, Request $request): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }
        if (!$this->validCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $user = $this->userStorage->findById($id);
        if ($user === null) {
            return $this->error('Mitglied nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $payload = $this->jsonPayload($request);
        $subject = $payload['subject'] ?? null;
        $body = $payload['body'] ?? null;
        if (!is_string($subject) || $this->length(trim($subject)) < 2 || $this->length(trim($subject)) > 160) {
            return $this->error('Bitte einen Betreff mit 2 bis 160 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($body) || $this->length(trim($body)) < 2 || $this->length(trim($body)) > 5000) {
            return $this->error('Bitte eine Nachricht mit 2 bis 5.000 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if ($response = $this->adminMailRateLimited('admin-user-message', $id, 3, 3600)) {
            return $response;
        }

        try {
            $this->mailjet->sendAdminMessage((string) $user['email'], (string) $user['name'], trim($subject), trim($body));
        } catch (\Throwable $exception) {
            error_log('[admin-user-message] ' . $exception->getMessage());
            return $this->error('Die Nachricht konnte gerade nicht versendet werden.', Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return new JsonResponse(['message' => 'Nachricht wurde versendet.']);
    }

    #[Route('/api/admin/users/{id}/password-reset', name: 'api_admin_user_password_reset', methods: ['POST'])]
    public function sendUserPasswordReset(string $id, Request $request): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }
        if (!$this->validCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $user = $this->userStorage->findById($id);
        if ($user === null) {
            return $this->error('Mitglied nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        if ($response = $this->adminMailRateLimited('admin-user-password-reset', $id, 2, 3600)) {
            return $response;
        }

        $reset = $this->emailConfirmation->createToken('/passwort-zuruecksetzen?token=');
        $this->userStorage->update(static function (array &$data) use ($id, $reset): void {
            foreach ($data['users'] as &$candidate) {
                if (($candidate['id'] ?? null) !== $id) {
                    continue;
                }
                $candidate['passwordResetTokenHash'] = $reset['tokenHash'];
                $candidate['passwordResetExpiresAt'] = $reset['expiresAt'];
                break;
            }
            unset($candidate);
        });

        try {
            $this->mailjet->sendPasswordReset((string) $user['email'], (string) $user['name'], $reset['token']);
        } catch (\Throwable $exception) {
            $this->clearPasswordResetToken($id, $reset['tokenHash']);
            error_log('[admin-user-password-reset] ' . $exception->getMessage());
            return $this->error('Die Passwort-Zurücksetzungs-Mail konnte gerade nicht versendet werden.', Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return new JsonResponse(['message' => 'Passwort-Zurücksetzungs-Mail wurde versendet.']);
    }

    #[Route('/api/admin/users/{id}/warning', name: 'api_admin_user_warning', methods: ['POST'])]
    public function warnUser(string $id, Request $request): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }
        if (!$this->validCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $user = $this->userStorage->findById($id);
        if ($user === null) {
            return $this->error('Mitglied nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $payload = $this->jsonPayload($request);
        $reason = $payload['reason'] ?? null;
        if (!is_string($reason) || $this->length(trim($reason)) < 5 || $this->length(trim($reason)) > 1000) {
            return $this->error('Bitte einen Verwarnungsgrund mit 5 bis 1.000 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (($user['communicationBlocked'] ?? false) === true) {
            return $this->error('Dieses Mitglied ist bereits für Kommunikation gesperrt.', Response::HTTP_CONFLICT);
        }
        if ($response = $this->adminMailRateLimited('admin-user-warning', $id, 3, 86400)) {
            return $response;
        }

        $warning = [
            'id' => bin2hex(random_bytes(16)),
            'reason' => trim($reason),
            'createdAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ];
        $updated = null;
        $blocked = false;
        $this->userStorage->update(static function (array &$data) use ($id, $warning, &$updated, &$blocked): void {
            foreach ($data['users'] as &$candidate) {
                if (($candidate['id'] ?? null) !== $id) {
                    continue;
                }
                $warnings = is_array($candidate['warnings'] ?? null) ? $candidate['warnings'] : [];
                $warnings[] = $warning;
                $candidate['warnings'] = array_slice($warnings, -20);
                $blocked = count($candidate['warnings']) >= 3;
                if ($blocked) {
                    $candidate['communicationBlocked'] = true;
                    $candidate['communicationBlockedAt'] ??= (new \DateTimeImmutable())->format(DATE_ATOM);
                }
                $updated = $candidate;
                break;
            }
            unset($candidate);
        });

        if (!is_array($updated)) {
            return $this->error('Mitglied nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $mailSent = true;
        try {
            $this->mailjet->sendWarning((string) $updated['email'], (string) $updated['name'], (string) $warning['reason'], count($updated['warnings']), $blocked);
        } catch (\Throwable $exception) {
            $mailSent = false;
            error_log('[admin-user-warning] ' . $exception->getMessage());
        }

        return new JsonResponse([
            'member' => $this->adminUser($updated),
            'mailSent' => $mailSent,
            'message' => $mailSent
                ? ($blocked ? 'Dritte Verwarnung gespeichert. Das Mitglied ist jetzt für Kommunikation gesperrt.' : 'Verwarnung gespeichert und per E-Mail mitgeteilt.')
                : 'Verwarnung gespeichert, aber die E-Mail konnte gerade nicht versendet werden.',
        ]);
    }

    #[Route('/api/admin/users/{id}', name: 'api_admin_user_delete', methods: ['DELETE'])]
    public function deleteUser(string $id, Request $request): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }
        if (!$this->validCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $deleted = null;
        $this->userStorage->update(static function (array &$data) use ($id, &$deleted): void {
            $remaining = [];
            foreach ($data['users'] as $candidate) {
                if (($candidate['id'] ?? null) === $id) {
                    $deleted = $candidate;
                    continue;
                }
                $remaining[] = $candidate;
            }
            $data['users'] = $remaining;
        });
        if (!is_array($deleted)) {
            return $this->error('Mitglied nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $this->userStorage->deleteAvatar($deleted['avatarFile'] ?? null);
        $deletedImages = [];
        $deletedEmail = strtolower((string) ($deleted['email'] ?? ''));
        $this->storage->update(static function (array &$data) use ($id, $deletedEmail, &$deletedImages): void {
            $data['comments'] = array_values(array_filter($data['comments'], static function (array $comment) use ($id, $deletedEmail, &$deletedImages): bool {
                $matchesUser = ($comment['userId'] ?? null) === $id;
                $matchesLegacyEmail = ($deletedEmail !== '' && ($comment['userId'] ?? null) === null && strtolower((string) ($comment['email'] ?? '')) === $deletedEmail);
                if ($matchesUser || $matchesLegacyEmail) {
                    if (isset($comment['imageFile']) && is_string($comment['imageFile'])) {
                        $deletedImages[] = $comment['imageFile'];
                    }
                    return false;
                }
                return true;
            }));
            $data['bugReports'] = array_values(array_filter($data['bugReports'], static function (array $bugReport) use ($id, $deletedEmail): bool {
                $matchesUser = ($bugReport['userId'] ?? null) === $id;
                $matchesLegacyEmail = ($deletedEmail !== '' && ($bugReport['userId'] ?? null) === null && strtolower((string) ($bugReport['email'] ?? '')) === $deletedEmail);
                return !$matchesUser && !$matchesLegacyEmail;
            }));
        });
        foreach ($deletedImages as $filename) {
            $this->storage->deleteImage($filename);
        }

        return new JsonResponse(['deleted' => true]);
    }

    #[Route('/api/admin/comments/{id}', name: 'api_admin_comment_update', methods: ['PATCH'])]
    public function updateComment(string $id, Request $request): JsonResponse
    {
        $reviewer = $this->moderationReviewer($request);
        if ($reviewer === null) {
            return $this->unauthorized();
        }
        $adminAuthenticated = $reviewer['role'] === 'admin';
        if (!$this->validModeratorCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $payload = $this->jsonPayload($request);
        $status = $payload['status'] ?? null;
        if (!in_array($status, ['pending', 'approved'], true)) {
            return $this->error('Ungültiger Veröffentlichungsstatus.', Response::HTTP_BAD_REQUEST);
        }
        if (array_key_exists('edits', $payload) && $status !== 'approved') {
            return $this->error('Textänderungen werden nur zusammen mit der Freigabe gespeichert.', Response::HTTP_BAD_REQUEST);
        }

        $updated = null;
        $awaitingConfirmation = false;
        $newlyApproved = false;
        $moderatorScopeViolation = false;
        $selfReview = false;
        $editError = null;
        $contentEdited = false;
        $this->storage->update(function (array &$data) use ($id, $status, $payload, $adminAuthenticated, $reviewer, &$contentEdited, &$editError, &$selfReview, &$updated, &$awaitingConfirmation, &$newlyApproved, &$moderatorScopeViolation): void {
            foreach ($data['comments'] as &$comment) {
                if (($comment['id'] ?? null) === $id) {
                    if ($this->isOwnModeratorContent($comment, $reviewer)) {
                        $selfReview = true;
                        break;
                    }
                    if (!$adminAuthenticated && ($comment['status'] ?? null) !== 'pending') {
                        $moderatorScopeViolation = true;
                        break;
                    }
                    if (($comment['status'] ?? null) === 'awaiting_confirmation') {
                        $awaitingConfirmation = true;
                        break;
                    }
                    $wasApproved = ($comment['status'] ?? null) === 'approved';
                    $previousVersion = $this->reviewVersion($comment);
                    $editError = $this->applyReviewEdits($comment, $payload, $reviewer);
                    if ($editError !== null) break;
                    $contentEdited = $previousVersion !== $this->reviewVersion($comment);
                    $comment['status'] = $status;
                    $comment['approvedAt'] = $status === 'approved' ? (new \DateTimeImmutable())->format(DATE_ATOM) : null;
                    if ($status !== 'approved' && ($comment['kind'] ?? null) === 'repair_answer' && is_string($comment['parentId'] ?? null)) {
                        foreach ($data['comments'] as &$parentComment) {
                            if (($parentComment['id'] ?? null) === $comment['parentId'] && ($parentComment['solutionAnswerId'] ?? null) === $id) {
                                $parentComment['solutionAnswerId'] = null;
                                break;
                            }
                        }
                        unset($parentComment);
                    }
                    $newlyApproved = $status === 'approved' && !$wasApproved;
                    $updated = $comment;
                    break;
                }
            }
            unset($comment);
        });

        if ($editError !== null) return $editError;
        if ($selfReview) {
            return $this->error('Eigene Beiträge müssen von einem anderen Moderator oder Admin geprüft werden.', Response::HTTP_FORBIDDEN);
        }
        if ($moderatorScopeViolation) {
            return $this->error('Moderatoren können nur offene Beiträge bearbeiten.', Response::HTTP_FORBIDDEN);
        }

        if ($awaitingConfirmation) {
            return $this->error('Die E-Mail-Adresse wurde noch nicht bestätigt.', Response::HTTP_CONFLICT);
        }

        if (!is_array($updated)) {
            return $this->error('Kommentar nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        if ($newlyApproved || $contentEdited) $this->notifyPublishedMentions($updated);

        if ($newlyApproved && ($updated['kind'] ?? null) === 'repair_answer' && is_string($updated['parentId'] ?? null)) {
            $parent = $this->findComment($updated['parentId']);
            if ($parent !== null) {
                try {
                    $this->users->notifyReply((string) ($parent['userId'] ?? ''), $updated, $parent);
                    $subscriberUserIds = is_array($parent['subscriberUserIds'] ?? null) ? $parent['subscriberUserIds'] : [];
                    $this->users->notifyRepairSubscribers($subscriberUserIds, $updated, $parent);
                } catch (\Throwable $exception) {
                    error_log('[reply-notification] ' . $exception->getMessage());
                }
            }
        }

        if ($newlyApproved && ($updated['kind'] ?? null) === 'repair_request') {
            $recipientIds = is_array($updated['subscriberUserIds'] ?? null) ? $updated['subscriberUserIds'] : [];
            if (is_string($updated['userId'] ?? null) && $updated['userId'] !== '') {
                $recipientIds[] = $updated['userId'];
            }
            try {
                $this->users->notifyRepairRequestStatus($recipientIds, $updated);
            } catch (\Throwable $exception) {
                error_log('[repair-status-notification] ' . $exception->getMessage());
            }
        }

        if ($newlyApproved && ($updated['guide'] ?? null) === self::COMMUNITY_EXPERIENCE_GUIDE && ($updated['kind'] ?? null) === 'comment') {
            $authorId = is_string($updated['userId'] ?? null) ? $updated['userId'] : '';
            $postedModel = is_string($updated['section'] ?? null) ? $updated['section'] : '';
            $recipientIds = [];
            foreach ($this->userStorage->read()['users'] ?? [] as $candidate) {
                $candidateId = is_string($candidate['id'] ?? null) ? $candidate['id'] : '';
                if ($candidateId === '' || $candidateId === $authorId || ($candidate['status'] ?? null) !== 'active' || ($candidate['notifyCommunity'] ?? true) !== true) {
                    continue;
                }
                $candidateModel = is_string($candidate['model'] ?? null) ? $candidate['model'] : '';
                if ($postedModel !== '' && $candidateModel !== '' && !$this->sameModelGroup($postedModel, $candidateModel)) {
                    continue;
                }
                $recipientIds[] = $candidateId;
            }
            try {
                $this->users->notifyCommunityPost($recipientIds, $updated);
            } catch (\Throwable $exception) {
                error_log('[community-notification] ' . $exception->getMessage());
            }
        }

        return new JsonResponse(['comment' => $this->adminComment($updated) + ['canModerate' => !$this->isOwnModeratorContent($updated, $reviewer)]]);
    }

    #[Route('/api/admin/comments/{id}', name: 'api_admin_comment_delete', methods: ['DELETE'])]
    public function deleteComment(string $id, Request $request): JsonResponse
    {
        $reviewer = $this->moderationReviewer($request);
        if ($reviewer === null) {
            return $this->unauthorized();
        }
        $adminAuthenticated = $reviewer['role'] === 'admin';
        if (!$this->validModeratorCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $deleted = null;
        $moderatorScopeViolation = false;
        $selfReview = false;
        $this->storage->update(function (array &$data) use ($id, $adminAuthenticated, $reviewer, &$selfReview, &$deleted, &$moderatorScopeViolation): void {
            $remaining = [];
            foreach ($data['comments'] as $comment) {
                if (($comment['id'] ?? null) === $id) {
                    if ($this->isOwnModeratorContent($comment, $reviewer)) {
                        $selfReview = true;
                        return;
                    }
                    if (!$adminAuthenticated && ($comment['status'] ?? null) !== 'pending') {
                        $moderatorScopeViolation = true;
                        $remaining[] = $comment;
                        continue;
                    }
                    $deleted = $comment;
                    continue;
                }
                $remaining[] = $comment;
            }
            if ($deleted === null) return;
            $data['comments'] = $remaining;
            foreach ($data['comments'] as &$comment) {
                if (($comment['kind'] ?? null) === 'repair_request' && ($comment['solutionAnswerId'] ?? null) === $id) {
                    $comment['solutionAnswerId'] = null;
                }
            }
            unset($comment);
        });

        if ($selfReview) {
            return $this->error('Eigene Beiträge müssen von einem anderen Moderator oder Admin geprüft werden.', Response::HTTP_FORBIDDEN);
        }
        if ($moderatorScopeViolation) {
            return $this->error('Moderatoren können nur offene Beiträge löschen.', Response::HTTP_FORBIDDEN);
        }

        if (!is_array($deleted)) {
            return $this->error('Kommentar nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $this->storage->deleteImage($deleted['imageFile'] ?? null);

        return new JsonResponse(['deleted' => true]);
    }

    #[Route('/api/admin/logout', name: 'api_admin_logout', methods: ['POST'])]
    public function logout(Request $request): JsonResponse
    {
        if ($this->isAdminAuthenticated()) {
            if (!$this->validCsrfToken($request)) {
                return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
            }

            $this->users->disconnectAdminProfile();
            $_SESSION = [];
            session_destroy();
            $this->clearAdminSessionCookie();
            return new JsonResponse(['authenticated' => false]);
        }

        if ($this->moderatorUser() === null) {
            return $this->unauthorized();
        }
        if (!$this->users->validCsrfToken($request->headers->get('X-CSRF-Token', ''))) {
            return $this->error('Ungültige Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $this->users->logout();
        return new JsonResponse(['authenticated' => false]);
    }

    private function validGuide(string $guide): bool
    {
        return $guide === self::COMMUNITY_EXPERIENCE_GUIDE || preg_match('/^(hilfe|ersatzteil|wiki)-[a-z0-9-]{1,90}$/', $guide) === 1;
    }

    /** @return list<string> */
    private function expectedKinds(string $guide): array
    {
        if ($guide === self::REPAIR_REQUEST_GUIDE) {
            return ['repair_request', 'repair_answer'];
        }

        if ($guide === self::COMMUNITY_EXPERIENCE_GUIDE) {
            return ['comment'];
        }

        return [$this->isWikiGuide($guide) ? 'wiki_suggestion' : 'comment'];
    }

    private function isWikiGuide(string $guide): bool
    {
        return str_starts_with($guide, 'wiki-');
    }

    private function sameModelGroup(string $left, string $right): bool
    {
        if ($left === 'Bonfire' && str_starts_with($right, 'Bonfire')) {
            return true;
        }
        if ($right === 'Bonfire' && str_starts_with($left, 'Bonfire')) {
            return true;
        }

        return $left === $right;
    }

    /** @param list<array<string, mixed>> $allComments */
    private function publicContribution(array $comment, array $allComments): array
    {
        $kind = (string) ($comment['kind'] ?? 'comment');
        $parent = [];
        if (is_string($comment['parentId'] ?? null)) {
            foreach ($allComments as $candidate) {
                if (($candidate['id'] ?? null) === $comment['parentId']) {
                    $parent = $candidate;
                    break;
                }
            }
        }
        if (is_string($comment['topic'] ?? null) && trim($comment['topic']) !== '') {
            $title = trim($comment['topic']);
        } elseif ($kind === 'repair_answer') {
            $title = 'Antwort auf „' . (string) ($parent['topic'] ?? 'Reparaturanfrage') . '“';
        } elseif ($kind === 'community_reply') {
            $title = 'Kommentar zu „' . (string) ($parent['topic'] ?? 'Community-Beitrag') . '“';
        } elseif ($kind === 'wiki_suggestion') {
            $title = 'Wiki-Beitrag';
        } else {
            $title = 'Community-Beitrag';
        }
        if ($kind === 'repair_answer' && is_string($comment['parentId'] ?? null)) {
            $href = '/hilfe/anfragen/' . $comment['parentId'];
        } elseif ($kind === 'repair_request') {
            $href = '/hilfe/anfragen/' . (string) ($comment['id'] ?? '');
        } elseif ($kind === 'community_reply') {
            $href = '/community#beitrag-' . (string) $comment['parentId'];
        } else {
            $href = '/community';
        }

        return [
            'id' => (string) ($comment['id'] ?? ''),
            'kind' => $kind,
            'title' => $title,
            'body' => $this->excerpt((string) ($comment['body'] ?? ''), 220),
            'editAttribution' => $this->publicEditAttribution($comment),
            'mentions' => $this->commentMentions($comment),
            'href' => $href,
            'createdAt' => (string) ($comment['createdAt'] ?? ''),
            'isSolution' => $kind === 'repair_answer' && ($parent['solutionAnswerId'] ?? null) === ($comment['id'] ?? null),
        ];
    }

    private function excerpt(string $value, int $limit): string
    {
        $value = trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
        if (function_exists('mb_strlen') && mb_strlen($value, 'UTF-8') > $limit) {
            return rtrim(mb_substr($value, 0, $limit - 1, 'UTF-8')) . '…';
        }
        if (!function_exists('mb_strlen') && strlen($value) > $limit) {
            return rtrim(substr($value, 0, $limit - 1)) . '…';
        }
        return $value;
    }

    private function jsonPayload(Request $request): array
    {
        $decoded = json_decode($request->getContent(), true);
        return is_array($decoded) ? $decoded : [];
    }

    private function findComment(string $id): ?array
    {
        foreach ($this->storage->read()['comments'] as $comment) {
            if (($comment['id'] ?? null) === $id) {
                return $comment;
            }
        }
        return null;
    }

    private function answerVoteKey(?array $user): string
    {
        $identity = is_array($user) && is_string($user['id'] ?? null) && $user['id'] !== ''
            ? 'user:' . $user['id']
            : 'session:' . session_id();

        return hash('sha256', $identity);
    }

    private function commentMentions(array $comment): array
    {
        return $this->users->resolveMentions(implode("\n", [$comment['topic'] ?? '', $comment['body'] ?? '', $comment['section'] ?? '', $comment['source'] ?? '']), $comment['mentions'] ?? null);
    }

    private function notifyPublishedMentions(array $comment): void
    {
        $guide = $comment['guide'];
        $kind = $comment['kind'] ?? 'comment';
        if ($kind === 'repair_answer' || $kind === 'repair_request') {
            $href = '/hilfe/anfragen/' . ($kind === 'repair_answer' ? $comment['parentId'] : $comment['id']) . '#beitrag-' . $comment['id'];
        } elseif (str_starts_with($guide, 'wiki-')) {
            $href = '/bikes/' . substr($guide, 5) . '#beitrag-' . $comment['id'];
        } elseif (str_starts_with($guide, 'hilfe-') || str_starts_with($guide, 'ersatzteil-')) {
            $href = (str_starts_with($guide, 'hilfe-') ? '/hilfe/' . substr($guide, 6) : '/ersatzteile/' . substr($guide, 10)) . '#beitrag-' . $comment['id'];
        } else {
            $href = '/community#beitrag-' . ($kind === 'community_reply' ? $comment['parentId'] : $comment['id']);
        }
        try { $this->users->notifyMentions($comment, $href); }
        catch (\Throwable $exception) { error_log('[mention-notification] ' . $exception->getMessage()); }
    }

    private function publicComment(array $comment, ?string $viewerUserId = null, ?string $viewerVoteKey = null): array
    {
        $avatarStyle = null;
        $avatarUrl = null;
        $userId = $comment['userId'] ?? null;
        $user = null;
        if (is_string($userId) && $userId !== '') {
            $user = $this->userStorage->findById($userId);
            if ($user !== null && ($user['status'] ?? null) === 'active') {
                $avatarStyle = max(0, min(19, (int) ($user['avatarStyle'] ?? 0)));
                $avatarUrl = !empty($user['avatarFile'])
                    ? '/api/comments/' . rawurlencode((string) $comment['id']) . '/avatar?v=' . substr(hash('sha256', (string) $user['avatarFile']), 0, 16)
                    : '/images/avatars/avatar-' . str_pad((string) ($avatarStyle + 1), 2, '0', STR_PAD_LEFT) . '.webp';
            }
        }

        $public = [
            'id' => (string) $comment['id'],
            'kind' => (string) ($comment['kind'] ?? 'comment'),
            'name' => (string) $comment['name'],
            'body' => (string) $comment['body'],
            'editAttribution' => $this->publicEditAttribution($comment),
            'mentions' => $this->commentMentions($comment),
            'topic' => isset($comment['topic']) && is_string($comment['topic']) ? $comment['topic'] : null,
            'section' => isset($comment['section']) && is_string($comment['section']) ? $comment['section'] : null,
            'source' => isset($comment['source']) && is_string($comment['source']) ? $comment['source'] : null,
            'parentId' => isset($comment['parentId']) && is_string($comment['parentId']) ? $comment['parentId'] : null,
            'createdAt' => (string) $comment['createdAt'],
            'imageUrl' => !empty($comment['imageFile']) ? '/api/comments/' . rawurlencode((string) $comment['id']) . '/image' : null,
            'avatarStyle' => $avatarStyle,
            'avatarUrl' => $avatarUrl,
            'profileId' => is_string($userId) && $userId !== '' && $user !== null && ($user['status'] ?? null) === 'active' ? $userId : null,
        ];

        if (($comment['kind'] ?? null) === 'repair_answer') {
            $votes = is_array($comment['votes'] ?? null) ? $comment['votes'] : [];
            $voterKeys = is_array($votes['voterKeys'] ?? null) ? $votes['voterKeys'] : [];
            $public += [
                'upVotes' => max(0, (int) ($votes['up'] ?? 0)),
                'downVotes' => max(0, (int) ($votes['down'] ?? 0)),
                'score' => max(0, (int) ($votes['up'] ?? 0)) - max(0, (int) ($votes['down'] ?? 0)),
                'viewerVote' => $viewerVoteKey !== null && in_array($voterKeys[$viewerVoteKey] ?? null, ['up', 'down'], true) ? $voterKeys[$viewerVoteKey] : null,
            ];
        }

        if (($comment['kind'] ?? null) === 'repair_request') {
            $public += [
                'solutionAnswerId' => is_string($comment['solutionAnswerId'] ?? null) ? $comment['solutionAnswerId'] : null,
                'isRequestOwner' => $viewerUserId !== null && ($comment['userId'] ?? null) === $viewerUserId,
            ];
        }

        return $public;
    }

    private function adminComment(array $comment): array
    {
        return $this->publicComment($comment) + [
            'guide' => (string) $comment['guide'],
            'email' => (string) $comment['email'],
            'status' => (string) $comment['status'],
            'approvedAt' => $comment['approvedAt'] ?? null,
            'reviewVersion' => $this->reviewVersion($comment),
        ];
    }

    private function adminUser(array $user): array
    {
        $warnings = [];
        foreach (($user['warnings'] ?? []) as $warning) {
            if (!is_array($warning) || !is_string($warning['id'] ?? null) || !is_string($warning['reason'] ?? null) || !is_string($warning['createdAt'] ?? null)) {
                continue;
            }
            $warnings[] = [
                'id' => $warning['id'],
                'reason' => $warning['reason'],
                'createdAt' => $warning['createdAt'],
            ];
        }

        return [
            'id' => (string) $user['id'],
            'name' => (string) $user['name'],
            'email' => (string) $user['email'],
            'role' => ($user['role'] ?? 'member') === 'moderator' ? 'moderator' : 'member',
            'status' => (string) ($user['status'] ?? 'active'),
            'model' => $user['model'] ?? null,
            'kilometers' => (int) ($user['kilometers'] ?? 0),
            'createdAt' => (string) ($user['createdAt'] ?? ''),
            'emailConfirmedAt' => isset($user['emailConfirmedAt']) && is_string($user['emailConfirmedAt']) ? $user['emailConfirmedAt'] : null,
            'newsletterSubscribed' => ($user['newsletterSubscribed'] ?? false) === true,
            'warningCount' => count($warnings),
            'warnings' => $warnings,
            'communicationBlocked' => ($user['communicationBlocked'] ?? false) === true || count($warnings) >= 3,
            'communicationBlockedAt' => isset($user['communicationBlockedAt']) && is_string($user['communicationBlockedAt']) ? $user['communicationBlockedAt'] : null,
        ];
    }

    private function adminMailRateLimited(string $scope, string $userId, int $perUserLimit, int $windowSeconds): ?JsonResponse
    {
        $allowed = $this->storage->allowRate($scope . '-user', $userId, $perUserLimit, $windowSeconds)
            && $this->storage->allowRate($scope . '-global', 'all', 30, $windowSeconds);
        if ($allowed) {
            return null;
        }

        $response = $this->error('Zu viele Nachrichten für dieses Mitglied. Bitte später erneut versuchen.', Response::HTTP_TOO_MANY_REQUESTS);
        $response->headers->set('Retry-After', (string) $windowSeconds);
        return $response;
    }

    private function clearPasswordResetToken(string $id, string $tokenHash): void
    {
        $this->userStorage->update(static function (array &$data) use ($id, $tokenHash): void {
            foreach ($data['users'] as &$candidate) {
                if (($candidate['id'] ?? null) !== $id || ($candidate['passwordResetTokenHash'] ?? null) !== $tokenHash) {
                    continue;
                }
                unset($candidate['passwordResetTokenHash'], $candidate['passwordResetExpiresAt']);
                break;
            }
            unset($candidate);
        });
    }

    private function unauthorized(): JsonResponse
    {
        return $this->error('Nicht autorisiert.', Response::HTTP_UNAUTHORIZED);
    }

    private function rateLimited(Request $request, string $scope, int $maxAttempts, int $windowSeconds): ?JsonResponse
    {
        $identity = $request->getClientIp() ?? 'unknown';
        if ($this->storage->allowRate($scope, $identity, $maxAttempts, $windowSeconds)) {
            return null;
        }

        $response = $this->error('Zu viele Anfragen. Bitte später erneut versuchen.', Response::HTTP_TOO_MANY_REQUESTS);
        $response->headers->set('Retry-After', (string) $windowSeconds);
        return $response;
    }

    private function confirmationRateLimited(Request $request, string $email): ?JsonResponse
    {
        $ip = $request->getClientIp() ?? 'unknown';
        $allowed = $this->storage->allowRate('confirmation-mail-email', $email, 5, 3600)
            && $this->storage->allowRate('confirmation-mail-ip', $ip, 10, 3600)
            && $this->storage->allowRate('confirmation-mail-global', 'all', 100, 3600);
        if ($allowed) {
            return null;
        }

        $response = $this->error('Zu viele Bestätigungs-E-Mails. Bitte später erneut versuchen.', Response::HTTP_TOO_MANY_REQUESTS);
        $response->headers->set('Retry-After', '3600');
        return $response;
    }

    private function removeComment(string $id): void
    {
        $this->storage->update(static function (array &$data) use ($id): void {
            $data['comments'] = array_values(array_filter(
                $data['comments'],
                static fn (array $comment): bool => ($comment['id'] ?? null) !== $id,
            ));
        });
    }

    private function submissionLabel(string $kind, ?string $topic): string
    {
        $label = match ($kind) {
            'wiki_suggestion' => 'Wiki-Vorschlag',
            'repair_request' => 'Reparaturanfrage',
            'repair_answer' => 'Antwort auf eine Reparaturanfrage',
            default => 'Kommentar',
        };

        return $topic !== null && $topic !== '' ? $label . ': ' . $topic : $label;
    }

    /** @param array<string, mixed> $comment */
    private function notifyAdminAboutComment(array $comment): void
    {
        $commentId = (string) ($comment['id'] ?? '');
        if ($commentId === '' || ($comment['status'] ?? null) !== 'pending') {
            return;
        }
        try {
            $category = $this->notificationCategoryForComment($comment);
            $recipients = $this->moderationNotificationRecipients($category);
        } catch (\Throwable $exception) {
            error_log('[admin-moderation-notification] ' . $exception->getMessage());
            return;
        }
        if ($recipients === []) {
            return;
        }
        if (!$this->storage->allowRate('admin-moderation-notification', $commentId, 1, 86400)
            || !$this->storage->allowRate('admin-moderation-notification-global', 'all', 30, 3600)
        ) {
            error_log('[admin-moderation-notification] Rate-Limit erreicht.');
            return;
        }

        try {
            $kind = (string) ($comment['kind'] ?? 'comment');
            $topic = isset($comment['topic']) && is_string($comment['topic']) ? trim($comment['topic']) : null;
            foreach ($recipients as $recipient) {
                try {
                    $this->mailjet->sendModerationNotification(
                        $recipient,
                        $this->submissionLabel($kind, $topic),
                        (string) ($comment['name'] ?? ''),
                        (string) ($comment['email'] ?? ''),
                        (string) ($comment['body'] ?? ''),
                        (string) ($comment['guide'] ?? ''),
                    );
                } catch (\Throwable $exception) {
                    error_log('[admin-moderation-notification] ' . $exception->getMessage());
                }
            }
        } catch (\Throwable $exception) {
            error_log('[admin-moderation-notification] ' . $exception->getMessage());
        }
    }

    private function notificationCategoryForComment(array $comment): string
    {
        return match ((string) ($comment['kind'] ?? 'comment')) {
            'wiki_suggestion' => 'wiki',
            'repair_request', 'repair_answer' => 'repair',
            default => 'comments',
        };
    }

    /** @return list<string> */
    private function moderationNotificationRecipients(string $category): array
    {
        $recipients = [];
        $adminEmail = strtolower(trim($this->env('ADMIN_EMAIL')));
        if (filter_var($adminEmail, FILTER_VALIDATE_EMAIL) !== false
            && ($this->storage->notificationSettingsForAdmin()[$category] ?? true) === true
        ) {
            $recipients[] = $adminEmail;
        }

        foreach ($this->userStorage->read()['users'] as $user) {
            $email = strtolower(trim((string) ($user['email'] ?? '')));
            $userId = (string) ($user['id'] ?? '');
            if (($user['status'] ?? null) !== 'active'
                || ($user['role'] ?? 'member') !== 'moderator'
                || $userId === ''
                || filter_var($email, FILTER_VALIDATE_EMAIL) === false
                || ($this->storage->notificationSettingsForModerator($userId)[$category] ?? true) !== true
                || in_array($email, $recipients, true)
            ) {
                continue;
            }
            $recipients[] = $email;
        }

        return $recipients;
    }

    private function confirmationPage(string $title, string $message, string $path, int $status): Response
    {
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safePath = htmlspecialchars($path, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $safeTitle . ' — BTM-Hilfe</title><style>body{margin:0;padding:32px;background:#f3f2ee;color:#27252d;font:16px/1.6 system-ui,sans-serif}.card{max-width:620px;margin:10vh auto;padding:32px;background:#fbfaf7;border:2px solid #2d27c7;border-radius:14px;box-shadow:5px 6px 0 rgba(45,39,199,.12)}h1{margin:0 0 16px;font-size:clamp(30px,6vw,48px);line-height:1.05}a{display:inline-block;margin-top:14px;padding:11px 16px;border-radius:8px;color:#fff;background:#2d27c7;text-decoration:none;font-weight:700}</style></head><body><main class="card"><h1>' . $safeTitle . '</h1><p>' . $safeMessage . '</p><a href="' . $safePath . '">Zurück zu BTM-Hilfe ↗</a></main></body></html>';

        return new Response($html, $status, [
            'Cache-Control' => 'no-store',
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => $message], $status);
    }

    private function env(string $key): string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        return is_string($value) ? $value : '';
    }

    private function startAdminSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        session_save_path($this->storage->sessionsDir());
        if (session_name() !== 'blacktea_admin') {
            $cookie = $_COOKIE['blacktea_admin'] ?? null;
            session_id(is_string($cookie) && preg_match('/^[a-zA-Z0-9,-]{1,256}$/D', $cookie) === 1 ? $cookie : '');
        }
        session_name('blacktea_admin');
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

    private function csrfToken(): string
    {
        if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token']) || $_SESSION['csrf_token'] === '') {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['csrf_token'];
    }

    private function validCsrfToken(Request $request): bool
    {
        $sessionToken = $_SESSION['csrf_token'] ?? null;
        $requestToken = $request->headers->get('X-CSRF-Token');
        return is_string($sessionToken) && $sessionToken !== '' && is_string($requestToken) && hash_equals($sessionToken, $requestToken);
    }

    private function isAdminAuthenticated(): bool
    {
        if (session_status() !== PHP_SESSION_ACTIVE && !$this->hasAdminSessionCookie()) {
            return false;
        }
        $this->startAdminSession();
        return isset($_SESSION['admin_email']) && is_string($_SESSION['admin_email']) && $_SESSION['admin_email'] !== '';
    }

    private function isModeratorAuthenticated(): bool
    {
        if ($this->isAdminAuthenticated()) {
            return true;
        }

        return $this->moderatorUser() !== null;
    }

    private function validModeratorCsrfToken(Request $request): bool
    {
        $context = $this->requestedStaffContext($request);
        if ($context === 'moderator') {
            return $this->moderatorUser() !== null
                && $this->users->validCsrfToken($request->headers->get('X-CSRF-Token', ''));
        }

        if ($context === 'admin' || $this->isAdminAuthenticated()) {
            return $this->validCsrfToken($request);
        }

        return $this->moderatorUser() !== null
            && $this->users->validCsrfToken($request->headers->get('X-CSRF-Token', ''));
    }

    private function requestedStaffContext(Request $request): ?string
    {
        $context = strtolower(trim($request->headers->get('X-Staff-Context', '')));
        return in_array($context, ['admin', 'moderator'], true) ? $context : null;
    }

    /** @return array{id: string, name: string, role: 'admin'|'moderator'}|null */
    private function currentStaff(?Request $request = null): ?array
    {
        $context = $request ? $this->requestedStaffContext($request) : null;
        if ($context !== 'moderator' && $this->isAdminAuthenticated()) {
            $profile = $this->userStorage->findByEmail((string) ($_SESSION['admin_email'] ?? ''));
            return [
                'id' => (string) ($profile['id'] ?? $_SESSION['admin_email'] ?? 'admin'),
                'name' => (string) ($profile['name'] ?? 'Admin'),
                'role' => 'admin',
            ];
        }

        $moderator = $this->moderatorUser();
        if ($moderator === null) {
            return null;
        }

        return [
            'id' => (string) $moderator['id'],
            'name' => (string) $moderator['name'],
            'role' => 'moderator',
        ];
    }

    /** @return array{id: string, authorName: string, authorRole: string, body: string, createdAt: string} */
    private function staffChatMessage(array $message): array
    {
        return [
            'id' => (string) $message['id'],
            'authorName' => (string) $message['authorName'],
            'authorRole' => (string) $message['authorRole'],
            'body' => (string) $message['body'],
            'mentions' => $this->users->resolveMentions($message['body'], $message['mentions'] ?? null),
            'createdAt' => (string) $message['createdAt'],
        ];
    }

    private function moderatorUser(): ?array
    {
        if (session_status() === PHP_SESSION_ACTIVE && session_name() === 'blacktea_admin' && !isset($_SESSION['admin_email'])) {
            session_write_close();
        }
        $user = $this->users->currentUser();
        return is_array($user) && ($user['role'] ?? 'member') === 'moderator' ? $user : null;
    }

    private function hasAdminSessionCookie(): bool
    {
        $sessionId = $_COOKIE['blacktea_admin'] ?? null;
        return is_string($sessionId) && $sessionId !== '';
    }

    private function clearAdminSessionCookie(): void
    {
        if (!ini_get('session.use_cookies')) {
            return;
        }

        $params = session_get_cookie_params();
        setcookie('blacktea_admin', '', [
            'expires' => time() - 42000,
            'path' => (string) ($params['path'] ?? '/'),
            'domain' => (string) ($params['domain'] ?? ''),
            'secure' => (bool) ($params['secure'] ?? false),
            'httponly' => (bool) ($params['httponly'] ?? true),
            'samesite' => (string) ($params['samesite'] ?? 'Lax'),
        ]);
    }

    private function length(string $value): int
    {
        return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
    }
}
