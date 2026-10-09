<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAdminSession
{
    public function handle(Request $request, Closure $next, ?string $kind = null): Response
    {
        $admin = AdminUser::find($request->session()->get('admin_id'));

        if (! $admin) {
            return $this->deny($request, 401, 'Nu ești autentificat');
        }

        if ($kind !== null && $admin->kind !== $kind && $admin->kind !== 'full') {
            return $this->deny($request, 403, 'Nu ai acces la această administrare');
        }

        return $next($request);
    }

    private function deny(Request $request, int $status, string $error): Response
    {
        if ($request->expectsJson()) {
            return response()->json(['ok' => false, 'error' => $error], $status);
        }

        $next = $request->is('admin/environmental') ? '/admin/environmental' : '/admin';

        return redirect('/login?next='.$next);
    }
}
