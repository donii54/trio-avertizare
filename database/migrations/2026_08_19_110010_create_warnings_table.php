<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warnings', function (Blueprint $table) {
            $table->id();
            $table->string('phenomenon');
            $table->dateTime('emit_date');
            $table->dateTime('interval_from');
            $table->dateTime('interval_to');
            $table->json('codes');       // [{ code, description }]
            $table->json('districts');   // [{ name, label, color }]
            $table->text('map_image')->nullable();  // base64 PNG screenshot
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warnings');
    }
};
