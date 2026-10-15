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
            ->assertSee("'/admin/environmental'", false)
            ->assertSee("'/admin'", false);
    }

    public function test_admin_redirects_guests_to_login(): void
    {
        $this->get('/admin')->assertRedirect('/login?next=/admin');
        $this->get('/admin/environmental')->assertRedirect('/login?next=/admin/environmental');
        $this->get('/admin/hydro')->assertRedirect('/login?next=/admin/hydro');
    }

    public function test_environmental_page_is_public(): void
    {
        $this->get('/environmental')
            ->assertOk()
            ->assertSee('data-kind-tab="env"', false);

        $this->get('/environmental/widget')
            ->assertOk()
            ->assertSee('id="map"', false);
    }

    public function test_environmental_warnings_stay_separate_from_meteo(): void
    {
        $this->seed(AdminUserSeeder::class);
        $this->postJson('/api/login', [
            'user' => 'admin',
            'password' => 'admin',
            'kind' => 'meteo',
        ])->assertOk();

        $payload = [
            'phenomenon' => 'Caniculă',
            'emitDate' => '2026-10-09T10:00',
            'intervalFrom' => '2026-10-09T10:00',
            'intervalTo' => '2026-10-10T10:00',
            'codes' => [['code' => 'COD GALBEN', 'description' => 'test']],
            'districts' => [['name' => 'Chișinău', 'label' => 'Chișinău', 'color' => '#FFFF00']],
        ];

        $this->postJson('/api/warnings', $payload)->assertCreated();
        $this->postJson('/api/warnings', array_merge($payload, [
            'kind' => 'env',
            'phenomenon' => 'Impactul poluarii aerului',
        ]))->assertForbidden();

        $this->postJson('/api/logout')->assertOk();
        $this->postJson('/api/login', [
            'user' => 'mediu',
            'password' => 'mediu',
            'kind' => 'env',
        ])->assertOk();
        $this->postJson('/api/warnings', array_merge($payload, [
            'kind' => 'env',
            'phenomenon' => 'Impactul poluarii aerului',
        ]))->assertCreated();

        $this->getJson('/api/warnings')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.kind', 'meteo');

        $this->getJson('/api/warnings?kind=env')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.phenomenon', 'Impactul poluarii aerului');

        $this->deleteJson('/api/warnings?kind=env')->assertOk();
        $this->getJson('/api/warnings')->assertJsonCount(1);
        $this->getJson('/api/warnings?kind=env')->assertJsonCount(0);
    }

    public function test_successful_login_unlocks_admin_editor_page(): void
    {
        $this->seed(AdminUserSeeder::class);

        $this->postJson('/api/login', [
            'user' => 'admin',
            'password' => 'admin',
            'kind' => 'meteo',
        ])->assertOk()->assertJson(['ok' => true, 'kind' => 'meteo']);

        $this->get('/admin')
            ->assertOk()
            ->assertSee('id="editor-view"', false)
            ->assertSee('Adaugă avertizare', false)
            ->assertDontSee('id="login-form"', false);

        $this->get('/admin/environmental')
            ->assertRedirect('/login?next=/admin/environmental');
    }

    public function test_environment_admin_uses_a_separate_password(): void
    {
        $this->seed(AdminUserSeeder::class);

        $this->postJson('/api/login', [
            'user' => 'admin',
            'password' => 'admin',
            'kind' => 'env',
        ])->assertUnauthorized();

        $this->postJson('/api/login', [
            'user' => 'mediu',
            'password' => 'mediu',
            'kind' => 'env',
        ])->assertOk()->assertJson(['ok' => true, 'kind' => 'env']);

        $this->get('/admin/environmental')
            ->assertOk()
            ->assertSee('id="editor-view"', false);

        $this->get('/admin')->assertRedirect('/login?next=/admin');
    }

    public function test_full_admin_can_edit_both_warning_kinds(): void
    {
        $this->seed(AdminUserSeeder::class);

        $this->postJson('/api/login', [
            'user' => 'full',
            'password' => 'full',
            'kind' => 'full',
        ])->assertOk()->assertJson(['ok' => true, 'kind' => 'full']);

        $this->get('/admin')->assertOk()->assertSee('id="editor-view"', false);
        $this->get('/admin/environmental')->assertOk()->assertSee('id="editor-view"', false);
        $this->get('/admin/hydro')->assertOk()->assertSee('id="editor-view"', false);

        $payload = [
            'phenomenon' => 'Caniculă',
            'emitDate' => '2026-10-09T10:00',
            'intervalFrom' => '2026-10-09T10:00',
            'intervalTo' => '2026-10-10T10:00',
            'codes' => [['code' => 'COD GALBEN', 'description' => 'test']],
            'districts' => [['name' => 'Chișinău', 'label' => 'Chișinău', 'color' => '#FFFF00']],
        ];

        $this->postJson('/api/warnings', $payload)->assertCreated();
        $this->postJson('/api/warnings', array_merge($payload, [
            'kind' => 'env',
            'phenomenon' => 'Impactul poluarii aerului',
        ]))->assertCreated();
        $this->postJson('/api/warnings', array_merge($payload, [
            'kind' => 'hydro',
            'phenomenon' => 'Avertizare hidrologică',
            'districts' => [['name' => 'Botna', 'label' => 'Botna', 'color' => '#FFED00']],
        ]))->assertCreated();
    }

    public function test_hydro_page_is_public(): void
    {
        $this->get('/hydro')
            ->assertOk()
            ->assertSee('data-kind-tab="hydro"', false)
            ->assertSee('hydro-map.js', false);

        $this->get('/hydro/widget')->assertOk();
    }
}
