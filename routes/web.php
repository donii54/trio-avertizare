<?php

use App\Http\Middleware\RequireAdminSession;
use Illuminate\Support\Facades\Route;

// Public map — no authentication
Route::get('/', function () {
    return response(file_get_contents(public_path('index.html')))
        ->header('Content-Type', 'text/html; charset=UTF-8');
});

// Portal / hub page — switch between map, widget, admin
Route::get('/home', function () {
    return response(file_get_contents(public_path('home.html')))
        ->header('Content-Type', 'text/html; charset=UTF-8');
});

// Login page — after success the client opens the warning editor at /admin#editor
Route::get('/login', function () {
    return response(file_get_contents(public_path('login.html')))
        ->header('Content-Type', 'text/html; charset=UTF-8');
});

// Warning editor (and saved-warning list). Guests are redirected to /login.
Route::get('/admin', function () {
    return response(file_get_contents(public_path('admin.html')))
        ->header('Content-Type', 'text/html; charset=UTF-8');
})->middleware(RequireAdminSession::class);
