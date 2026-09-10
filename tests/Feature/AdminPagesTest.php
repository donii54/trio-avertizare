<?php

namespace Tests\Feature;

use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_map_is_accessible_without_login(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('AVERTIZĂRI METEOROLOGICE', false)
            ->assertSee('href="/login"', false);
    }

    public function test_login_page_is_accessible(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertSee('Administrare', false)
            ->assertSee('/admin#editor', false);
    }

    public function test_admin_redirects_guests_to_login(): void
    {
        $this->get('/admin')->assertRedirect('/login');
    }

    public function test_successful_login_unlocks_admin_editor_page(): void
    {
        $this->seed(AdminUserSeeder::class);

        $this->postJson('/api/login', [
            'user' => 'admin',
            'password' => 'admin',
        ])->assertOk()->assertJson(['ok' => true]);

        $this->get('/admin')
            ->assertOk()
            ->assertSee('id="editor-view"', false)
            ->assertSee('Adaugă avertizare', false)
            ->assertDontSee('id="login-form"', false);
    }
}
