<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

trait CommunityInteractionTrait
{
    /** Resolve the authenticated reviewer once, respecting explicit staff context. */
    private function moderationReviewer(Request $request): ?array
    {
        if (!$this->communityStaffAuthenticated($request)) return null;
        if ($this->requestedStaffContext($request) !== 'moderator' && $this->isAdminAuthenticated()) {
            $profile = $this->userStorage->findByEmail((string) ($_SESSION['admin_email'] ?? ''));
            return ['role' => 'admin', 'id' => $profile['id'] ?? null, 'name' => $profile['name'] ?? 'Admin'];
        }
        return $this->moderatorUser();
    }

    private function isOwnModeratorContent(array $comment, array $reviewer): bool
    {
        if (($reviewer['role'] ?? null) !== 'moderator') return false;
        $authorId = $comment['userId'] ?? null;
        if (is_string($authorId) && $authorId !== '') return $authorId === ($reviewer['id'] ?? null);
        // Guest contributions predate a profile; never override another explicit owner ID.
        $email = strtolower(trim((string) ($comment['email'] ?? '')));
        return $email !== '' && $email === strtolower(trim((string) ($reviewer['email'] ?? '')));
    }

    private function hasOwnReportedReply(string $parentId, array $comments, array $reviewer): bool
    {
        foreach ($comments as $comment) {
            if (($comment['kind'] ?? null) === 'community_reply' && ($comment['parentId'] ?? null) === $parentId
                && !empty($comment['communityReports']) && $this->isOwnModeratorContent($comment, $reviewer)) return true;
        }
        return false;
    }

    private function communityStaffAuthenticated(Request $request): bool
    {
        $context = $this->requestedStaffContext($request);
        if ($context === null) {
            return $this->isModeratorAuthenticated();
        }
        $sessionName = $context === 'moderator' ? 'blacktea_user' : 'blacktea_admin';
        if (session_status() === PHP_SESSION_ACTIVE && session_name() !== $sessionName) {
            session_write_close();
        }
        if (session_status() !== PHP_SESSION_ACTIVE && session_name() !== $sessionName) {
            $cookie = $_COOKIE[$sessionName] ?? null;
            session_id(is_string($cookie) && preg_match('/^[a-zA-Z0-9,-]{1,256}$/D', $cookie) === 1 ? $cookie : '');
        }
        return $context === 'moderator' ? $this->moderatorUser() !== null : $this->isAdminAuthenticated();
    }

    private function communityWriteGuard(Request $request): ?JsonResponse
    {
        $user = $this->users->currentUser();
        if ($user === null) {
            return $this->unauthorized();
        }
        if (!$this->users->validCsrfToken($request->headers->get('X-CSRF-Token', ''))) {
            return $this->error('Ungültige Sitzung. Bitte lade die Seite neu.', Response::HTTP_FORBIDDEN);
        }
        if (($user['communicationBlocked'] ?? false) === true) {
            return $this->error('Dein Konto ist für Community-Kommunikation gesperrt.', Response::HTTP_FORBIDDEN);
        }
        return null;
    }

    private function isCommunityVisible(array $comment, array $comments): bool
    {
        if (($comment['status'] ?? null) !== 'approved' || !is_string($comment['userId'] ?? null)) {
            return false;
        }
        if (($this->userStorage->findById($comment['userId'])['status'] ?? null) !== 'active') {
            return false;
        }
        if (in_array($comment['kind'] ?? null, ['community_reply', 'repair_answer'], true)) {
            foreach ($comments as $parent) {
                if (($parent['id'] ?? null) === ($comment['parentId'] ?? null)) {
                    // Replies are one level deep; never expose a reply to a hidden parent.
                    if (($comment['kind'] ?? null) === 'community_reply') {
                        return ($parent['kind'] ?? null) !== 'community_reply' && $this->isCommunityVisible($parent, $comments);
                    }
                    return ($parent['kind'] ?? null) === 'repair_request' && ($parent['status'] ?? null) === 'approved';
                }
            }
            return false;
        }
        return true;
    }

    private function communityReplyPublic(array $reply, ?array $viewer): array
    {
        return $this->publicComment($reply) + [
            'likeCount' => count($reply['communityLikes'] ?? []),
            'viewerLiked' => $viewer !== null && in_array($viewer['id'], $reply['communityLikes'] ?? [], true),
            'viewerReported' => $viewer !== null && in_array($viewer['id'], array_column($reply['communityReports'] ?? [], 'userId'), true),
        ];
    }

    #[Route('/api/community/posts/{id}/like', methods: ['PUT', 'DELETE'])]
    public function communityLike(string $id, Request $request): JsonResponse
    {
        if ($response = $this->communityWriteGuard($request)) {
            return $response;
        }
        $viewer = $this->users->currentUser();
        if (!$this->storage->allowRate('community-like', $viewer['id'], 120, 60)) {
            return $this->error('Bitte warte kurz, bevor du erneut ein Like vergibst.', Response::HTTP_TOO_MANY_REQUESTS);
        }
        $liked = $request->isMethod('PUT');
        $updated = null;
        $newLike = false;
        $this->storage->update(function (array &$data) use ($id, $viewer, $liked, &$updated, &$newLike): void {
            foreach ($data['comments'] as &$comment) {
                if ($comment['id'] !== $id || !$this->isCommunityVisible($comment, $data['comments'])) {
                    continue;
                }
                $likes = $comment['communityLikes'] ?? [];
                $newLike = $liked && !in_array($viewer['id'], $likes, true);
                $likes = array_values(array_filter($likes, static fn (string $userId): bool => $userId !== $viewer['id']));
                if ($liked) {
                    $likes[] = $viewer['id'];
                }
                $comment['communityLikes'] = $likes;
                $updated = $comment;
                break;
            }
            unset($comment);
        });
        if ($updated === null) {
            return $this->error('Beitrag nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        if ($newLike) {
            $this->notifyCommunityInteraction($updated, $viewer, 'like', $id . ':' . $viewer['id']);
        }
        return new JsonResponse(['likeCount' => count($updated['communityLikes']), 'viewerLiked' => $liked]);
    }

    #[Route('/api/community/posts/{id}/replies', methods: ['GET', 'POST'])]
    public function communityReplies(string $id, Request $request): JsonResponse
    {
        if ($request->isMethod('POST') && ($response = $this->communityWriteGuard($request))) {
            return $response;
        }
        $viewer = $this->users->currentUser();
        $comments = $this->storage->read()['comments'];
        $parent = $this->findComment($id);
        if ($parent === null || ($parent['kind'] ?? null) === 'community_reply' || !$this->isCommunityVisible($parent, $comments)) {
            return $this->error('Beitrag nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        if (in_array($parent['kind'] ?? null, ['repair_request', 'repair_answer'], true)) {
            return $this->error('Antworten auf Reparaturanfragen gehören direkt in die Reparaturanfrage. Bitte öffne „Zur Reparaturanfrage“.', Response::HTTP_CONFLICT);
        }
        if ($request->isMethod('GET')) {
            $replies = array_values(array_filter($comments, fn (array $reply): bool =>
                ($reply['kind'] ?? null) === 'community_reply' && ($reply['parentId'] ?? null) === $id
                && $this->isCommunityVisible($reply, $comments)));
            usort($replies, static fn (array $a, array $b): int => strcmp($a['createdAt'], $b['createdAt']));
            $response = new JsonResponse(['replies' => array_map(fn (array $reply): array => $this->communityReplyPublic($reply, $viewer), $replies)]);
            $response->headers->set('Cache-Control', 'private, no-store');
            return $response;
        }
        $body = $this->jsonPayload($request)['body'] ?? null;
        if (!is_string($body) || $this->length(trim($body)) < 1 || $this->length(trim($body)) > 4000) {
            return $this->error('Bitte einen Kommentar mit 1 bis 4.000 Zeichen schreiben.', Response::HTTP_BAD_REQUEST);
        }
        if (!$this->storage->allowRate('community-reply', $viewer['id'], 30, 600)) {
            return $this->error('Zu viele Kommentare. Bitte versuche es später erneut.', Response::HTTP_TOO_MANY_REQUESTS);
        }
        $now = (new \DateTimeImmutable())->format(DATE_ATOM);
        $reply = [
            'id' => bin2hex(random_bytes(16)), 'guide' => self::COMMUNITY_EXPERIENCE_GUIDE,
            'kind' => 'community_reply', 'parentId' => $id, 'userId' => $viewer['id'],
            'name' => $viewer['name'], 'email' => $viewer['email'], 'body' => trim($body),
            'topic' => null, 'section' => $parent['section'] ?? null, 'source' => null,
            'status' => 'approved', 'createdAt' => $now, 'approvedAt' => $now,
            'imageFile' => null, 'imageMime' => null,
        ];
        $reply['mentions'] = $this->commentMentions($reply);
        $saved = false;
        $this->storage->update(function (array &$data) use ($id, $reply, &$saved): void {
            foreach ($data['comments'] as $candidate) {
                if ($candidate['id'] === $id && $this->isCommunityVisible($candidate, $data['comments'])) {
                    $data['comments'][] = $reply;
                    $saved = true;
                    break;
                }
            }
        });
        if (!$saved) {
            return $this->error('Der Beitrag ist nicht mehr verfügbar.', Response::HTTP_NOT_FOUND);
        }
        $this->notifyCommunityInteraction($parent, $viewer, 'reply', $reply['id']);
        $this->notifyPublishedMentions($reply);
        return new JsonResponse(['reply' => $this->communityReplyPublic($reply, $viewer)], Response::HTTP_CREATED);
    }

    #[Route('/api/community/posts/{id}/report', methods: ['POST'])]
    public function reportCommunityPost(string $id, Request $request): JsonResponse
    {
        if ($response = $this->communityWriteGuard($request)) {
            return $response;
        }
        $viewer = $this->users->currentUser();
        $reason = $this->jsonPayload($request)['reason'] ?? null;
        if (!is_string($reason) || $this->length(trim($reason)) < 3 || $this->length(trim($reason)) > 1000) {
            return $this->error('Bitte begründe deine Meldung mit 3 bis 1.000 Zeichen.', Response::HTTP_BAD_REQUEST);
        }
        if (!$this->storage->allowRate('community-report', $viewer['id'], 10, 3600)) {
            return $this->error('Zu viele Meldungen. Bitte versuche es später erneut.', Response::HTTP_TOO_MANY_REQUESTS);
        }
        $found = false;
        $this->storage->update(function (array &$data) use ($id, $viewer, $reason, &$found): void {
            foreach ($data['comments'] as &$comment) {
                if ($comment['id'] !== $id || !$this->isCommunityVisible($comment, $data['comments'])) {
                    continue;
                }
                $found = true;
                $reports = $comment['communityReports'] ?? [];
                if (!in_array($viewer['id'], array_column($reports, 'userId'), true)) {
                    $reports[] = ['userId' => $viewer['id'], 'reason' => trim($reason), 'createdAt' => (new \DateTimeImmutable())->format(DATE_ATOM)];
                }
                $comment['communityReports'] = $reports;
                break;
            }
            unset($comment);
        });
        return $found
            ? new JsonResponse(['message' => 'Danke. Das Team prüft deine Meldung.', 'viewerReported' => true])
            : $this->error('Beitrag nicht gefunden.', Response::HTTP_NOT_FOUND);
    }

    #[Route('/api/admin/community-reports', methods: ['GET'])]
    public function communityReports(Request $request): JsonResponse
    {
        $reviewer = $this->moderationReviewer($request);
        if ($reviewer === null) {
            return $this->unauthorized();
        }
        $reports = [];
        $comments = $this->storage->read()['comments'];
        foreach ($comments as $comment) {
            if (!empty($comment['communityReports'])) {
                $reports[] = $this->adminComment($comment) + [
                    'canModerate' => !$this->isOwnModeratorContent($comment, $reviewer),
                    'canDelete' => !$this->isOwnModeratorContent($comment, $reviewer) && !$this->hasOwnReportedReply($comment['id'], $comments, $reviewer),
                    'reports' => array_map(
                    static fn (array $report): array => ['reason' => $report['reason'], 'createdAt' => $report['createdAt']],
                    $comment['communityReports'],
                )];
            }
        }
        $response = new JsonResponse(['posts' => $reports]);
        $response->headers->set('Cache-Control', 'private, no-store');
        return $response;
    }

    #[Route('/api/admin/community-reports/{id}', methods: ['POST', 'DELETE'])]
    public function resolveCommunityReport(string $id, Request $request): JsonResponse
    {
        $reviewer = $this->moderationReviewer($request);
        if ($reviewer === null) {
            return $this->unauthorized();
        }
        if (!$this->validModeratorCsrfToken($request)) {
            return $this->error('Ungültige Sitzung.', Response::HTTP_FORBIDDEN);
        }
        if ($request->isMethod('POST') && ($this->jsonPayload($request)['action'] ?? null) !== 'keep') {
            return $this->error('Ungültige Aktion.', Response::HTTP_BAD_REQUEST);
        }
        $delete = $request->isMethod('DELETE');
        $payload = $this->jsonPayload($request);
        if ($delete && array_key_exists('edits', $payload)) {
            return $this->error('Textänderungen können nur beim Behalten übernommen werden.', Response::HTTP_BAD_REQUEST);
        }
        $resolved = false;
        $images = [];
        $selfReview = false;
        $editError = null;
        $editedComment = null;
        $this->storage->update(function (array &$data) use ($id, $delete, $payload, $reviewer, &$editedComment, &$editError, &$selfReview, &$resolved, &$images): void {
            foreach ($data['comments'] as &$comment) {
                if ($comment['id'] === $id && !empty($comment['communityReports'])) {
                    if ($this->isOwnModeratorContent($comment, $reviewer) || ($delete && $this->hasOwnReportedReply($id, $data['comments'], $reviewer))) {
                        $selfReview = true;
                        return;
                    }
                    if (!$delete) {
                        $previousVersion = $this->reviewVersion($comment);
                        $editError = $this->applyReviewEdits($comment, $payload, $reviewer);
                        if ($editError !== null) return;
                        if ($previousVersion !== $this->reviewVersion($comment)) $editedComment = $comment;
                    }
                    $resolved = true;
                    if (!$delete) {
                        $comment['communityReports'] = [];
                    }
                    break;
                }
            }
            unset($comment);
            if (!$resolved || !$delete) {
                return;
            }
            $data['comments'] = array_values(array_filter($data['comments'], static function (array $comment) use ($id, &$images): bool {
                if ($comment['id'] === $id || (($comment['kind'] ?? null) === 'community_reply' && ($comment['parentId'] ?? null) === $id)) {
                    $images[] = $comment['imageFile'] ?? null;
                    return false;
                }
                return true;
            }));
            foreach ($data['comments'] as &$comment) {
                if (($comment['solutionAnswerId'] ?? null) === $id) {
                    $comment['solutionAnswerId'] = null;
                }
            }
            unset($comment);
        });
        if ($editError !== null) return $editError;
        if ($selfReview) {
            return $this->error('Eigene Beiträge oder mitbetroffene eigene gemeldete Kommentare müssen von einem anderen Moderator oder Admin geprüft werden.', Response::HTTP_FORBIDDEN);
        }
        if (!$resolved) {
            return $this->error('Diese Meldung wurde bereits bearbeitet.', Response::HTTP_NOT_FOUND);
        }
        foreach ($images as $filename) {
            $this->storage->deleteImage($filename);
        }
        if ($editedComment !== null && ($editedComment['status'] ?? null) === 'approved') $this->notifyPublishedMentions($editedComment);
        return new JsonResponse(['message' => $delete ? 'Beitrag und zugehörige Community-Kommentare gelöscht.' : 'Meldung erledigt. Der Beitrag bleibt sichtbar.']);
    }

    private function notifyCommunityInteraction(array $post, array $actor, string $type, string $eventId): void
    {
        try {
            $rootId = ($post['kind'] ?? null) === 'community_reply' ? $post['parentId'] : $post['id'];
            $this->users->notifyCommunityInteraction((string) $post['userId'], $actor, $type, $eventId, $rootId);
        } catch (\Throwable $exception) {
            error_log('[community-interaction] ' . $exception->getMessage());
        }
    }
}
