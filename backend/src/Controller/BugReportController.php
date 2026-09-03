<?php

namespace App\Controller;

use App\Service\CommunityStorage;
use App\Service\EmailConfirmationService;
use App\Service\GitHubIssueService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class BugReportController
{
    public function __construct(
        private readonly CommunityStorage $storage,
        private readonly EmailConfirmationService $emailConfirmation,
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

        $normalizedEmail = strtolower(trim($email));
        if ($response = $this->confirmationRateLimited($request, $normalizedEmail)) {
            return $response;
        }

        $confirmation = $this->emailConfirmation->createToken('/api/bug-reports/confirm/');
        $bugReport = [
            'id' => bin2hex(random_bytes(16)),
            'title' => trim($title),
            'name' => trim($name),
            'email' => $normalizedEmail,
            'description' => trim($description),
            'pageUrl' => trim($pageUrl),
            'status' => 'awaiting_confirmation',
            'createdAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
            'emailConfirmedAt' => null,
            'emailConfirmationTokenHash' => $confirmation['tokenHash'],
            'emailConfirmationExpiresAt' => $confirmation['expiresAt'],
            'issueUrl' => null,
        ];

        try {
            $this->storage->update(static function (array &$data) use ($bugReport): void {
                $data['bugReports'][] = $bugReport;
            });
            $this->emailConfirmation->send($normalizedEmail, trim($name), $confirmation['url'], 'Bugmeldung: ' . trim($title));
        } catch (\Throwable $exception) {
            $this->removeBugReport($bugReport['id']);
            error_log('[bug-report] ' . $exception->getMessage());
            return $this->error('Die Bestätigungs-E-Mail konnte gerade nicht versendet werden. Bitte später erneut versuchen.', Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return new JsonResponse([
            'message' => 'Fast geschafft! Bestätige jetzt deine E-Mail-Adresse. Erst danach wird die Bugmeldung als GitHub-Issue angelegt.',
        ], Response::HTTP_ACCEPTED);
    }

    #[Route('/api/bug-reports/confirm/{token}', name: 'api_bug_report_confirm', methods: ['GET'])]
    public function confirmEmail(string $token, Request $request): Response
    {
        if (preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
            return $this->confirmationPage('Bestätigungslink ungültig', 'Dieser Bestätigungslink ist nicht gültig.', '/hilfe/anfragen', Response::HTTP_BAD_REQUEST);
        }
        if (!$this->storage->allowRate('bug-confirmation-click', $request->getClientIp() ?? 'unknown', 30, 900)) {
            $response = $this->confirmationPage('Zu viele Versuche', 'Bitte versuche es in einigen Minuten erneut.', '/hilfe/anfragen', Response::HTTP_TOO_MANY_REQUESTS);
            $response->headers->set('Retry-After', '900');
            return $response;
        }

        $tokenHash = hash('sha256', $token);
        $match = null;
        foreach ($this->storage->read()['bugReports'] as $bugReport) {
            $storedHash = $bugReport['emailConfirmationTokenHash'] ?? null;
            if (is_string($storedHash) && hash_equals($storedHash, $tokenHash)) {
                $match = $bugReport;
                break;
            }
        }

        if ($match === null) {
            return $this->confirmationPage('Link bereits verwendet', 'Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.', '/hilfe/anfragen', Response::HTTP_GONE);
        }
        if (!is_string($match['emailConfirmationExpiresAt'] ?? null) || $this->emailConfirmation->isExpired($match['emailConfirmationExpiresAt'])) {
            return $this->confirmationPage('Link abgelaufen', 'Dieser Bestätigungslink ist abgelaufen. Bitte sende die Bugmeldung erneut ab.', '/hilfe/anfragen', Response::HTTP_GONE);
        }
        if (($match['status'] ?? null) === 'processing') {
            return $this->confirmationPage('Bugmeldung wird verarbeitet', 'Deine E-Mail-Adresse ist bestätigt. Die Bugmeldung wird gerade an GitHub übergeben.', '/hilfe/anfragen', Response::HTTP_OK);
        }
        if (($match['status'] ?? null) === 'reported' && is_string($match['issueUrl'] ?? null)) {
            return $this->confirmationPage('Bugmeldung übermittelt', 'Die Bugmeldung wurde bereits als GitHub-Issue angelegt.', $match['issueUrl'], Response::HTTP_OK);
        }

        $claimed = false;
        $this->storage->update(static function (array &$data) use ($match, $tokenHash, &$claimed): void {
            foreach ($data['bugReports'] as &$bugReport) {
                if (($bugReport['id'] ?? null) === ($match['id'] ?? null)
                    && ($bugReport['emailConfirmationTokenHash'] ?? null) === $tokenHash
                    && in_array(($bugReport['status'] ?? null), ['awaiting_confirmation', 'confirmed'], true)
                ) {
                    $bugReport['status'] = 'processing';
                    $bugReport['emailConfirmedAt'] ??= (new \DateTimeImmutable())->format(DATE_ATOM);
                    $claimed = true;
                    break;
                }
            }
            unset($bugReport);
        });

        if (!$claimed) {
            return $this->confirmationPage('Bugmeldung wird verarbeitet', 'Deine E-Mail-Adresse ist bestätigt. Die Bugmeldung wird gerade verarbeitet.', '/hilfe/anfragen', Response::HTTP_OK);
        }

        try {
            $issue = $this->github->createBugIssue($match['title'], $match['description'], $match['pageUrl'], $match['name']);
            $this->storage->update(static function (array &$data) use ($match, $tokenHash, $issue): void {
                foreach ($data['bugReports'] as &$bugReport) {
                    if (($bugReport['id'] ?? null) === ($match['id'] ?? null) && ($bugReport['emailConfirmationTokenHash'] ?? null) === $tokenHash) {
                        $bugReport['status'] = 'reported';
                        $bugReport['issueUrl'] = $issue['url'];
                        unset($bugReport['emailConfirmationTokenHash'], $bugReport['emailConfirmationExpiresAt']);
                        break;
                    }
                }
                unset($bugReport);
            });
        } catch (\Throwable $exception) {
            $this->storage->update(static function (array &$data) use ($match, $tokenHash): void {
                foreach ($data['bugReports'] as &$bugReport) {
                    if (($bugReport['id'] ?? null) === ($match['id'] ?? null) && ($bugReport['emailConfirmationTokenHash'] ?? null) === $tokenHash) {
                        $bugReport['status'] = 'confirmed';
                        break;
                    }
                }
                unset($bugReport);
            });
            error_log('[bug-report] ' . $exception->getMessage());
            return $this->confirmationPage('Bugmeldung bestätigt', 'Deine E-Mail-Adresse ist bestätigt, aber GitHub konnte die Bugmeldung gerade nicht annehmen. Bitte versuche den Bestätigungslink später erneut.', '/hilfe/anfragen', Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return $this->confirmationPage('Bugmeldung übermittelt', 'Danke! Deine E-Mail-Adresse ist bestätigt und die Bugmeldung wurde als GitHub-Issue angelegt.', $issue['url'], Response::HTTP_OK);
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

    private function removeBugReport(string $id): void
    {
        $this->storage->update(static function (array &$data) use ($id): void {
            $data['bugReports'] = array_values(array_filter(
                $data['bugReports'],
                static fn (array $bugReport): bool => ($bugReport['id'] ?? null) !== $id,
            ));
        });
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
}
