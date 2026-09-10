<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\WarningController;
use App\Http\Middleware\RequireAdminSession;
use Illuminate\Support\Facades\Route;

// ── Auth (public) ─────────────────────────────────────────────────────────────
Route::post('/login',  [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/me',      [AuthController::class, 'me']);

// ── Warnings — read (public) ──────────────────────────────────────────────────
Route::get('/warnings', [WarningController::class, 'index']);

// ── Warnings — write (admin only) ────────────────────────────────────────────
Route::middleware(RequireAdminSession::class)->group(function () {
    Route::post('/warnings',         [WarningController::class, 'store']);
    Route::delete('/warnings/{warning}', [WarningController::class, 'destroy']);
    Route::delete('/warnings',       [WarningController::class, 'destroyAll']);
});
