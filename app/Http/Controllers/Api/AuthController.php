<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /** POST /api/login */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'user'     => 'required|string',
            'password' => 'required|string',
        ]);

        $admin = AdminUser::where('username', $request->user)->first();

        if (! $admin || ! Hash::check($request->password, $admin->password)) {
            return response()->json(
                ['ok' => false, 'error' => 'Login sau parolă incorectă'],
                401
            );
        }

        $token = $request->session()->getId();
        $request->session()->put('admin_id', $admin->id);
        $request->session()->regenerate();

        return response()->json(['ok' => true]);
    }

    /** POST /api/logout */
    public function logout(Request $request): JsonResponse
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    /** GET /api/me */
    public function me(Request $request): JsonResponse
    {
        if (! $request->session()->has('admin_id')) {
            return response()->json(['ok' => false], 401);
        }

        $admin = AdminUser::find($request->session()->get('admin_id'));
        if (! $admin) {
            return response()->json(['ok' => false], 401);
        }

        return response()->json(['ok' => true, 'user' => $admin->username]);
    }
}
