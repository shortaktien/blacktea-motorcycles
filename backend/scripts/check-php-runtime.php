<?php

declare(strict_types=1);

// PHP's 2026-10-21 security releases fix CVE-2026-109618 and CVE-2026-109619.
// Check the executing binary; Composer's platform.php is only a resolver setting.
$minimumVersions = [
    '8.2' => '8.2.35',
    '8.3' => '8.3.36',
    '8.4' => '8.4.27',
    '8.5' => '8.5.12',
];
$branch = PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;
$minimum = $minimumVersions[$branch] ?? null;

if ($minimum === null || version_compare(PHP_VERSION, $minimum, '<')) {
    fwrite(STDERR, sprintf(
        "PHP %s (%s) is not a verified patched runtime for CVE-2026-109618 / CVE-2026-109619. Required: %s.\n",
        PHP_VERSION,
        PHP_SAPI,
        $minimum ?? implode(', ', $minimumVersions),
    ));
    exit(1);
}

printf("Verified PHP %s (%s); security baseline %s.\n", PHP_VERSION, PHP_SAPI, $minimum);
