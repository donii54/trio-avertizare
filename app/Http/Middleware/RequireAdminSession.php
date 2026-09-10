<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAdminSession
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->has('admin_id')) {
            if ($request->expectsJson()) {
                return response()->json(['ok' => false, 'error' => 'Nu ești autentificat'], 401);
            }
            return redirect('/login');
        }

        return $next($request);
    }
}
