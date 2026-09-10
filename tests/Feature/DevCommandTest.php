<?php

namespace Tests\Feature;

use Illuminate\Foundation\DevCommands;
use Tests\TestCase;

class DevCommandTest extends TestCase
{
    public function test_dev_command_starts_backend_and_frontend(): void
    {
        $commands = collect(DevCommands::commands());

        $this->assertSame(
            'php artisan serve --host=0.0.0.0 --port=8000',
            $commands->firstWhere('name', 'server')['command'] ?? null,
        );
        $this->assertSame(
            'npm run dev',
            $commands->firstWhere('name', 'vite')['command'] ?? null,
        );
        $this->assertNull($commands->firstWhere('name', 'queue'));
    }
}
