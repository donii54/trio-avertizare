<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $meteoUser = env('ADMIN_USER', 'admin');
        $meteoPassword = env('ADMIN_PASSWORD', 'admin');
        $envUser = env('ENV_ADMIN_USER', 'mediu');
        $envPassword = env('ENV_ADMIN_PASSWORD', 'mediu');
        $fullUser = env('FULL_ADMIN_USER', 'full');
        $fullPassword = env('FULL_ADMIN_PASSWORD', 'full');

        AdminUser::updateOrCreate(
            ['username' => $meteoUser],
            ['password' => Hash::make($meteoPassword), 'kind' => 'meteo']
        );
        AdminUser::updateOrCreate(
            ['username' => $envUser],
            ['password' => Hash::make($envPassword), 'kind' => 'env']
        );
        AdminUser::updateOrCreate(
            ['username' => $fullUser],
            ['password' => Hash::make($fullPassword), 'kind' => 'full']
        );

        $this->command->info("Admins seeded: meteo '{$meteoUser}', environment '{$envUser}', full '{$fullUser}'.");
    }
}
