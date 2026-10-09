<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Models\Warning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WarningController extends Controller
{
    /** GET /api/warnings — public, returns active warnings of one kind */
    public function index(Request $request): JsonResponse
    {
        $warnings = Warning::query()
            ->where('kind', $this->kind($request))
            ->orderBy('created_at', 'desc')
            ->get()
            ->filter(fn (Warning $w) => $w->isCurrentlyActive())
            ->map(fn (Warning $w) => $w->toFrontendArray())
            ->values();

        return response()->json($warnings);
    }

    /** POST /api/warnings — admin only, create warning */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind'         => 'sometimes|in:meteo,env',
            'phenomenon'   => 'required|string|max:255',
            'emitDate'     => 'required|date',
            'intervalFrom' => 'required|date',
            'intervalTo'   => 'required|date|after:intervalFrom',
            'codes'        => 'required|array|min:1',
            'codes.*.code'        => 'required|string',
            'codes.*.description' => 'nullable|string',
            'districts'    => 'required|array|min:1',
            'mapImage'     => 'nullable|string',
        ]);

        $actor = $this->sessionKind($request);
        $kind = $data['kind'] ?? ($actor === 'full' ? 'meteo' : $actor);
        if ($actor !== 'full' && $kind !== $actor) {
            abort(403, 'Nu ai acces la acest tip de avertizare');
        }

        $warning = Warning::create([
            'kind'          => $kind,
            'phenomenon'    => $data['phenomenon'],
            'emit_date'     => $data['emitDate'],
            'interval_from' => $data['intervalFrom'],
            'interval_to'   => $data['intervalTo'],
            'codes'         => $data['codes'],
            'districts'     => $data['districts'],
            'map_image'     => $data['mapImage'] ?? null,
        ]);

        return response()->json($warning->toFrontendArray(), 201);
    }

    /** DELETE /api/warnings/{id} — admin only */
    public function destroy(Request $request, Warning $warning): JsonResponse
    {
        $this->assertSessionKind($request, $warning->kind);
        $warning->delete();

        return response()->json(['ok' => true]);
    }

    /** DELETE /api/warnings — admin only, clears one kind */
    public function destroyAll(Request $request): JsonResponse
    {
        $kind = $this->kind($request);
        $this->assertSessionKind($request, $kind);
        Warning::query()->where('kind', $kind)->delete();

        return response()->json(['ok' => true]);
    }

    private function kind(Request $request): string
    {
        $kind = (string) $request->input('kind', 'meteo');

        return in_array($kind, ['meteo', 'env'], true) ? $kind : 'meteo';
    }

    private function sessionKind(Request $request): string
    {
        $admin = AdminUser::find($request->session()->get('admin_id'));
        $kind = $admin->kind ?? 'meteo';

        return in_array($kind, ['meteo', 'env', 'full'], true) ? $kind : 'meteo';
    }

    private function assertSessionKind(Request $request, string $kind): void
    {
        $actor = $this->sessionKind($request);
        if ($actor !== 'full' && $actor !== $kind) {
            abort(403, 'Nu ai acces la acest tip de avertizare');
        }
    }
}
