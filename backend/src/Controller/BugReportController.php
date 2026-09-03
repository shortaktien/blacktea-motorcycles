<?php

namespace App\Controller;

use App\Service\CommunityStorage;
use App\Service\GitHubIssueService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class BugReportController
{
    public function __construct(
        private readonly CommunityStorage $storage,
        private readonly GitHubIssueService $github,
    ) {
    }

    #[Route('/api/bug-reports', name: 'api_bug_report_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $payload = $this->jsonPayload($request);
        $honeypot = $payload['website'] ?? '';
        if (is_string($honeypot) && trim($honeypot) !== '') {
            return $this->error('Die Bugmeldung konnte nicht angenommen werden.', Response::HTTP_BAD_REQUEST);
        }

        $title = $payload['title'] ?? null;
        $name = $payload['name'] ?? null;
        $email = $payload['email'] ?? null;
        $description = $payload['description'] ?? null;
        $pageUrl = $payload['pageUrl'] ?? null;

        if (!is_string($title) || $this->length($title) < 2 || $this->length($title) > 160) {
            return $this->error('Bitte eine Überschrift mit 2 bis 160 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($name) || $this->length($name) < 2 || $this->length($name) > 80) {
            return $this->error('Bitte einen Namen mit 2 bis 80 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false || $this->length($email) > 180) {
            return $this->error('Bitte eine gültige E-Mail-Adresse angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($description) || $this->length($description) < 10 || $this->length($description) > 8000) {
            return $this->error('Bitte die Fehlerbeschreibung mit 10 bis 8.000 Zeichen ausfüllen.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($pageUrl) || !$this->validPageUrl($pageUrl)) {
            return $this->error('Die Fundstelle der Meldung konnte nicht erkannt werden.', Response::HTTP_BAD_REQUEST);
        }

        $identity = ($request->getClientIp() ?? 'unknown') . '|' . strtolower(trim($email));
        if (!$this->storage->allowRate('bug_report', $identity, 3, 3600)) {
            $response = $this->error('Zu viele Bugmeldungen. Bitte später erneut versuchen.', Response::HTTP_TOO_MANY_REQUESTS);
            $response->headers->set('Retry-After', '3600');
            return $response;
        }

        try {
            $issue = $this->github->createBugIssue(trim($title), trim($description), trim($pageUrl), trim($name));
        } catch (\Throwable $exception) {
            error_log('[bug-report] ' . $exception->getMessage());
            return $this->error('Die Bugmeldung konnte gerade nicht an GitHub übergeben werden. Bitte später erneut versuchen.', Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return new JsonResponse([
            'message' => 'Danke! Der Fehler wurde als GitHub-Issue erfasst.',
            'issueUrl' => $issue['url'],
        ], Response::HTTP_CREATED);
    }

    /** @return array<string, mixed> */
    private function jsonPayload(Request $request): array
    {
        try {
            $payload = $request->toArray();
        } catch (\Throwable) {
            return [];
        }

        return is_array($payload) ? $payload : [];
    }

    private function validPageUrl(string $value): bool
    {
        if ($this->length($value) > 2048 || filter_var($value, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $parts = parse_url($value);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        if (!in_array($scheme, ['http', 'https'], true) || $host === '') {
            return false;
        }

        $configuredHosts = $_ENV['BUG_REPORT_ALLOWED_HOSTS'] ?? $_SERVER['BUG_REPORT_ALLOWED_HOSTS'] ?? getenv('BUG_REPORT_ALLOWED_HOSTS');
        $allowedHosts = is_string($configuredHosts) && trim($configuredHosts) !== ''
            ? array_filter(array_map(static fn (string $item): string => strtolower(trim($item)), explode(',', $configuredHosts)))
            : ['btm.shortaktien.de', '127.0.0.1', 'localhost'];

        return in_array($host, $allowedHosts, true);
    }

    private function length(string $value): int
    {
        return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => $message], $status);
    }
}
