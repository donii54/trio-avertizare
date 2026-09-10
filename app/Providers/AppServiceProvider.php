<?php

namespace App\Providers;

use Illuminate\Foundation\DevCommands;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        // One command (`php artisan dev` / `composer run dev`) starts
        // the Laravel backend and the Vite frontend together.
        DevCommands::artisan('serve --host=0.0.0.0 --port=8000', 'server')->blue();
        DevCommands::except('queue');
    }
}
