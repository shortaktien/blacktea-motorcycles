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

final class AuthController
{
    private const MAX_AVATAR_BYTES = 2097152;
    private const DISPLAY_NAME_PATTERN = '/^[a-z0-9äöüß]+$/u';
    private const ALLOWED_AVATARS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    public function __construct(
        private readonly UserStorage $users,
        private readonly UserAuthService $auth,
        private readonly CommunityStorage $community,
        private readonly EmailConfirmationService $emailConfirmation,
        private readonly MailjetService $mailjet,
    ) {
    }

    #[Route('/api/auth/register', name: 'api_auth_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        if (!$this->community->allowRate('user-register', $request->getClientIp() ?? 'unknown', 5, 3600)) {
            return $this->rateError(3600);
        }

        $payload = $this->jsonPayload($request);
        $name = $payload['name'] ?? null;
        $email = $payload['email'] ?? null;
        $password = $payload['password'] ?? null;
        $passwordConfirm = $payload['passwordConfirm'] ?? null;
        if (!is_string($name) || $this->length(trim($name)) < 2 || $this->length(trim($name)) > 80) {
            return $this->error('Bitte einen Namen mit 2 bis 80 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (preg_match(self::DISPLAY_NAME_PATTERN, trim($name)) !== 1) {
            return $this->error('Der Anzeigename darf nur Kleinbuchstaben und Zahlen enthalten – ohne Leerzeichen, Sonderzeichen oder Emojis.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false || $this->length(trim($email)) > 180) {
            return $this->error('Bitte eine gültige E-Mail-Adresse angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($password) || $this->length($password) < 10 || $this->length($password) > 128) {
            return $this->error('Das Passwort muss 10 bis 128 Zeichen lang sein.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($passwordConfirm) || !hash_equals($password, $passwordConfirm)) {
            return $this->error('Die Passwörter stimmen nicht überein.', Response::HTTP_BAD_REQUEST);
        }

        $normalizedEmail = strtolower(trim($email));
        if ($this->users->findByEmail($normalizedEmail) !== null) {
            return $this->error('Für diese E-Mail-Adresse gibt es bereits ein Konto. Bitte einloggen oder die Bestätigungs-Mail prüfen.', Response::HTTP_CONFLICT);
        }
        if ($this->users->findByName(trim($name)) !== null) {
            return $this->error('Dieser Anzeigename ist bereits vergeben. Bitte wähle einen anderen.', Response::HTTP_CONFLICT);
        }
        if (!$this->community->allowRate('user-register-email', $normalizedEmail, 2, 3600)) {
            return $this->rateError(3600);
        }

        $confirmation = $this->emailConfirmation->createToken('/api/auth/confirm/');
        $user = [
            'id' => bin2hex(random_bytes(16)),
            'name' => trim($name),
            'email' => $normalizedEmail,
            'passwordHash' => password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT),
            'status' => 'awaiting_confirmation',
            'role' => 'member',
            'createdAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
            'emailConfirmedAt' => null,
            'emailConfirmationTokenHash' => $confirmation['tokenHash'],
            'emailConfirmationExpiresAt' => $confirmation['expiresAt'],
            'model' => null,
            'kilometers' => 0,
            'bio' => '',
            'country' => 'D',
            'postalCode' => '',
            'avatarStyle' => 0,
            'avatarFile' => null,
            'avatarMime' => null,
            'notifyReplies' => true,
            'notifyCommunity' => true,
            'newsletterSubscribed' => false,
            'notifications' => [],
        ];

        try {
            $duplicateName = false;
            $this->users->update(static function (array &$data) use (&$user, &$duplicateName): void {
                foreach ($data['users'] as $candidate) {
                    if (self::normaliseName((string) ($candidate['name'] ?? '')) === self::normaliseName($user['name'])) {
                        $duplicateName = true;
                        return;
                    }
                }
                $usedAvatarStyles = [];
                foreach ($data['users'] as $candidate) {
                    if (isset($candidate['avatarStyle'])) {
                        $usedAvatarStyles[(int) $candidate['avatarStyle']] = true;
                    }
                }
                $availableAvatarStyles = array_values(array_diff(range(0, 19), array_keys($usedAvatarStyles)));
                $user['avatarStyle'] = $availableAvatarStyles === []
                    ? random_int(0, 19)
                    : $availableAvatarStyles[random_int(0, count($availableAvatarStyles) - 1)];
                $data['users'][] = $user;
            });
            if ($duplicateName) {
                return $this->error('Dieser Anzeigename ist bereits vergeben. Bitte wähle einen anderen.', Response::HTTP_CONFLICT);
            }
            $this->emailConfirmation->sendAccountConfirmation($normalizedEmail, trim($name), $confirmation['url']);
        } catch (\Throwable $exception) {
            $this->removeUser($user['id']);
            error_log('[user-registration] ' . $exception->getMessage());
            return $this->error('Die Bestätigungs-E-Mail konnte gerade nicht versendet werden. Bitte später erneut versuchen.', Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $this->notifyAdminAboutRegistration($user);

        return new JsonResponse([
            'message' => 'Fast geschafft! Bestätige jetzt deine E-Mail-Adresse. Erst danach kannst du dich einloggen.',
        ], Response::HTTP_ACCEPTED);
    }

    #[Route('/api/auth/confirm/{token}', name: 'api_auth_confirm', methods: ['GET'])]
    public function confirmEmail(string $token, Request $request): Response
    {
        if (preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
            return $this->confirmationPage('Bestätigungslink ungültig', 'Dieser Bestätigungslink ist nicht gültig.', '/registrieren', Response::HTTP_BAD_REQUEST);
        }
        if (!$this->community->allowRate('user-confirmation-click', $request->getClientIp() ?? 'unknown', 30, 900)) {
            $response = $this->confirmationPage('Zu viele Versuche', 'Bitte versuche es in einigen Minuten erneut.', '/registrieren', Response::HTTP_TOO_MANY_REQUESTS);
            $response->headers->set('Retry-After', '900');
            return $response;
        }

        $tokenHash = hash('sha256', $token);
        $match = null;
        foreach ($this->users->read()['users'] as $user) {
            $storedHash = $user['emailConfirmationTokenHash'] ?? null;
            if (($user['status'] ?? null) === 'awaiting_confirmation' && is_string($storedHash) && hash_equals($storedHash, $tokenHash)) {
                $match = $user;
                break;
            }
        }

        if ($match === null) {
            return $this->confirmationPage('Link bereits verwendet', 'Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.', '/login', Response::HTTP_GONE);
        }
        if (!is_string($match['emailConfirmationExpiresAt'] ?? null) || $this->emailConfirmation->isExpired($match['emailConfirmationExpiresAt'])) {
            return $this->confirmationPage('Link abgelaufen', 'Dieser Bestätigungslink ist abgelaufen. Bitte registriere dich erneut.', '/registrieren', Response::HTTP_GONE);
        }
        if (preg_match(self::DISPLAY_NAME_PATTERN, trim((string) ($match['name'] ?? ''))) !== 1) {
            return $this->confirmationPage('Anzeigename nicht gültig', 'Der Anzeigename muss aus Kleinbuchstaben und Zahlen bestehen, ohne Leerzeichen, Sonderzeichen oder Emojis. Bitte kontaktiere uns, damit wir die Registrierung vor der Aktivierung anpassen können.', '/registrieren', Response::HTTP_CONFLICT);
        }

        $updated = false;
        $nameConflict = false;
        $this->users->update(static function (array &$data) use ($match, $tokenHash, &$updated, &$nameConflict): void {
            foreach ($data['users'] as $candidate) {
                if (($candidate['id'] ?? null) !== ($match['id'] ?? null)
                    && ($candidate['status'] ?? null) === 'active'
                    && self::normaliseName((string) ($candidate['name'] ?? '')) === self::normaliseName((string) ($match['name'] ?? ''))
                ) {
                    $nameConflict = true;
                    return;
                }
            }
            foreach ($data['users'] as &$user) {
                if (($user['id'] ?? null) === ($match['id'] ?? null)
                    && ($user['status'] ?? null) === 'awaiting_confirmation'
                    && ($user['emailConfirmationTokenHash'] ?? null) === $tokenHash
                ) {
                    $user['status'] = 'active';
                    $user['emailConfirmedAt'] = (new \DateTimeImmutable())->format(DATE_ATOM);
                    unset($user['emailConfirmationTokenHash'], $user['emailConfirmationExpiresAt']);
                    $updated = true;
                    break;
                }
            }
            unset($user);
        });

        if ($nameConflict) {
            return $this->confirmationPage('Anzeigename bereits vergeben', 'Dieser Anzeigename wurde inzwischen von einem anderen aktiven Konto übernommen. Bitte kontaktiere uns, damit wir die Registrierung klären können.', '/registrieren', Response::HTTP_CONFLICT);
        }
        if (!$updated) {
            return $this->confirmationPage('Link bereits verwendet', 'Dieser Bestätigungslink wurde bereits verwendet.', '/login', Response::HTTP_GONE);
        }

        return $this->confirmationPage('Konto bestätigt', 'Danke! Dein BTM-Hilfe-Konto ist aktiviert. Du kannst dich jetzt einloggen.', '/login', Response::HTTP_OK);
    }

    #[Route('/api/auth/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        if (!$this->community->allowRate('user-login', $request->getClientIp() ?? 'unknown', 10, 900)) {
            return $this->rateError(900);
        }

        $payload = $this->jsonPayload($request);
        $email = $payload['email'] ?? null;
        $password = $payload['password'] ?? null;
        if (!is_string($email) || !is_string($password)) {
            return $this->error('E-Mail oder Passwort ist nicht korrekt.', Response::HTTP_UNAUTHORIZED);
        }

        $user = $this->users->findByEmail(strtolower(trim($email)));
        if ($user === null || !is_string($user['passwordHash'] ?? null) || !password_verify($password, $user['passwordHash'])) {
            return $this->error('E-Mail oder Passwort ist nicht korrekt.', Response::HTTP_UNAUTHORIZED);
        }
        if (($user['status'] ?? null) !== 'active') {
            return $this->error('Bitte bestätige zuerst deine E-Mail-Adresse. Prüfe dein Postfach.', Response::HTTP_FORBIDDEN);
        }

        return new JsonResponse([
            'authenticated' => true,
            'user' => $this->auth->publicUser($user),
            'csrfToken' => $this->auth->login($user),
        ]);
    }

    #[Route('/api/auth/password-reset/request', name: 'api_auth_password_reset_request', methods: ['POST'])]
    public function requestPasswordReset(Request $request): JsonResponse
    {
        $ip = $request->getClientIp() ?? 'unknown';
        if (!$this->community->allowRate('password-reset-request-ip', $ip, 5, 3600)) {
            return $this->rateError(3600);
        }

        $payload = $this->jsonPayload($request);
        $email = $payload['email'] ?? null;
        if (!is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false || $this->length(trim($email)) > 180) {
            return $this->error('Bitte eine gültige E-Mail-Adresse angeben.', Response::HTTP_BAD_REQUEST);
        }

        $normalizedEmail = strtolower(trim($email));
        if (!$this->community->allowRate('password-reset-request-email', $normalizedEmail, 3, 3600)) {
            return $this->rateError(3600);
        }

        $user = $this->users->findByEmail($normalizedEmail);
        if ($user !== null && ($user['status'] ?? null) === 'active' && filter_var((string) ($user['email'] ?? ''), FILTER_VALIDATE_EMAIL) !== false) {
            $reset = $this->emailConfirmation->createToken('/passwort-zuruecksetzen?token=');
            $this->users->update(static function (array &$data) use ($user, $reset): void {
                foreach ($data['users'] as &$candidate) {
                    if (($candidate['id'] ?? null) !== ($user['id'] ?? null)) {
                        continue;
                    }
                    $candidate['passwordResetTokenHash'] = $reset['tokenHash'];
                    $candidate['passwordResetExpiresAt'] = $reset['expiresAt'];
                    break;
                }
                unset($candidate);
            });

            try {
                $this->mailjet->sendPasswordReset((string) $user['email'], (string) ($user['name'] ?? 'BTM-Community'), $reset['token']);
            } catch (\Throwable $exception) {
                $this->clearPasswordResetToken((string) $user['id'], $reset['tokenHash']);
                error_log('[user-password-reset-request] ' . $exception->getMessage());
            }
        }

        return new JsonResponse([
            'message' => 'Wenn zu dieser E-Mail-Adresse ein aktives Konto existiert, erhältst du in Kürze eine Passwort-Zurücksetzungs-Mail.',
        ], Response::HTTP_ACCEPTED);
    }

    #[Route('/api/auth/password-reset', name: 'api_auth_password_reset', methods: ['POST'])]
    public function resetPassword(Request $request): JsonResponse
    {
        if (!$this->community->allowRate('password-reset', $request->getClientIp() ?? 'unknown', 10, 3600)) {
            return $this->rateError(3600);
        }

        $payload = $this->jsonPayload($request);
        $token = $payload['token'] ?? null;
        $password = $payload['password'] ?? null;
        $passwordConfirm = $payload['passwordConfirm'] ?? null;
        if (!is_string($token) || preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
            return $this->error('Dieser Passwort-Link ist nicht gültig oder bereits abgelaufen.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($password) || $this->length($password) < 10 || $this->length($password) > 128) {
            return $this->error('Das Passwort muss 10 bis 128 Zeichen lang sein.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($passwordConfirm) || !hash_equals($password, $passwordConfirm)) {
            return $this->error('Die Passwörter stimmen nicht überein.', Response::HTTP_BAD_REQUEST);
        }

        $tokenHash = hash('sha256', $token);
        $match = null;
        foreach ($this->users->read()['users'] as $candidate) {
            if (($candidate['passwordResetTokenHash'] ?? null) === $tokenHash
                && is_string($candidate['passwordResetExpiresAt'] ?? null)
                && !$this->emailConfirmation->isExpired($candidate['passwordResetExpiresAt'])
            ) {
                $match = $candidate;
                break;
            }
        }
        if ($match === null) {
            return $this->error('Dieser Passwort-Link ist nicht gültig oder bereits abgelaufen.', Response::HTTP_BAD_REQUEST);
        }

        $updated = false;
        $passwordHash = password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
        $this->users->update(static function (array &$data) use ($match, $tokenHash, $passwordHash, &$updated): void {
            foreach ($data['users'] as &$candidate) {
                if (($candidate['id'] ?? null) !== ($match['id'] ?? null)
                    || ($candidate['passwordResetTokenHash'] ?? null) !== $tokenHash
                ) {
                    continue;
                }
                $candidate['passwordHash'] = $passwordHash;
                unset($candidate['passwordResetTokenHash'], $candidate['passwordResetExpiresAt']);
                $updated = true;
                break;
            }
            unset($candidate);
        });

        return $updated
            ? new JsonResponse(['message' => 'Passwort geändert. Du kannst dich jetzt einloggen.'])
            : $this->error('Dieser Passwort-Link ist nicht gültig oder bereits abgelaufen.', Response::HTTP_BAD_REQUEST);
    }

    #[Route('/api/auth/session', name: 'api_auth_session', methods: ['GET'])]
    public function session(): JsonResponse
    {
        $user = $this->auth->connectAdminProfile();
        $response = new JsonResponse([
            'authenticated' => $user !== null,
            'user' => $user !== null ? $this->auth->publicUser($user) : null,
            'csrfToken' => $user !== null ? $this->auth->csrfToken() : null,
        ]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/auth/logout', name: 'api_auth_logout', methods: ['POST'])]
    public function logout(Request $request): JsonResponse
    {
        if ($this->auth->currentUser() === null) {
            return new JsonResponse(['authenticated' => false]);
        }
        if (!$this->auth->validCsrfToken($request->headers->get('X-CSRF-Token', ''))) {
            return $this->error('Ungültige Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $this->auth->logout();
        return new JsonResponse(['authenticated' => false]);
    }

    #[Route('/api/auth/profile', name: 'api_auth_profile_update', methods: ['PATCH'])]
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $this->auth->currentUser();
        if ($user === null) {
            return $this->unauthorized();
        }
        if (!$this->auth->validCsrfToken($request->headers->get('X-CSRF-Token', ''))) {
            return $this->error('Ungültige Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $payload = $this->jsonPayload($request);
        $name = $payload['name'] ?? $user['name'];
        $model = $payload['model'] ?? $user['model'];
        $kilometers = $payload['kilometers'] ?? $user['kilometers'];
        $bio = $payload['bio'] ?? ($user['bio'] ?? '');
        $country = $payload['country'] ?? ($user['country'] ?? 'D');
        $postalCode = $payload['postalCode'] ?? ($user['postalCode'] ?? '');
        $notifyReplies = $payload['notifyReplies'] ?? $user['notifyReplies'];
        $notifyCommunity = $payload['notifyCommunity'] ?? ($user['notifyCommunity'] ?? true);
        $newsletterSubscribed = $payload['newsletterSubscribed'] ?? ($user['newsletterSubscribed'] ?? false);
        if (!is_string($name) || $this->length(trim($name)) < 2 || $this->length(trim($name)) > 80) {
            return $this->error('Bitte einen Namen mit 2 bis 80 Zeichen angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (preg_match(self::DISPLAY_NAME_PATTERN, trim($name)) !== 1) {
            return $this->error('Der Anzeigename darf nur Kleinbuchstaben und Zahlen enthalten – ohne Leerzeichen, Sonderzeichen oder Emojis.', Response::HTTP_BAD_REQUEST);
        }
        if ($model !== null && (!is_string($model) || !in_array($model, ['Bonfire', 'Bonfire S', 'Bonfire E', 'Bonfire X', 'Wildfire'], true))) {
            return $this->error('Bitte ein gültiges Modell auswählen.', Response::HTTP_BAD_REQUEST);
        }
        if (filter_var($kilometers, FILTER_VALIDATE_INT) === false || (int) $kilometers < 0 || (int) $kilometers > 999999) {
            return $this->error('Bitte einen Kilometerstand zwischen 0 und 999.999 angeben.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($bio) || $this->length(trim($bio)) > 280) {
            return $this->error('Die Kurzvorstellung darf höchstens 280 Zeichen lang sein.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($country) || !in_array($country, ['D', 'A', 'CH'], true)) {
            return $this->error('Bitte ein gültiges Land auswählen.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($postalCode)) {
            return $this->error('Die Postleitzahl ist nicht gültig.', Response::HTTP_BAD_REQUEST);
        }
        $postalCode = trim($postalCode);
        $postalPattern = $country === 'D' ? '/^\d{5}$/' : '/^[1-9]\d{3}$/';
        if ($postalCode !== '' && preg_match($postalPattern, $postalCode) !== 1) {
            return $this->error($country === 'D'
                ? 'Die deutsche Postleitzahl muss aus fünf Ziffern bestehen.'
                : 'Die Postleitzahl muss aus vier Ziffern bestehen und darf nicht mit 0 beginnen.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_bool($notifyReplies)) {
            return $this->error('Die Profileinstellungen sind nicht gültig.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_bool($notifyCommunity)) {
            return $this->error('Die Community-Benachrichtigung ist nicht gültig.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_bool($newsletterSubscribed)) {
            return $this->error('Die Newsletter-Einstellung ist nicht gültig.', Response::HTTP_BAD_REQUEST);
        }
        if ($this->users->findByName(trim($name), (string) $user['id']) !== null) {
            return $this->error('Dieser Anzeigename ist bereits vergeben. Bitte wähle einen anderen.', Response::HTTP_CONFLICT);
        }

        $updated = null;
        $duplicateName = false;
        $previousMentions = $this->auth->resolveMentions($user['bio'] ?? '', $user['bioMentions'] ?? null);
        $bioMentions = $this->auth->resolveMentions(trim($bio), [...$this->auth->resolveMentions(trim($bio)), ...$previousMentions]);
        // Keep existing links stable when only unrelated profile settings change.
        if (trim($bio) === ($user['bio'] ?? '')) $bioMentions = $previousMentions;
        $this->users->update(static function (array &$data) use ($user, $name, $model, $kilometers, $bio, $bioMentions, $country, $postalCode, $notifyReplies, $notifyCommunity, $newsletterSubscribed, &$updated, &$duplicateName): void {
            foreach ($data['users'] as $candidate) {
                if (($candidate['id'] ?? null) !== $user['id'] && self::normaliseName((string) ($candidate['name'] ?? '')) === self::normaliseName($name)) {
                    $duplicateName = true;
                    return;
                }
            }
            foreach ($data['users'] as &$candidate) {
                if (($candidate['id'] ?? null) !== $user['id']) {
                    continue;
                }
                $candidate['name'] = trim($name);
                $candidate['model'] = $model;
                $candidate['kilometers'] = (int) $kilometers;
                $candidate['bio'] = trim($bio);
                $candidate['bioMentions'] = $bioMentions;
                $candidate['country'] = $country;
                $candidate['postalCode'] = $postalCode;
                $candidate['notifyReplies'] = $notifyReplies;
                $candidate['notifyCommunity'] = $notifyCommunity;
                $candidate['newsletterSubscribed'] = $newsletterSubscribed;
                $updated = $candidate;
                break;
            }
            unset($candidate);
        });

        if ($duplicateName) {
            return $this->error('Dieser Anzeigename ist bereits vergeben. Bitte wähle einen anderen.', Response::HTTP_CONFLICT);
        }

        if (is_array($updated)) {
            try { $this->auth->notifyProfileMentions($updated, $previousMentions); }
            catch (\Throwable $exception) { error_log('[mention-notification] ' . $exception->getMessage()); }
        }

        return is_array($updated)
            ? new JsonResponse(['user' => $this->auth->publicUser($updated)])
            : $this->error('Konto nicht gefunden.', Response::HTTP_NOT_FOUND);
    }

    #[Route('/api/auth/avatar', name: 'api_auth_avatar_upload', methods: ['POST'])]
    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $this->auth->currentUser();
        if ($user === null) {
            return $this->unauthorized();
        }
        if (!$this->auth->validCsrfToken($request->headers->get('X-CSRF-Token', ''))) {
            return $this->error('Ungültige Sitzung.', Response::HTTP_FORBIDDEN);
        }
        if (!$this->community->allowRate('user-avatar', (string) $user['id'], 5, 3600)) {
            return $this->rateError(3600);
        }

        $image = $request->files->get('avatar');
        if (!$image instanceof UploadedFile) {
            return $this->error('Bitte ein Bild bis höchstens 2 MB auswählen.', Response::HTTP_BAD_REQUEST);
        }
        if (!$image->isValid()) {
            return $this->error('Bitte ein Bild bis höchstens 2 MB auswählen.', Response::HTTP_BAD_REQUEST);
        }
        $imageSize = $image instanceof UploadedFile ? $image->getSize() : null;
        if ($image instanceof UploadedFile && (!is_int($imageSize) || $imageSize < 0) && is_string($image->getPathname())) {
            $fallbackSize = @filesize($image->getPathname());
            $imageSize = is_int($fallbackSize) ? $fallbackSize : null;
        }
        if (!is_int($imageSize) || $imageSize > self::MAX_AVATAR_BYTES) {
            return $this->error('Bitte ein Bild bis höchstens 2 MB auswählen.', Response::HTTP_BAD_REQUEST);
        }
        $mime = function_exists('mime_content_type') ? @mime_content_type($image->getPathname()) : null;
        if (!is_string($mime) || !isset(self::ALLOWED_AVATARS[$mime])) {
            return $this->error('Erlaubt sind JPG, PNG oder WEBP.', Response::HTTP_BAD_REQUEST);
        }
        $dimensions = @getimagesize($image->getPathname());
        if (!is_array($dimensions) || ($dimensions[0] ?? 0) < 1 || ($dimensions[1] ?? 0) < 1 || ($dimensions[0] ?? 0) > 3000 || ($dimensions[1] ?? 0) > 3000) {
            return $this->error('Das Bild hat kein unterstütztes Format oder ist zu groß aufgelöst.', Response::HTTP_BAD_REQUEST);
        }

        $filename = bin2hex(random_bytes(16)) . '.' . self::ALLOWED_AVATARS[$mime];
        try {
            $image->move($this->users->uploadsDir(), $filename);
        } catch (\Throwable) {
            return $this->error('Das Bild konnte nicht gespeichert werden.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $updated = null;
        $this->users->update(static function (array &$data) use ($user, $filename, $mime, &$updated): void {
            foreach ($data['users'] as &$candidate) {
                if (($candidate['id'] ?? null) !== $user['id']) {
                    continue;
                }
                $candidate['avatarFile'] = $filename;
                $candidate['avatarMime'] = $mime;
                $updated = $candidate;
                break;
            }
            unset($candidate);
        });
        $this->users->deleteAvatar($user['avatarFile'] ?? null);

        return is_array($updated)
            ? new JsonResponse(['user' => $this->auth->publicUser($updated)])
            : $this->error('Konto nicht gefunden.', Response::HTTP_NOT_FOUND);
    }

    #[Route('/api/auth/avatar/{id}', name: 'api_auth_avatar_read', methods: ['GET'])]
    public function avatar(string $id): Response
    {
        $user = $this->auth->currentUser();
        if ($user === null || ($user['id'] ?? null) !== $id) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $filename = $user['avatarFile'] ?? null;
        $mime = $user['avatarMime'] ?? null;
        if (!is_string($filename) || !is_string($mime) || !isset(self::ALLOWED_AVATARS[$mime])) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }
        $path = $this->users->uploadsDir() . '/' . basename($filename);
        if (!is_file($path)) {
            return $this->error('Bild nicht gefunden.', Response::HTTP_NOT_FOUND);
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', $mime);
        $response->headers->set('Content-Disposition', 'inline; filename="' . basename($filename) . '"');
        $response->headers->set('Cache-Control', 'private, max-age=300');
        return $response;
    }

    #[Route('/api/auth/notifications', name: 'api_auth_notifications', methods: ['GET'])]
    public function notifications(): JsonResponse
    {
        $user = $this->auth->currentUser();
        if ($user === null) {
            return $this->unauthorized();
        }

        $response = new JsonResponse(['notifications' => $this->auth->publicUser($user)['notifications']]);
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }

    #[Route('/api/auth/notifications/{id}/read', name: 'api_auth_notification_read', methods: ['POST'])]
    public function markNotificationRead(string $id, Request $request): JsonResponse
    {
        $user = $this->auth->currentUser();
        if ($user === null) {
            return $this->unauthorized();
        }
        if (!$this->auth->validCsrfToken($request->headers->get('X-CSRF-Token', ''))) {
            return $this->error('Ungültige Sitzung.', Response::HTTP_FORBIDDEN);
        }

        $updated = null;
        $found = false;
        $this->users->update(static function (array &$data) use ($user, $id, &$updated, &$found): void {
            foreach ($data['users'] as &$candidate) {
                if (($candidate['id'] ?? null) !== $user['id']) {
                    continue;
                }
                foreach ($candidate['notifications'] as &$notification) {
                    if (($notification['id'] ?? null) === $id) {
                        $notification['readAt'] = (new \DateTimeImmutable())->format(DATE_ATOM);
                        $updated = $candidate;
                        $found = true;
                        break 2;
                    }
                }
                unset($notification);
                $updated = $candidate;
                break;
            }
            unset($candidate);
        });

        return $found && is_array($updated)
            ? new JsonResponse(['notifications' => $this->auth->publicUser($updated)['notifications']])
            : $this->error('Benachrichtigung nicht gefunden.', Response::HTTP_NOT_FOUND);
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

    private function removeUser(string $id): void
    {
        $this->users->update(static function (array &$data) use ($id): void {
            $data['users'] = array_values(array_filter($data['users'], static fn (array $user): bool => ($user['id'] ?? null) !== $id));
        });
    }

    private function clearPasswordResetToken(string $id, string $tokenHash): void
    {
        $this->users->update(static function (array &$data) use ($id, $tokenHash): void {
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

    /** @param array<string, mixed> $user */
    private function notifyAdminAboutRegistration(array $user): void
    {
        $userId = (string) ($user['id'] ?? '');
        if ($userId === '') {
            return;
        }
        if (($this->community->notificationSettingsForAdmin()['registration'] ?? true) !== true) {
            return;
        }
        if (!$this->community->allowRate('admin-registration-notification', $userId, 1, 86400)
            || !$this->community->allowRate('admin-registration-notification-global', 'all', 30, 3600)
        ) {
            error_log('[admin-registration-notification] Rate-Limit erreicht.');
            return;
        }

        try {
            $this->mailjet->sendAdminRegistrationNotification(
                (string) ($user['name'] ?? ''),
                (string) ($user['email'] ?? ''),
                (string) ($user['createdAt'] ?? ''),
            );
        } catch (\Throwable $exception) {
            error_log('[admin-registration-notification] ' . $exception->getMessage());
        }
    }

    private function confirmationPage(string $title, string $message, string $path, int $status): Response
    {
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safePath = htmlspecialchars($path, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $safeTitle . ' — BTM-Hilfe</title><style>body{margin:0;padding:32px;background:#f3f2ee;color:#27252d;font:16px/1.6 system-ui,sans-serif}.card{max-width:620px;margin:10vh auto;padding:32px;background:#fbfaf7;border:2px solid #2d27c7;border-radius:14px;box-shadow:5px 6px 0 rgba(45,39,199,.12)}h1{margin:0 0 16px;font-size:clamp(30px,6vw,48px);line-height:1.05}a{display:inline-block;margin-top:14px;padding:11px 16px;border-radius:8px;color:#fff;background:#2d27c7;text-decoration:none;font-weight:700}</style></head><body><main class="card"><h1>' . $safeTitle . '</h1><p>' . $safeMessage . '</p><a href="' . $safePath . '">Weiter zu BTM-Hilfe ↗</a></main></body></html>';

        return new Response($html, $status, [
            'Cache-Control' => 'no-store',
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    private function unauthorized(): JsonResponse
    {
        return $this->error('Nicht autorisiert.', Response::HTTP_UNAUTHORIZED);
    }

    private function rateError(int $retryAfter): JsonResponse
    {
        $response = $this->error('Zu viele Anfragen. Bitte später erneut versuchen.', Response::HTTP_TOO_MANY_REQUESTS);
        $response->headers->set('Retry-After', (string) $retryAfter);
        return $response;
    }

    private function error(string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => $message], $status);
    }

    private static function normaliseName(string $name): string
    {
        $name = trim($name);
        return function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
    }

    private function length(string $value): int
    {
        return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
    }
}
