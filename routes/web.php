<?php

use App\Http\Middleware\RequireAdminSession;
use Illuminate\Support\Facades\Route;

$servePublic = function (string $file) {
    return response(file_get_contents(public_path($file)))
        ->header('Content-Type', 'text/html; charset=UTF-8');
};

// Public map — no authentication
Route::get('/', fn () => $servePublic('index.html'));

// Air-pollution warnings — same map, separate data
Route::get('/environmental/widget', fn () => $servePublic('widget.html'));
Route::get('/environmental', fn () => $servePublic('index.html'));

// Hydrological warnings — river sectors from the CorelDRAW template.
Route::get('/hydro/widget', fn () => $servePublic('widget.html'));
Route::get('/hydro', fn () => $servePublic('index.html'));

// Editor home for people who add warnings. Public maps stay unchanged.
Route::get('/editor/hydro', fn () => $servePublic('editor.html'));
Route::get('/editor/environmental', fn () => $servePublic('editor.html'));
Route::get('/editor', fn () => $servePublic('editor.html'));

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
Route::get('/admin/hydro', fn () => $servePublic('admin.html'))
    ->middleware(RequireAdminSession::class.':hydro');

Route::get('/admin/environmental', fn () => $servePublic('admin.html'))
    ->middleware(RequireAdminSession::class.':env');

Route::get('/admin', fn () => $servePublic('admin.html'))
    ->middleware(RequireAdminSession::class.':meteo');
