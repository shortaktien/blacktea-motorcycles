<?php

namespace App\Controller;

use App\Service\CommunityStorage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\UploadedFile;
use Symfony\Component\Routing\Attribute\Route;

final class CommunityController
{
    private const REPAIR_REQUEST_GUIDE = 'hilfe-anfragen';
    private const MAX_IMAGE_BYTES = 1048576;
    private const ALLOWED_IMAGES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    public function __construct(private readonly CommunityStorage $storage)
    {
    }

    #[Route('/api/feedback/{guide}', name: 'api_feedback_read', methods: ['GET'])]
    public function readFeedback(string $guide): JsonResponse
    {
        if (!$this->validGuide($guide)) {
            return $this->error('Ungültiger Beitrag.', Response::HTTP_BAD_REQUEST);
        }

        $data = $this->storage->read();
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
            'comments' => array_map(fn (array $comment): array => $this->publicComment($comment), $comments),
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

        if (!is_string($guide) || !$this->validGuide($guide)) {
            return $this->error('Ungültiger Beitrag.', Response::HTTP_BAD_REQUEST);
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
        if (in_array($kind, ['wiki_suggestion', 'repair_request'], true) && (!is_string($topic) || $this->length(trim($topic)) < 2 || $this->length(trim($topic)) > 120)) {
            return $this->error('Bitte einen kurzen Titel mit 2 bis 120 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
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

            $imageMime = $image->getMimeType();
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
            'email' => strtolower(trim($email)),
            'body' => trim($body),
            'topic' => in_array($kind, ['wiki_suggestion', 'repair_request'], true) ? trim((string) $topic) : null,
            'section' => is_string($section) && trim($section) !== '' ? trim($section) : null,
            'source' => is_string($source) && trim($source) !== '' ? trim($source) : null,
            'parentId' => $kind === 'repair_answer' ? trim((string) $parentId) : null,
            'imageFile' => $imageFilename,
            'imageMime' => $imageMime,
            'status' => 'pending',
            'createdAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
            'approvedAt' => null,
        ];

        try {
            $this->storage->update(static function (array &$data) use ($comment): void {
                $data['comments'][] = $comment;
            });
        } catch (\Throwable) {
            $this->storage->deleteImage($imageFilename);
            return $this->error('Der Kommentar konnte nicht gespeichert werden.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse([
            'message' => match ($kind) {
                'wiki_suggestion' => 'Danke! Dein Wiki-Vorschlag wird vor der Veröffentlichung redaktionell geprüft.',
                'repair_request' => 'Danke! Deine Reparaturanfrage wird vor der Veröffentlichung redaktionell geprüft.',
                'repair_answer' => 'Danke! Deine Antwort wird vor der Veröffentlichung redaktionell geprüft.',
                default => 'Danke! Dein Kommentar wird vor der Veröffentlichung redaktionell geprüft.',
            },
        ], Response::HTTP_ACCEPTED);
    }

    #[Route('/api/comments/{id}/image', name: 'api_comment_image', methods: ['GET'])]
    public function commentImage(string $id): Response
    {
        $comment = $this->findComment($id);
        if ($comment === null) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        if (($comment['status'] ?? null) !== 'approved' && !$this->isAdminAuthenticated()) {
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

        $this->startAdminSession();
        session_regenerate_id(true);
        $_SESSION['admin_email'] = strtolower(trim($email));
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        return new JsonResponse(['authenticated' => true, 'email' => $_SESSION['admin_email'], 'csrfToken' => $_SESSION['csrf_token']]);
    }

    #[Route('/api/admin/session', name: 'api_admin_session', methods: ['GET'])]
    public function session(): JsonResponse
    {
        $authenticated = $this->isAdminAuthenticated();
        $response = new JsonResponse([
            'authenticated' => $authenticated,
            'email' => $authenticated ? ($_SESSION['admin_email'] ?? null) : null,
            'csrfToken' => $authenticated ? $this->csrfToken() : null,
        ]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/admin/comments', name: 'api_admin_comments', methods: ['GET'])]
    public function adminComments(): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }

        $comments = $this->storage->read()['comments'];
        usort($comments, static fn (array $a, array $b): int => strcmp((string) ($b['createdAt'] ?? ''), (string) ($a['createdAt'] ?? '')));
        $response = new JsonResponse(['comments' => array_map(fn (array $comment): array => $this->adminComment($comment), $comments)]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/admin/comments/{id}', name: 'api_admin_comment_update', methods: ['PATCH'])]
    public function updateComment(string $id, Request $request): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }
        if (!$this->validCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $payload = $this->jsonPayload($request);
        $status = $payload['status'] ?? null;
        if (!in_array($status, ['pending', 'approved'], true)) {
            return $this->error('Ungültiger Veröffentlichungsstatus.', Response::HTTP_BAD_REQUEST);
        }

        $updated = null;
        $this->storage->update(static function (array &$data) use ($id, $status, &$updated): void {
            foreach ($data['comments'] as &$comment) {
                if (($comment['id'] ?? null) === $id) {
                    $comment['status'] = $status;
                    $comment['approvedAt'] = $status === 'approved' ? (new \DateTimeImmutable())->format(DATE_ATOM) : null;
                    $updated = $comment;
                    break;
                }
            }
            unset($comment);
        });

        if (!is_array($updated)) {
            return $this->error('Kommentar nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse(['comment' => $this->adminComment($updated)]);
    }

    #[Route('/api/admin/comments/{id}', name: 'api_admin_comment_delete', methods: ['DELETE'])]
    public function deleteComment(string $id, Request $request): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }
        if (!$this->validCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $deleted = null;
        $this->storage->update(static function (array &$data) use ($id, &$deleted): void {
            $remaining = [];
            foreach ($data['comments'] as $comment) {
                if (($comment['id'] ?? null) === $id) {
                    $deleted = $comment;
                    continue;
                }
                $remaining[] = $comment;
            }
            $data['comments'] = $remaining;
        });

        if (!is_array($deleted)) {
            return $this->error('Kommentar nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $this->storage->deleteImage($deleted['imageFile'] ?? null);

        return new JsonResponse(['deleted' => true]);
    }

    #[Route('/api/admin/logout', name: 'api_admin_logout', methods: ['POST'])]
    public function logout(Request $request): JsonResponse
    {
        if (!$this->isAdminAuthenticated()) {
            return $this->unauthorized();
        }
        if (!$this->validCsrfToken($request)) {
            return $this->error('Ungültige Admin-Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $_SESSION = [];
        session_destroy();
        return new JsonResponse(['authenticated' => false]);
    }

    private function validGuide(string $guide): bool
    {
        return preg_match('/^(hilfe|ersatzteil|wiki)-[a-z0-9-]{1,90}$/', $guide) === 1;
    }

    /** @return list<string> */
    private function expectedKinds(string $guide): array
    {
        if ($guide === self::REPAIR_REQUEST_GUIDE) {
            return ['repair_request', 'repair_answer'];
        }

        return [$this->isWikiGuide($guide) ? 'wiki_suggestion' : 'comment'];
    }

    private function isWikiGuide(string $guide): bool
    {
        return str_starts_with($guide, 'wiki-');
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

    private function publicComment(array $comment): array
    {
        return [
            'id' => (string) $comment['id'],
            'kind' => (string) ($comment['kind'] ?? 'comment'),
            'name' => (string) $comment['name'],
            'body' => (string) $comment['body'],
            'topic' => isset($comment['topic']) && is_string($comment['topic']) ? $comment['topic'] : null,
            'section' => isset($comment['section']) && is_string($comment['section']) ? $comment['section'] : null,
            'source' => isset($comment['source']) && is_string($comment['source']) ? $comment['source'] : null,
            'parentId' => isset($comment['parentId']) && is_string($comment['parentId']) ? $comment['parentId'] : null,
            'createdAt' => (string) $comment['createdAt'],
            'imageUrl' => !empty($comment['imageFile']) ? '/api/comments/' . rawurlencode((string) $comment['id']) . '/image' : null,
        ];
    }

    private function adminComment(array $comment): array
    {
        return $this->publicComment($comment) + [
            'guide' => (string) $comment['guide'],
            'email' => (string) $comment['email'],
            'status' => (string) $comment['status'],
            'approvedAt' => $comment['approvedAt'] ?? null,
        ];
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
        $this->startAdminSession();
        return isset($_SESSION['admin_email']) && is_string($_SESSION['admin_email']) && $_SESSION['admin_email'] !== '';
    }

    private function length(string $value): int
    {
        return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
    }
}
