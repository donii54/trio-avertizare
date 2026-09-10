<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Warning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WarningController extends Controller
{
    /** GET /api/warnings — public, returns all active warnings */
    public function index(): JsonResponse
    {
        $warnings = Warning::query()
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

        $warning = Warning::create([
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
    public function destroy(Warning $warning): JsonResponse
    {
        $warning->delete();

        return response()->json(['ok' => true]);
    }

    /** DELETE /api/warnings — admin only, clears all */
    public function destroyAll(): JsonResponse
    {
        Warning::query()->delete();

        return response()->json(['ok' => true]);
    }
}
