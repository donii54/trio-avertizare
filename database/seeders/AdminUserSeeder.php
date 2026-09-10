<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $username = env('ADMIN_USER', 'admin');
        $password = env('ADMIN_PASSWORD', 'admin');

        AdminUser::updateOrCreate(
            ['username' => $username],
            ['password' => Hash::make($password)]
        );

        $this->command->info("Admin user '{$username}' seeded.");
    }
}
