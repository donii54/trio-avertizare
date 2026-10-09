<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Warning extends Model
{
    public const TZ = 'Europe/Chisinau';

    protected $fillable = [
        'kind',
        'phenomenon',
        'emit_date',
        'interval_from',
        'interval_to',
        'codes',
        'districts',
        'map_image',
    ];

    protected $casts = [
        'codes'         => 'array',
        'districts'     => 'array',
        'emit_date'     => 'datetime',
        'interval_from' => 'datetime',
        'interval_to'   => 'datetime',
    ];

    /**
     * Admin datetime-local values are Moldova wall clock, stored without TZ.
     * Always interpret the raw DB string as Europe/Chisinau.
     */
    public function moldovaDate(string $attribute): ?Carbon
    {
        $raw = $this->attributes[$attribute] ?? null;
        if ($raw === null || $raw === '') {
            return null;
        }
        $normalized = str_replace('T', ' ', (string) $raw);
        $normalized = preg_replace('/(\.\d+)?Z$/i', '', $normalized);
        $normalized = preg_replace('/[+\-]\d{2}:?\d{2}$/', '', $normalized);
        $normalized = trim($normalized);

        return Carbon::parse($normalized, self::TZ);
    }

    public function isCurrentlyActive(): bool
    {
        $end = $this->moldovaDate('interval_to');

        return $end !== null && $end->gt(now(self::TZ));
    }

    /** Remove expired warnings (interval_to in the past, Moldova time). */
    public function scopeActive($query)
    {
        return $query->where('interval_to', '>', now(self::TZ)->format('Y-m-d H:i:s'));
    }

    /** Format dates as ISO strings for the frontend. */
    public function toFrontendArray(): array
    {
        $from = $this->moldovaDate('interval_from');
        $to   = $this->moldovaDate('interval_to');
        $emit = $this->moldovaDate('emit_date');

        return [
            'id'           => (string) $this->id,
            'kind'         => $this->kind ?: 'meteo',
            'phenomenon'   => $this->phenomenon,
            'emitDate'     => $emit?->toIso8601String(),
            'intervalFrom' => $from?->toIso8601String(),
            'intervalTo'   => $to?->toIso8601String(),
            'interval'     => ($from && $to)
                ? $from->format('d.m.Y, \o\r\a H:i') . ' – ' . $to->format('d.m.Y, \o\r\a H:i')
                : '',
            'codes'        => $this->codes,
            'districts'    => $this->districts,
            'mapImage'     => $this->map_image,
            'createdAt'    => $this->created_at?->timezone(self::TZ)->toIso8601String(),
        ];
    }
}
