<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('admin_users', 'kind')) {
            return;
        }

        Schema::table('admin_users', function (Blueprint $table) {
            $table->string('kind')->default('meteo')->after('username');
            $table->index('kind');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('admin_users', 'kind')) {
            return;
        }

        Schema::table('admin_users', function (Blueprint $table) {
            $table->dropIndex(['kind']);
            $table->dropColumn('kind');
        });
    }
};
