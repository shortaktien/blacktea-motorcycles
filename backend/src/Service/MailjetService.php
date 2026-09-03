<?php

namespace App\Service;

use RuntimeException;

final class MailjetService
{
    private const API_URL = 'https://api.mailjet.com/v3.1/send';

    public function sendConfirmation(string $recipientEmail, string $recipientName, string $confirmationUrl, string $submissionLabel): void
    {
        $this->sendMessage(
            $recipientEmail,
            $recipientName,
            'Fast geschafft: E-Mail bei BTM-Hilfe bestätigen',
            'Bestätige deine E-Mail-Adresse, damit dein Beitrag geprüft werden kann.',
            'BTM-Hilfe · Beitrag bestätigen',
            'Fast geschafft.',
            'bestätige deine E-Mail-Adresse, damit wir deinen Beitrag (' . $submissionLabel . ') annehmen und redaktionell prüfen können.',
            'E-Mail bestätigen → Beitrag wird zur redaktionellen Prüfung vorgemerkt → erst danach kann er veröffentlicht oder weiterverarbeitet werden.',
            $confirmationUrl,
        );
    }

    public function sendAccountConfirmation(string $recipientEmail, string $recipientName, string $confirmationUrl): void
    {
        $this->sendMessage(
            $recipientEmail,
            $recipientName,
            'Willkommen bei BTM-Hilfe: Konto bestätigen',
            'Bestätige deine E-Mail-Adresse, um dein BTM-Hilfe-Konto zu aktivieren.',
            'BTM-Hilfe · Konto aktivieren',
            'Willkommen bei BTM-Hilfe.',
            'dein Konto ist fast startklar. Bestätige jetzt deine E-Mail-Adresse, damit wir wissen, dass du wirklich dahintersteckst.',
            'E-Mail bestätigen → einloggen → Modell, Kilometerstand und Benachrichtigungen einrichten.',
            $confirmationUrl,
        );
    }

    public function sendAdminRegistrationNotification(string $recipientName, string $recipientEmail, string $createdAt): void
    {
        $this->sendRegistrationNotification($this->adminEmail(), $recipientName, $recipientEmail, $createdAt);
    }

    public function sendRegistrationNotification(string $destinationEmail, string $recipientName, string $recipientEmail, string $createdAt): void
    {
        $this->sendMessage(
            $destinationEmail,
            'BTM-Redaktion',
            'BTM-Hilfe · Neue Registrierung',
            'Ein neues Konto wartet auf die E-Mail-Bestätigung.',
            'BTM-Hilfe · Neue Registrierung',
            'Neues Mitglied.',
            'Gerade wurde ein neues BTM-Hilfe-Konto angelegt. Die Person muss ihre E-Mail-Adresse noch bestätigen.',
            'Anzeigename: ' . $recipientName . "\nE-Mail: " . $recipientEmail . "\nRegistriert: " . $createdAt,
            $this->publicSiteUrl() . '/admin',
            'Der Admin-Bereich ist geschützt und erfordert deine Anmeldung.',
        );
    }

    public function sendAdminModerationNotification(string $submissionLabel, string $recipientName, string $recipientEmail, string $body, string $guide): void
    {
        $this->sendModerationNotification($this->adminEmail(), $submissionLabel, $recipientName, $recipientEmail, $body, $guide);
    }

    public function sendModerationNotification(string $destinationEmail, string $submissionLabel, string $recipientName, string $recipientEmail, string $body, string $guide): void
    {
        $this->sendMessage(
            $destinationEmail,
            'BTM-Redaktion',
            'BTM-Hilfe · Neuer Beitrag zur Prüfung',
            'Ein neuer Beitrag wartet im Admin-Bereich auf Moderation.',
            'BTM-Hilfe · Moderation',
            'Neuer Beitrag zur Prüfung.',
            'Ein neuer Community-Beitrag wurde bestätigt und wartet jetzt auf deine redaktionelle Prüfung.',
            'Typ: ' . $submissionLabel . "\nVon: " . $recipientName . "\nE-Mail: " . $recipientEmail . "\nZiel: " . $guide . "\n\nInhalt:\n" . $body,
            $this->publicSiteUrl() . '/admin',
            'Der Admin-Bereich ist geschützt und erfordert deine Anmeldung.',
        );
    }

    public function sendReplyNotification(string $recipientEmail, string $recipientName, string $requestTitle, string $answerName, string $requestPath): void
    {
        $baseUrl = rtrim($this->env('PUBLIC_SITE_URL'), '/');
        if ($baseUrl === '') {
            $baseUrl = 'https://btm.shortaktien.de';
        }
        $requestUrl = $baseUrl . '/' . ltrim($requestPath, '/');
        $this->sendMessage(
            $recipientEmail,
            $recipientName,
            'Neue Antwort auf deine BTM-Reparaturanfrage',
            'Jemand hat auf deine Reparaturanfrage geantwortet.',
            'BTM-Hilfe · Neue Antwort',
            'Da ist eine neue Antwort.',
            $answerName . ' hat einen Lösungsansatz zu „' . $requestTitle . '“ geteilt.',
            'Öffne die Anfrage → lies den Lösungsansatz → ergänze bei Bedarf weitere Details.',
            $requestUrl,
            'Melde dich an, um weitere Details zu sehen.',
        );
    }

    public function sendAdminMessage(string $recipientEmail, string $recipientName, string $subject, string $body): void
    {
        $baseUrl = $this->publicSiteUrl();
        $this->sendMessage(
            $recipientEmail,
            $recipientName,
            'BTM-Hilfe · ' . $subject,
            'Eine persönliche Nachricht vom BTM-Hilfe-Team.',
            'BTM-Hilfe · Nachricht',
            'Eine Nachricht für dich.',
            'Das BTM-Hilfe-Team hat dir eine persönliche Nachricht hinterlassen.',
            $body,
            $baseUrl . '/konto',
            'Melde dich an, um die Nachricht zu öffnen.',
        );
    }

    public function sendPasswordReset(string $recipientEmail, string $recipientName, string $token): void
    {
        $resetUrl = $this->publicSiteUrl() . '/passwort-zuruecksetzen?token=' . rawurlencode($token);
        $this->sendMessage(
            $recipientEmail,
            $recipientName,
            'BTM-Hilfe · Passwort zurücksetzen',
            'Setze dein Passwort für BTM-Hilfe zurück.',
            'BTM-Hilfe · Zugang',
            'Neues Passwort festlegen.',
            'Du hast eine Passwort-Zurücksetzung für dein BTM-Hilfe-Konto angefordert.',
            'Link öffnen → neues Passwort setzen → wieder einloggen. Der Link ist nur begrenzte Zeit gültig.',
            $resetUrl,
        );
    }

    public function sendWarning(string $recipientEmail, string $recipientName, string $reason, int $warningCount, bool $blocked): void
    {
        $title = $blocked ? 'Dein Konto ist gesperrt.' : 'Hinweis zu deinem Konto.';
        $intro = $blocked
            ? 'Dein BTM-Hilfe-Konto wurde nach drei Verwarnungen für neue Kommunikation gesperrt.'
            : 'Das BTM-Hilfe-Team hat eine Verwarnung zu deinem Konto hinterlegt.';
        $callout = 'Verwarnung ' . $warningCount . '/3: ' . $reason;
        if ($blocked) {
            $callout .= "\n\nNeue Kommentare, Reparaturanfragen, Antworten, Wiki-Vorschläge und Bugmeldungen sind ab sofort nicht mehr möglich.";
        }

        $this->sendMessage(
            $recipientEmail,
            $recipientName,
            'BTM-Hilfe · ' . ($blocked ? 'Kommunikation gesperrt' : 'Verwarnung'),
            $blocked ? 'Dein BTM-Hilfe-Konto ist für neue Kommunikation gesperrt.' : 'Es gibt einen Hinweis zu deinem BTM-Hilfe-Konto.',
            'BTM-Hilfe · Moderation',
            $title,
            $intro,
            $callout,
            $this->publicSiteUrl() . '/konto',
            'Melde dich an, um deinen Kontostatus zu prüfen.',
        );
    }

    /** @param list<array{email: string, name: string}> $recipients */
    public function sendNewsletter(array $recipients, string $subject, string $title, string $intro, string $body): int
    {
        if ($recipients === []) {
            return 0;
        }

        $sent = 0;
        $unsubscribeUrl = $this->publicSiteUrl() . '/konto';
        foreach (array_chunk($recipients, 50) as $batch) {
            $messages = [];
            foreach ($batch as $recipient) {
                $email = trim((string) ($recipient['email'] ?? ''));
                $name = trim((string) ($recipient['name'] ?? 'BTM-Community'));
                if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                    continue;
                }
                $messages[] = $this->newsletterMessage($email, $name, $subject, $title, $intro, $body, $unsubscribeUrl);
            }
            if ($messages === []) {
                continue;
            }

            $this->sendNewsletterBatch($messages);
            $sent += count($messages);
        }

        return $sent;
    }

    private function newsletterMessage(string $recipientEmail, string $recipientName, string $subject, string $title, string $intro, string $body, string $unsubscribeUrl): array
    {
        $fromEmail = trim($this->env('MAILJET_FROM_EMAIL'));
        $fromName = trim($this->env('MAILJET_FROM_NAME'));
        if (filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false || $fromName === '') {
            throw new RuntimeException('Mailjet ist nicht vollständig konfiguriert.');
        }

        $safeName = $this->escape($recipientName);
        $safeTitle = $this->escape($title);
        $safeIntro = $this->escape($intro);
        $safeBody = nl2br($this->escape($body), false);
        $safeUrl = $this->escape($this->publicSiteUrl());
        $safeUnsubscribeUrl = $this->escape($unsubscribeUrl);

        return [
            'From' => ['Email' => $fromEmail, 'Name' => $fromName],
            'To' => [['Email' => $recipientEmail, 'Name' => $recipientName]],
            'Subject' => $subject,
            'TextPart' => implode("\n\n", [
                'Hallo ' . $recipientName . ',',
                $intro,
                $body,
                'Mehr erfahren: ' . $this->publicSiteUrl(),
                'Newsletter abbestellen: ' . $unsubscribeUrl,
            ]),
            'HTMLPart' => '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $safeTitle . '</title><style>@media only screen and (max-width:640px){.newsletter-shell{width:100%!important}.newsletter-pad{padding:26px 22px!important}.newsletter-title{font-size:30px!important}}</style></head><body style="margin:0;padding:0;background:#f0efeb;color:#292731;font-family:Arial,Helvetica,sans-serif;line-height:1.55"><span style="display:none!important;max-height:0;overflow:hidden;opacity:0;color:transparent">' . $safeIntro . '</span><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#f0efeb"><tr><td align="center" style="padding:24px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" class="newsletter-shell" style="width:100%;max-width:640px;background:#fbfaf7;border:2px solid #2d27c7;border-radius:16px;overflow:hidden"><tr><td style="padding:18px 24px;background:#292731;color:#fbfaf7;font-size:18px;font-weight:700">black tea motorbikes – <span style="color:#7771ff">hilfe</span></td></tr><tr><td class="newsletter-pad" style="padding:38px 42px 34px"><p style="margin:0 0 12px;color:#2d27c7;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">BTM-Hilfe · Newsletter</p><h1 class="newsletter-title" style="margin:0 0 18px;color:#292731;font-size:36px;line-height:1.08;letter-spacing:-.04em">' . $safeTitle . '</h1><p style="margin:0 0 18px;font-size:17px">Hallo ' . $safeName . ',</p><p style="margin:0 0 22px;font-size:16px;color:#5f5d6a">' . $safeIntro . '</p><div style="margin:0 0 26px;padding:16px 18px;border-left:4px solid #2d27c7;border-radius:8px;background:#ecebfa;color:#454350;font-size:14px">' . $safeBody . '</div><p style="margin:0"><a href="' . $safeUrl . '" style="display:inline-block;padding:15px 22px;background:#2d27c7;border:2px solid #29219b;border-radius:9px;color:#fff;text-decoration:none;font-size:16px;font-weight:800;box-shadow:0 4px 0 #29219b">Zu BTM-Hilfe&nbsp; ↗</a></p></td></tr><tr><td style="padding:20px 42px 24px;border-top:1px solid #dedce8;color:#777582;font-size:12px;line-height:1.5"><p style="margin:0 0 9px">Du möchtest keine Newsletter mehr? <a href="' . $safeUnsubscribeUrl . '" style="color:#2d27c7;font-weight:800">Im Konto abbestellen ↗</a></p><p style="margin:0;color:#2d27c7;font-weight:800">BTM-Hilfe · gebaut für die Leute, die weiterfahren wollen.</p></td></tr></table></td></tr></table></body></html>',
        ];
    }

    private function sendNewsletterBatch(array $messages): void
    {
        $apiKey = trim($this->env('MAILJET_API_KEY'));
        $apiSecret = trim($this->env('MAILJET_API_SECRET'));
        if ($apiKey === '' || $apiSecret === '') {
            throw new RuntimeException('Mailjet ist nicht vollständig konfiguriert.');
        }

        $payload = json_encode(['Messages' => $messages], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            throw new RuntimeException('Mailjet-Anfrage konnte nicht vorbereitet werden.');
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", [
                    'Accept: application/json',
                    'Authorization: Basic ' . base64_encode($apiKey . ':' . $apiSecret),
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen($payload),
                ]),
                'content' => $payload,
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);

        $response = @file_get_contents(self::API_URL, false, $context);
        $status = $this->responseStatus($http_response_header ?? []);
        if ($response === false || $status < 200 || $status >= 300) {
            throw new RuntimeException('Mailjet hat den Newsletter-Versand abgelehnt (HTTP ' . $status . ').');
        }

        $decoded = json_decode($response, true);
        $results = is_array($decoded) ? ($decoded['Messages'] ?? null) : null;
        if (!is_array($results) || count($results) !== count($messages) || count(array_filter($results, static fn ($message): bool => is_array($message) && ($message['Status'] ?? null) === 'success')) !== count($messages)) {
            throw new RuntimeException('Mailjet hat den Newsletter-Versand nicht vollständig bestätigt.');
        }
    }

    private function sendMessage(string $recipientEmail, string $recipientName, string $subject, string $preheader, string $eyebrow, string $title, string $intro, string $callout, string $actionUrl, string $linkNote = 'Der Link ist nur begrenzte Zeit gültig und kann nur einmal verwendet werden.'): void
    {
        $apiKey = trim($this->env('MAILJET_API_KEY'));
        $apiSecret = trim($this->env('MAILJET_API_SECRET'));
        $fromEmail = trim($this->env('MAILJET_FROM_EMAIL'));
        $fromName = trim($this->env('MAILJET_FROM_NAME'));

        if ($apiKey === '' || $apiSecret === '' || $fromEmail === '' || $fromName === '') {
            throw new RuntimeException('Mailjet ist nicht vollständig konfiguriert.');
        }
        if (filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false || filter_var($recipientEmail, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException('Die Mailjet-Adresse ist ungültig konfiguriert.');
        }

        $safeName = $this->escape($recipientName);
        $safeEyebrow = $this->escape($eyebrow);
        $safeTitle = $this->escape($title);
        $safeIntro = $this->escape($intro);
        $safeCallout = nl2br($this->escape($callout), false);
        $safeUrl = $this->escape($actionUrl);
        $safePreheader = $this->escape($preheader);
        $safeLinkNote = $this->escape($linkNote);
        $payload = json_encode([
            'Messages' => [[
                'From' => ['Email' => $fromEmail, 'Name' => $fromName],
                'To' => [['Email' => $recipientEmail, 'Name' => $recipientName]],
                'Subject' => $subject,
                'TextPart' => implode("\n\n", [
                    'Hallo ' . $recipientName . ',',
                    $intro,
                    $callout,
                    'Link: ' . $actionUrl,
                    $linkNote,
                    'Wenn du diese E-Mail nicht erwartet hast, kannst du sie ignorieren.',
                ]),
                'HTMLPart' => '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BTM-Hilfe</title><style>@media only screen and (max-width:640px){.email-shell{width:100%!important}.email-pad{padding:26px 22px!important}.email-title{font-size:30px!important}.email-brand{font-size:16px!important}}</style></head><body style="margin:0;padding:0;background:#f0efeb;color:#292731;font-family:Arial,Helvetica,sans-serif;line-height:1.55"><span style="display:none!important;max-height:0;overflow:hidden;opacity:0;color:transparent">' . $safePreheader . '</span><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#f0efeb"><tr><td align="center" style="padding:24px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" class="email-shell" style="width:100%;max-width:640px;background:#fbfaf7;border:2px solid #2d27c7;border-radius:16px;overflow:hidden"><tr><td style="padding:18px 24px;background:#292731;color:#fbfaf7"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="width:38px;height:38px;background:#f4ef3b;border:2px solid #2d27c7;border-radius:50%;color:#292731;text-align:center;font-size:11px;font-weight:800;line-height:38px">BTM</td><td class="email-brand" style="padding-left:12px;font-size:18px;font-weight:700;letter-spacing:-.02em">black tea motorbikes – <span style="color:#7771ff">hilfe</span></td></tr></table></td></tr><tr><td class="email-pad" style="padding:38px 42px 34px"><p style="margin:0 0 12px;color:#2d27c7;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">' . $safeEyebrow . '</p><h1 class="email-title" style="margin:0 0 18px;color:#292731;font-size:36px;line-height:1.08;letter-spacing:-.04em">' . $safeTitle . '</h1><p style="margin:0 0 18px;font-size:17px">Hallo ' . $safeName . ',</p><p style="margin:0 0 22px;font-size:16px;color:#5f5d6a">' . $safeIntro . '</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin:0 0 26px;background:#ecebfa;border-left:4px solid #2d27c7;border-radius:8px"><tr><td style="padding:16px 18px"><p style="margin:0 0 8px;color:#2d27c7;font-weight:800;font-size:14px">So geht es weiter</p><p style="margin:0;color:#454350;font-size:14px">' . $safeCallout . '</p></td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center"><a href="' . $safeUrl . '" style="display:inline-block;padding:15px 22px;background:#2d27c7;border:2px solid #29219b;border-radius:9px;color:#fff;text-decoration:none;font-size:16px;font-weight:800;box-shadow:0 4px 0 #29219b">Weiter zu BTM-Hilfe&nbsp; ↗</a></td></tr></table><p style="margin:28px 0 0;color:#777582;font-size:12px;line-height:1.5">Falls der Button nicht funktioniert, kannst du diesen Link direkt öffnen:<br><a href="' . $safeUrl . '" style="color:#2d27c7;word-break:break-all">' . $safeUrl . '</a></p></td></tr><tr><td style="padding:20px 42px 24px;border-top:1px solid #dedce8;color:#777582;font-size:12px"><p style="margin:0 0 8px">' . $safeLinkNote . '</p><p style="margin:0">Wenn du diese E-Mail nicht erwartet hast, kannst du sie ignorieren.</p><p style="margin:16px 0 0;color:#2d27c7;font-weight:800">BTM-Hilfe · gebaut für die Leute, die weiterfahren wollen.</p></td></tr></table></td></tr></table></body></html>',
            ]],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            throw new RuntimeException('Mailjet-Anfrage konnte nicht vorbereitet werden.');
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", [
                    'Accept: application/json',
                    'Authorization: Basic ' . base64_encode($apiKey . ':' . $apiSecret),
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen($payload),
                ]),
                'content' => $payload,
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);

        $response = @file_get_contents(self::API_URL, false, $context);
        $status = $this->responseStatus($http_response_header ?? []);
        if ($response === false || $status < 200 || $status >= 300) {
            throw new RuntimeException('Mailjet hat den Versand abgelehnt (HTTP ' . $status . ').');
        }

        $decoded = json_decode($response, true);
        $messages = is_array($decoded) ? ($decoded['Messages'] ?? null) : null;
        if (!is_array($messages) || ($messages[0]['Status'] ?? null) !== 'success') {
            throw new RuntimeException('Mailjet hat den Versand nicht bestätigt.');
        }
    }

    private function responseStatus(array $headers): int
    {
        foreach ($headers as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})\b/', (string) $header, $matches) === 1) {
                return (int) $matches[1];
            }
        }

        return 0;
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function env(string $key): string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        return is_string($value) ? $value : '';
    }

    private function publicSiteUrl(): string
    {
        $configured = rtrim($this->env('PUBLIC_SITE_URL'), '/');
        return $configured !== '' ? $configured : 'https://btm.shortaktien.de';
    }

    private function adminEmail(): string
    {
        $email = trim($this->env('ADMIN_EMAIL'));
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException('Die Admin-E-Mail-Adresse ist ungültig konfiguriert.');
        }

        return $email;
    }
}
